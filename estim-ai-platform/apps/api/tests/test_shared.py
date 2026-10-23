"""Tests for shared kernel: events/outbox, ML base, storage, contracts."""

from dataclasses import dataclass

import pytest

from app.shared import events as ev
from app.shared.contracts import AuditLogger, Notifier
from app.shared.ml_base import EvaluationResult, ModelRegistry
from app.shared.storage import StorageClient, StorageConfig


@dataclass(frozen=True, kw_only=True)
class SampleEvent(ev.DomainEvent):
    event_type: str = "test.happened"
    data: str = ""


class TestDomainEvent:
    def test_requires_event_type(self):
        with pytest.raises(ValueError):
            ev.DomainEvent(event_type="")

    def test_payload_serializes_datetime(self):
        evt = SampleEvent(data="x")
        payload = evt.to_payload()
        assert payload["event_type"] == "test.happened"
        assert payload["data"] == "x"
        assert isinstance(payload["occurred_at"], str)


class TestInMemoryBus:
    def test_publish_dispatches(self):
        bus = ev.InMemoryEventBus()
        received = []
        bus.subscribe("test.happened", lambda p: received.append(p))
        bus.publish(SampleEvent(data="hi"))
        assert len(bus.published) == 1
        assert received[0]["data"] == "hi"

    def test_no_handler_no_crash(self):
        bus = ev.InMemoryEventBus()
        bus.publish(SampleEvent())
        assert len(bus.published) == 1


class TestOutboxRelay:
    def test_drain_processes_and_marks(self):
        store = ev.InMemoryOutboxStore()
        store.append(SampleEvent(data="a"))
        relay = ev.OutboxRelay(store)
        seen = []
        relay.register("test.happened", lambda p: seen.append(p))
        stats = relay.drain()
        assert stats == {"processed": 1, "failed": 0, "skipped": 0}
        assert seen[0]["data"] == "a"
        assert store.records[0].status == ev.EventStatus.PROCESSED

    def test_failure_marked_failed(self):
        store = ev.InMemoryOutboxStore()
        store.append(SampleEvent())

        def bad(payload):
            raise RuntimeError("handler boom")

        relay = ev.OutboxRelay(store)
        relay.register("test.happened", bad)
        stats = relay.drain()
        assert stats["failed"] == 1
        assert store.records[0].status == ev.EventStatus.FAILED

    def test_unregistered_skipped_not_failed(self):
        store = ev.InMemoryOutboxStore()
        store.append(SampleEvent())
        stats = ev.OutboxRelay(store).drain()
        assert stats["skipped"] == 1
        assert store.records[0].status == ev.EventStatus.NEW


class TestMlBase:
    def test_registry_register_and_active(self):
        reg = ModelRegistry()
        entry = reg.register("procurement_anomaly", "v1", threshold=0.7)
        assert entry.active_version == "v1"
        assert reg.active("procurement_anomaly").threshold == 0.7
        reg.register("procurement_anomaly", "v2")
        assert reg.active("procurement_anomaly").active_version == "v2"
        assert reg.active("procurement_anomaly").versions == ["v1", "v2"]

    def test_registry_missing_raises(self):
        with pytest.raises(KeyError):
            ModelRegistry().active("nope")

    def test_evaluation_result_get(self):
        res = EvaluationResult(model_name="m", model_version="v1", metrics={"f1": 0.8})
        assert res.get("f1") == 0.8
        assert res.get("auc", 0.0) == 0.0


class TestStorage:
    def test_from_settings_shape(self):
        cfg = StorageConfig.from_settings()
        assert cfg.bucket != ""

    def test_not_configured_by_default_in_tests(self):
        client = StorageClient(StorageConfig())
        assert client.config.configured is False


class TestContractsImportable:
    def test_protocols_exist(self):
        assert AuditLogger is not None
        assert Notifier is not None

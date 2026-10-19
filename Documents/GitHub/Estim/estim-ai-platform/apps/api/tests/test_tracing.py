"""Tests for OpenTelemetry distributed tracing."""

import opentelemetry.trace as otel_trace

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider

from app.core.tracing import get_tracer, setup_tracing


def _reset_trace_provider():
    """Reset the global tracer provider for test isolation."""
    otel_trace._TRACER_PROVIDER = None
    otel_trace._TRACER_PROVIDER_SET_ONCE._done = False


class TestSetupTracing:
    def test_setup_tracing_configures_provider(self):
        """setup_tracing() replaces the global TracerProvider."""
        _reset_trace_provider()

        tracer_provider = trace.get_tracer_provider()
        assert not isinstance(tracer_provider, TracerProvider)

        setup_tracing(service_name="test-service")

        provider = trace.get_tracer_provider()
        assert isinstance(provider, TracerProvider)
        assert provider.resource.attributes["service.name"] == "test-service"

    def test_setup_tracing_sets_resource_attributes(self):
        """The provider resource should include service.name."""
        _reset_trace_provider()

        setup_tracing(service_name="estim-api-test")
        provider = trace.get_tracer_provider()
        resource = provider.resource
        assert resource.attributes["service.name"] == "estim-api-test"
        assert "service.version" in resource.attributes

    def test_setup_tracing_sets_environment_attribute(self):
        """The provider resource should include deployment.environment."""
        _reset_trace_provider()

        setup_tracing(service_name="test-service")
        provider = trace.get_tracer_provider()
        env = provider.resource.attributes.get("deployment.environment")
        assert isinstance(env, str)
        assert len(env) > 0


class TestGetTracer:
    def setup_method(self):
        _reset_trace_provider()
        setup_tracing(service_name="test-service")

    def test_get_tracer_returns_tracer(self):
        tracer = get_tracer("test.module")
        assert tracer is not None

    def test_get_tracer_creates_spans(self):
        tracer = get_tracer("test.module")

        with tracer.start_as_current_span("test-span") as span:
            span.set_attribute("test.key", "test.value")
            assert span.get_span_context().is_valid

    def test_get_tracer_uses_default_name(self):
        _reset_trace_provider()
        setup_tracing(service_name="test-service")

        tracer = get_tracer()
        assert tracer is not None

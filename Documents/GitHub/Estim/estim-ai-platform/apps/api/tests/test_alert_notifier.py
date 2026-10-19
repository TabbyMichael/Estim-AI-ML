"""Tests for alert notification configuration."""

import yaml
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent.parent.parent
ALERTMANAGER_CONFIG_PATH = BASE_DIR / "infrastructure" / "monitoring" / "alertmanager" / "alertmanager.yml"


def load_alertmanager_config():
    """Load and parse the Alertmanager YAML config."""
    with open(ALERTMANAGER_CONFIG_PATH) as f:
        return yaml.safe_load(f)


class TestAlertmanagerConfig:
    def test_config_loads_without_error(self):
        """Alertmanager config should be valid YAML."""
        config = load_alertmanager_config()
        assert config is not None
        assert "global" in config
        assert "route" in config
        assert "receivers" in config

    def test_global_settings(self):
        """Global config should include Slack API URL."""
        config = load_alertmanager_config()
        global_conf = config.get("global", {})
        slack_url = global_conf.get("slack_api_url", "")
        assert "hooks.slack.com" in slack_url

    def test_route_definition(self):
        """Route should be configured with correct group_by."""
        config = load_alertmanager_config()
        route = config.get("route", {})
        assert route.get("receiver") == "slack-notifications"
        assert "alertname" in route.get("group_by", [])
        assert "service" in route.get("group_by", [])

    def test_route_grouping(self):
        """Route should group alerts correctly."""
        config = load_alertmanager_config()
        route = config.get("route", {})
        group_by = route.get("group_by", [])
        assert "alertname" in group_by
        assert "service" in group_by

    def test_route_group_wait(self):
        """Route should wait before grouping new alerts."""
        config = load_alertmanager_config()
        route = config.get("route", {})
        assert route.get("group_wait") == "10s"

    def test_route_repeat_interval(self):
        """Route should repeat notifications after interval."""
        config = load_alertmanager_config()
        route = config.get("route", {})
        assert route.get("repeat_interval") == "3h"

    def test_receivers_defined(self):
        """Should define multiple notification receivers."""
        config = load_alertmanager_config()
        receivers = config.get("receivers", [])
        names = [r.get("name") for r in receivers]
        assert "slack-notifications" in names
        assert "email-notifications" in names
        assert "pagerduty-notifications" in names

    def test_slack_receiver_config(self):
        """Slack receiver should have correct channel."""
        config = load_alertmanager_config()
        slack_configs = [
            r
            for r in config.get("receivers", [])
            if "slack_configs" in r
            and len([c for c in r.get("slack_configs", []) if isinstance(c, dict)]) > 0
        ]
        assert len(slack_configs) > 0
        channel = slack_configs[0].get("slack_configs", [{}])[0].get("channel", "")
        assert channel == "#estim-alerts"

    def test_slack_channel(self):
        """Slack channel should be #estim-alerts."""
        config = load_alertmanager_config()
        for receiver in config.get("receivers", []):
            name = receiver.get("name")
            if name == "slack-notifications":
                slack_configs = receiver.get("slack_configs", [])
                assert len(slack_configs) > 0
                assert slack_configs[0].get("channel") == "#estim-alerts"
                break

    def test_alerts_destination(self):
        """Alert notifications should have a PagerDuty key defined."""
        config = load_alertmanager_config()
        for receiver in config.get("receivers", []):
            name = receiver.get("name")
            if name == "pagerduty-notifications":
                pagerduty_configs = receiver.get("pagerduty_configs", [])
                assert len(pagerduty_configs) > 0
                assert pagerduty_configs[0].get("service_key") is not None
                break

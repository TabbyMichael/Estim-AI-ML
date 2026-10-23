"""Dependency injection container (Phase 2.1 skeleton).

Full wiring (repositories, ML scorers, cross-module ports) lands in
Phase 3 (identity) and Phase 4 (procurement). This module provides the
container shape + health-check service so main.py can boot today.
"""

from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any


@dataclass
class Container:
    """Minimal service registry: register interface -> factory/instance."""

    _services: dict[Any, Any] = field(default_factory=dict)

    def register(self, interface: Any, implementation: Any) -> None:
        self._services[interface] = implementation

    def register_factory(self, interface: Any, factory: Callable[[], Any]) -> None:
        self._services[interface] = factory

    def resolve(self, interface: Any) -> Any:
        service = self._services.get(interface)
        if service is None:
            raise KeyError(f"No registration for {interface!r}.")
        if callable(service) and not isinstance(service, type):
            return service()
        return service

    def has(self, interface: Any) -> bool:
        return interface in self._services


container = Container()


def register_dependencies(app_container: Container | None = None) -> Container:
    """Register Phase 2 platform-level dependencies.

    Module registrations (identity/procurement/...) append here in later phases.
    """
    target = app_container or container
    target.register("settings", _lazy_settings())
    return target


def _lazy_settings() -> Any:
    from app.core.config import settings

    return settings

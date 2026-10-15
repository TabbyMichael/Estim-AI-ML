"""
Interface definitions (ports) for the procurement module.

This module defines Protocol interfaces for external dependencies.
These interfaces allow the procurement module to depend on abstractions
rather than concrete implementations, enabling testability and modularity.
"""
from typing import Protocol, List, Optional
from decimal import Decimal
from datetime import datetime

from modules.procurement.domain.entities import PurchaseOrder, Anomaly


# Repository Interfaces


class PurchaseOrderRepository(Protocol):
    """Interface for purchase order persistence."""

    def get_by_id(self, order_id: str) -> PurchaseOrder:
        """Retrieve a purchase order by ID.

        Args:
            order_id: Purchase order UUID

        Returns:
            Purchase order entity

        Raises:
            NotFoundError: If order not found
        """
        ...

    def save(self, order: PurchaseOrder) -> PurchaseOrder:
        """Save a purchase order (create or update).

        Args:
            order: Purchase order entity to save

        Returns:
            Saved purchase order entity
        """
        ...

    def delete(self, order_id: str) -> None:
        """Delete a purchase order by ID.

        Args:
            order_id: Purchase order UUID

        Raises:
            NotFoundError: If order not found
        """
        ...

    def list_orders(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[dict] = None
    ) -> tuple[List[PurchaseOrder], int]:
        """List purchase orders with pagination and filters.

        Args:
            skip: Pagination offset
            limit: Maximum records to return
            filters: Optional filter dictionary

        Returns:
            Tuple of (orders list, total count)
        """
        ...

    def exists_by_po_number(self, po_number: str) -> bool:
        """Check if a purchase order with given PO number exists.

        Args:
            po_number: Purchase order number

        Returns:
            True if exists, False otherwise
        """
        ...


class AnomalyRepository(Protocol):
    """Interface for anomaly persistence."""

    def get_by_id(self, anomaly_id: str) -> Anomaly:
        """Retrieve an anomaly by ID.

        Args:
            anomaly_id: Anomaly UUID

        Returns:
            Anomaly entity

        Raises:
            NotFoundError: If anomaly not found
        """
        ...

    def save(self, anomaly: Anomaly) -> Anomaly:
        """Save an anomaly (create or update).

        Args:
            anomaly: Anomaly entity to save

        Returns:
            Saved anomaly entity
        """
        ...

    def list_anomalies(
        self,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None
    ) -> tuple[List[Anomaly], int]:
        """List anomalies with pagination and filters.

        Args:
            skip: Pagination offset
            limit: Maximum records to return
            status: Optional status filter

        Returns:
            Tuple of (anomalies list, total count)
        """
        ...


# Service Interfaces (from other modules)


class InventoryQueryService(Protocol):
    """Interface for inventory queries provided by inventory module."""

    def get_available_stock(self, material_id: str, project_id: str) -> StockLevel:
        """Get current stock level for a material in a project.

        Args:
            material_id: Material identifier
            project_id: Project identifier

        Returns:
            StockLevel with available quantity and last updated timestamp
        """
        ...


class RiskScorer(Protocol):
    """Interface for ML risk scoring."""

    def score(self, order: PurchaseOrder) -> float:
        """Score purchase order anomaly risk.

        Args:
            order: Purchase order to score

        Returns:
            Anomaly score (higher = more anomalous)
        """
        ...


class NotificationService(Protocol):
    """Interface for sending notifications."""

    def send_alert(self, recipient: str, message: str, priority: str = "medium") -> None:
        """Send an alert notification.

        Args:
            recipient: Recipient user ID or email
            message: Alert message
            priority: Alert priority (low, medium, high)
        """
        ...


class AuditService(Protocol):
    """Interface for audit logging."""

    def log_action(
        self,
        user_id: str,
        action: str,
        entity_type: str,
        entity_id: str,
        details: Optional[dict] = None
    ) -> None:
        """Log an action for audit purposes.

        Args:
            user_id: User ID performing the action
            action: Action description
            entity_type: Type of entity affected
            entity_id: ID of entity affected
            details: Optional additional details
        """
        ...


# Event Publisher Interface


class EventPublisher(Protocol):
    """Interface for publishing domain events."""

    def publish(self, event: DomainEvent) -> None:
        """Publish a domain event.

        Args:
            event: Domain event to publish
        """
        ...


# Value Objects


class StockLevel:
    """Value object representing stock level."""
    material_id: str
    project_id: str
    available_quantity: int
    last_updated: datetime

    def __init__(self, material_id: str, project_id: str, available_quantity: int, last_updated: datetime):
        self.material_id = material_id
        self.project_id = project_id
        self.available_quantity = available_quantity
        self.last_updated = last_updated


class DomainEvent:
    """Base class for domain events."""
    event_type: str
    event_version: str
    timestamp: datetime

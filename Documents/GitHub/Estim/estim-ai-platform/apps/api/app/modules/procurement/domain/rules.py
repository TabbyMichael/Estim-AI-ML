"""
Business rules for the procurement module.

This module contains pure functions that implement business rules and policies.
These functions have no side effects and are independent of infrastructure.
"""
from typing import List
from decimal import Decimal

from modules.procurement.domain.entities import PurchaseOrder, OrderState, Anomaly, RiskLevel


# Purchase Order Rules


def can_approve_order(order: PurchaseOrder, user_id: str, user_roles: List[str]) -> bool:
    """Check if a user can approve a purchase order.

    Args:
        order: Purchase order to check
        user_id: User ID attempting approval
        user_roles: List of user roles

    Returns:
        True if user can approve, False otherwise
    """
    # Order must be in SUBMITTED state
    if order.state != OrderState.SUBMITTED:
        return False

    # User must have procurement role
    if "procurement_officer" not in user_roles and "procurement_manager" not in user_roles:
        return False

    # Orders above 1M TZS require manager approval
    if order.total_amount > Decimal("1000000") and "procurement_manager" not in user_roles:
        return False

    # Orders above 10M TZS require director approval
    if order.total_amount > Decimal("10000000") and "procurement_director" not in user_roles:
        return False

    return True


def can_submit_order(order: PurchaseOrder) -> bool:
    """Check if a purchase order can be submitted.

    Args:
        order: Purchase order to check

    Returns:
        True if order can be submitted, False otherwise
    """
    # Order must be in DRAFT state
    if order.state != OrderState.DRAFT:
        return False

    # Order must have at least one line item
    if not order.line_items:
        return False

    # Total amount must be positive
    if order.total_amount <= 0:
        return False

    return True


def validate_order_amount(order: PurchaseOrder, max_amount: Decimal) -> bool:
    """Validate that order amount is within allowed limit.

    Args:
        order: Purchase order to validate
        max_amount: Maximum allowed amount

    Returns:
        True if amount is valid, False otherwise
    """
    return order.total_amount <= max_amount


def is_duplicate_po(po_number: str, existing_numbers: List[str]) -> bool:
    """Check if PO number already exists.

    Args:
        po_number: PO number to check
        existing_numbers: List of existing PO numbers

    Returns:
        True if duplicate, False otherwise
    """
    return po_number.upper() in [num.upper() for num in existing_numbers]


def calculate_tax_amount(order: PurchaseOrder, tax_rate: Decimal) -> Decimal:
    """Calculate tax amount for a purchase order.

    Args:
        order: Purchase order
        tax_rate: Tax rate as decimal (e.g., 0.18 for 18%)

    Returns:
        Tax amount
    """
    return order.total_amount * tax_rate


def validate_line_items_unique(order: PurchaseOrder) -> bool:
    """Validate that all line items have unique material IDs.

    Args:
        order: Purchase order to validate

    Returns:
        True if all materials are unique, False otherwise
    """
    material_ids = [item.material_id for item in order.line_items]
    return len(material_ids) == len(set(material_ids))


def get_order_priority(order: PurchaseOrder) -> str:
    """Determine order priority based on amount and urgency.

    Args:
        order: Purchase order

    Returns:
        Priority level: "high", "medium", or "low"
    """
    if order.total_amount > Decimal("5000000"):
        return "high"
    elif order.total_amount > Decimal("1000000"):
        return "medium"
    else:
        return "low"


# Anomaly Detection Rules


def determine_risk_level(anomaly_score: float) -> RiskLevel:
    """Determine risk level based on anomaly score.

    Args:
        anomaly_score: Anomaly score from ML model

    Returns:
        Risk level enumeration
    """
    if anomaly_score > 0.8:
        return RiskLevel.HIGH
    elif anomaly_score > 0.5:
        return RiskLevel.MEDIUM
    else:
        return RiskLevel.LOW


def should_alert_immediately(anomaly: Anomaly) -> bool:
    """Check if anomaly should trigger immediate alert.

    Args:
        anomaly: Anomaly to check

    Returns:
        True if immediate alert required, False otherwise
    """
    # High risk anomalies require immediate alert
    if anomaly.risk_level == RiskLevel.HIGH:
        return True

    # Certain anomaly types require immediate alert
    critical_types = ["duplicate_invoice", "unauthorized_supplier", "price_gouging"]
    if anomaly.anomaly_type in critical_types:
        return True

    return False


def calculate_fraud_probability(anomaly: Anomaly, historical_avg: float) -> float:
    """Calculate fraud probability based on anomaly score and historical data.

    Args:
        anomaly: Anomaly to evaluate
        historical_avg: Historical average anomaly score for similar orders

    Returns:
        Fraud probability (0.0 to 1.0)
    """
    # Simple heuristic: deviation from historical average
    deviation = anomaly.anomaly_score - historical_avg
    probability = min(max(deviation, 0.0), 1.0)
    return probability


def can_review_anomaly(anomaly: Anomaly, user_id: str, user_roles: List[str]) -> bool:
    """Check if user can review an anomaly.

    Args:
        anomaly: Anomaly to review
        user_id: User ID
        user_roles: List of user roles

    Returns:
        True if user can review, False otherwise
    """
    # Anomaly must be in PENDING status
    if anomaly.status != AnomalyStatus.PENDING:
        return False

    # User must have review role
    if "procurement_manager" not in user_roles and "auditor" not in user_roles:
        return False

    # Users cannot review their own created anomalies (if tracking creator)
    # This would require anomaly.creator_id field in future

    return True


# Supplier Rules


def is_new_supplier(supplier_id: str, known_suppliers: List[str]) -> bool:
    """Check if supplier is new (not in known suppliers list).

    Args:
        supplier_id: Supplier ID to check
        known_suppliers: List of known supplier IDs

    Returns:
        True if new supplier, False otherwise
    """
    return supplier_id not in known_suppliers


def get_supplier_risk_level(
    supplier_id: str,
    supplier_history: dict
) -> str:
    """Determine supplier risk level based on history.

    Args:
        supplier_id: Supplier ID
        supplier_history: Dictionary with supplier performance metrics

    Returns:
        Risk level: "high", "medium", or "low"
    """
    if supplier_id not in supplier_history:
        return "medium"  # Unknown supplier

    history = supplier_history[supplier_id]

    # High risk if high rejection rate
    if history.get("rejection_rate", 0) > 0.2:
        return "high"

    # High risk if many late deliveries
    if history.get("late_delivery_rate", 0) > 0.3:
        return "high"

    # Medium risk if some issues
    if history.get("rejection_rate", 0) > 0.1 or history.get("late_delivery_rate", 0) > 0.15:
        return "medium"

    return "low"


# Budget Rules


def is_within_budget(order: PurchaseOrder, project_budget: Decimal, spent_amount: Decimal) -> bool:
    """Check if order is within project budget.

    Args:
        order: Purchase order
        project_budget: Total project budget
        spent_amount: Amount already spent

    Returns:
        True if within budget, False otherwise
    """
    remaining_budget = project_budget - spent_amount
    return order.total_amount <= remaining_budget


def get_budget_utilization(spent_amount: Decimal, project_budget: Decimal) -> float:
    """Calculate budget utilization percentage.

    Args:
        spent_amount: Amount spent
        project_budget: Total budget

    Returns:
        Utilization percentage (0.0 to 1.0)
    """
    if project_budget <= 0:
        return 1.0
    return float(spent_amount / project_budget)


def is_budget_critical(utilization: float) -> bool:
    """Check if budget utilization is critical.

    Args:
        utilization: Budget utilization (0.0 to 1.0)

    Returns:
        True if critical (>90%), False otherwise
    """
    return utilization > 0.9

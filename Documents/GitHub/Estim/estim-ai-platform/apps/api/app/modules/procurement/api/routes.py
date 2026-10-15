"""
Procurement module API routes.

This module defines HTTP endpoints for procurement operations including:
- Purchase order management
- Anomaly detection and review
- Supplier information
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime

from modules.procurement.api.schemas import (
    PurchaseOrderCreate,
    PurchaseOrderUpdate,
    PurchaseOrderResponse,
    PurchaseOrderListResponse,
    AnomalyReviewRequest,
    AnomalyResponse,
    AnomalyListResponse
)
from modules.procurement.application.services import (
    PurchaseOrderService,
    AnomalyReviewService
)
from app.core.database import get_db
from sqlalchemy.orm import Session

router = APIRouter(prefix="/procurement", tags=["procurement"])


@router.post("/purchase-orders", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    request: PurchaseOrderCreate,
    service: PurchaseOrderService = Depends(),
    db: Session = Depends(get_db)
) -> PurchaseOrderResponse:
    """Create a new purchase order.

    Args:
        request: Purchase order creation data
        service: Purchase order service (injected)
        db: Database session (injected)

    Returns:
        Created purchase order

    Raises:
        HTTPException: If order creation fails (400)
    """
    try:
        order = service.create_order(request)
        return PurchaseOrderResponse.from_entity(order)
    except DuplicateOrderError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )


@router.get("/purchase-orders", response_model=PurchaseOrderListResponse)
def list_purchase_orders(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    supplier_id: Optional[str] = Query(None, description="Filter by supplier"),
    project_id: Optional[str] = Query(None, description="Filter by project"),
    state: Optional[str] = Query(None, description="Filter by state"),
    service: PurchaseOrderService = Depends(),
    db: Session = Depends(get_db)
) -> PurchaseOrderListResponse:
    """List purchase orders with optional filters and pagination.

    Args:
        skip: Pagination offset
        limit: Maximum records to return
        supplier_id: Optional supplier filter
        project_id: Optional project filter
        state: Optional state filter
        service: Purchase order service (injected)
        db: Database session (injected)

    Returns:
        Paginated list of purchase orders
    """
    filters = PurchaseOrderFilters(
        supplier_id=supplier_id,
        project_id=project_id,
        state=state
    )

    orders, total = service.list_orders(
        skip=skip,
        limit=limit,
        filters=filters
    )

    return PurchaseOrderListResponse(
        orders=[PurchaseOrderResponse.from_entity(o) for o in orders],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/purchase-orders/{order_id}", response_model=PurchaseOrderResponse)
def get_purchase_order(
    order_id: str,
    service: PurchaseOrderService = Depends(),
    db: Session = Depends(get_db)
) -> PurchaseOrderResponse:
    """Get a specific purchase order by ID.

    Args:
        order_id: Purchase order UUID
        service: Purchase order service (injected)
        db: Database session (injected)

    Returns:
        Purchase order details

    Raises:
        HTTPException: If order not found (404)
    """
    try:
        order = service.get_order(order_id)
        return PurchaseOrderResponse.from_entity(order)
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.put("/purchase-orders/{order_id}", response_model=PurchaseOrderResponse)
def update_purchase_order(
    order_id: str,
    request: PurchaseOrderUpdate,
    service: PurchaseOrderService = Depends(),
    db: Session = Depends(get_db)
) -> PurchaseOrderResponse:
    """Update an existing purchase order.

    Args:
        order_id: Purchase order UUID
        request: Update data
        service: Purchase order service (injected)
        db: Database session (injected)

    Returns:
        Updated purchase order

    Raises:
        HTTPException: If order not found (404) or update invalid (400)
    """
    try:
        order = service.update_order(order_id, request)
        return PurchaseOrderResponse.from_entity(order)
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except InvalidStateError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/purchase-orders/{order_id}/approve", response_model=PurchaseOrderResponse)
def approve_purchase_order(
    order_id: str,
    user_id: str = Query(..., description="User ID of approver"),
    service: PurchaseOrderService = Depends(),
    db: Session = Depends(get_db)
) -> PurchaseOrderResponse:
    """Approve a purchase order.

    Args:
        order_id: Purchase order UUID
        user_id: User ID of the approver
        service: Purchase order service (injected)
        db: Database session (injected)

    Returns:
        Approved purchase order

    Raises:
        HTTPException: If approval fails (400)
    """
    try:
        order = service.approve_order(order_id, user_id)
        return PurchaseOrderResponse.from_entity(order)
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except UnauthorizedApprovalError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except InsufficientStockError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/anomalies", response_model=AnomalyListResponse)
def list_anomalies(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[str] = Query(None, description="Filter by review status"),
    service: AnomalyReviewService = Depends(),
    db: Session = Depends(get_db)
) -> AnomalyListResponse:
    """List procurement anomalies requiring review.

    Args:
        skip: Pagination offset
        limit: Maximum records to return
        status: Optional status filter (pending, approved, rejected)
        service: Anomaly review service (injected)
        db: Database session (injected)

    Returns:
        Paginated list of anomalies
    """
    anomalies, total = service.list_anomalies(
        skip=skip,
        limit=limit,
        status=status
    )

    return AnomalyListResponse(
        anomalies=[AnomalyResponse.from_entity(a) for a in anomalies],
        total=total,
        skip=skip,
        limit=limit
    )


@router.post("/anomalies/{anomaly_id}/review", response_model=AnomalyResponse)
def review_anomaly(
    anomaly_id: str,
    request: AnomalyReviewRequest,
    service: AnomalyReviewService = Depends(),
    db: Session = Depends(get_db)
) -> AnomalyResponse:
    """Submit a review decision for a procurement anomaly.

    Args:
        anomaly_id: Anomaly UUID
        request: Review decision (approve, reject, investigate)
        service: Anomaly review service (injected)
        db: Database session (injected)

    Returns:
        Updated anomaly with review decision

    Raises:
        HTTPException: If anomaly not found (404) or review invalid (400)
    """
    try:
        anomaly = service.submit_review(
            anomaly_id=anomaly_id,
            decision=request.decision,
            reviewer_id=request.reviewer_id,
            notes=request.notes
        )
        return AnomalyResponse.from_entity(anomaly)
    except NotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except InvalidStateError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

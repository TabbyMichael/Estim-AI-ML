"""
Procurement module API routes.

This module defines HTTP endpoints for procurement operations including:
- Purchase order management
- Anomaly detection and review
"""


from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.procurement.api.schemas import (
    AnomalyListResponse,
    AnomalyResponse,
    AnomalyReviewRequest,
    PurchaseOrderCreate,
    PurchaseOrderFilters,
    PurchaseOrderListResponse,
    PurchaseOrderResponse,
    PurchaseOrderUpdate,
)
from app.modules.procurement.application.services import (
    AnomalyReviewService,
    PurchaseOrderService,
)
from app.modules.procurement.domain.entities import (
    AnomalyDecision,
    DuplicateOrderError,
    InsufficientStockError,
    InvalidStateError,
    NotFoundError,
    UnauthorizedApprovalError,
    ValidationError,
)
from app.modules.procurement.infrastructure.repository import (
    SqlAlchemyAnomalyRepository,
    SqlAlchemyPurchaseOrderRepository,
)

router = APIRouter(prefix="/procurement", tags=["procurement"])


def _purchase_order_service(db: Session = Depends(get_db)) -> PurchaseOrderService:
    return PurchaseOrderService(orders=SqlAlchemyPurchaseOrderRepository(db))


def _anomaly_review_service(db: Session = Depends(get_db)) -> AnomalyReviewService:
    return AnomalyReviewService(anomalies=SqlAlchemyAnomalyRepository(db))


@router.post(
    "/purchase-orders",
    response_model=PurchaseOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_purchase_order(
    request: PurchaseOrderCreate,
    service: PurchaseOrderService = Depends(_purchase_order_service),
    db: Session = Depends(get_db),
) -> PurchaseOrderResponse:
    """Create a new purchase order."""
    try:
        order = service.create_order(request)
        db.commit()
        return PurchaseOrderResponse.from_entity(order)
    except DuplicateOrderError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )


@router.get("/purchase-orders", response_model=PurchaseOrderListResponse)
def list_purchase_orders(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    supplier_id: str | None = Query(None, description="Filter by supplier"),
    project_id: str | None = Query(None, description="Filter by project"),
    state: str | None = Query(None, description="Filter by state"),
    service: PurchaseOrderService = Depends(_purchase_order_service),
) -> PurchaseOrderListResponse:
    """List purchase orders with optional filters and pagination."""
    filters = PurchaseOrderFilters(
        supplier_id=supplier_id,
        project_id=project_id,
        state=state,
    )
    orders, total = service.list_orders(skip=skip, limit=limit, filters=filters)
    return PurchaseOrderListResponse(
        orders=[PurchaseOrderResponse.from_entity(o) for o in orders],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/purchase-orders/{order_id}", response_model=PurchaseOrderResponse)
def get_purchase_order(
    order_id: str,
    service: PurchaseOrderService = Depends(_purchase_order_service),
) -> PurchaseOrderResponse:
    """Get a specific purchase order by ID."""
    try:
        order = service.get_order(order_id)
        return PurchaseOrderResponse.from_entity(order)
    except NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )


@router.put("/purchase-orders/{order_id}", response_model=PurchaseOrderResponse)
def update_purchase_order(
    order_id: str,
    request: PurchaseOrderUpdate,
    service: PurchaseOrderService = Depends(_purchase_order_service),
    db: Session = Depends(get_db),
) -> PurchaseOrderResponse:
    """Update an existing purchase order."""
    try:
        order = service.update_order(order_id, request)
        db.commit()
        return PurchaseOrderResponse.from_entity(order)
    except NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    except InvalidStateError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.post("/purchase-orders/{order_id}/approve", response_model=PurchaseOrderResponse)
def approve_purchase_order(
    order_id: str,
    user_id: str = Query(..., description="User ID of approver"),
    service: PurchaseOrderService = Depends(_purchase_order_service),
    db: Session = Depends(get_db),
) -> PurchaseOrderResponse:
    """Approve a purchase order."""
    try:
        order = service.approve_order(order_id, user_id)
        db.commit()
        return PurchaseOrderResponse.from_entity(order)
    except NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    except UnauthorizedApprovalError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        )
    except InsufficientStockError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.get("/anomalies", response_model=AnomalyListResponse)
def list_anomalies(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: str | None = Query(None, description="Filter by review status"),
    service: AnomalyReviewService = Depends(_anomaly_review_service),
) -> AnomalyListResponse:
    """List procurement anomalies requiring review."""
    anomalies, total = service.list_anomalies(skip=skip, limit=limit, status=status)
    return AnomalyListResponse(
        anomalies=[AnomalyResponse.from_entity(a) for a in anomalies],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("/anomalies/{anomaly_id}/review", response_model=AnomalyResponse)
def review_anomaly(
    anomaly_id: str,
    request: AnomalyReviewRequest,
    service: AnomalyReviewService = Depends(_anomaly_review_service),
    db: Session = Depends(get_db),
) -> AnomalyResponse:
    """Submit a review decision for a procurement anomaly."""
    try:
        anomaly = service.submit_review(
            anomaly_id=anomaly_id,
            decision=AnomalyDecision(request.decision.value),
            reviewer_id=request.reviewer_id,
            notes=request.notes,
        )
        db.commit()
        return AnomalyResponse.from_entity(anomaly)
    except NotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    except InvalidStateError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )

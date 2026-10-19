"""FastAPI application entrypoint.

Wires core middleware + exception handlers, exposes /health,
and provides the OpenAPI surface (Phase 2.4). Module routers
(procurement, identity, ...) mount here in Phase 3+.
"""

from fastapi import FastAPI, Response, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from app.bootstrap import register_dependencies
from app.core import logging as estim_logging
from app.core import realtime
from app.core.config import settings
from app.core.metrics import metrics_response
from app.core.middleware import register_handlers, register_middleware
from app.core.tracing import instrument_fastapi, setup_tracing
from app.modules.audit.api.routes import router as audit_router
from app.modules.audit.middleware import register_audit_middleware
from app.modules.cost_forecasting.api.routes import router as cost_forecasting_router
from app.modules.document_intelligence.api.routes import router as documents_router
from app.modules.identity.api.routes import router as identity_router
from app.modules.inventory.api.routes import router as inventory_router
from app.modules.maintenance.api.routes import router as maintenance_router
from app.modules.notifications.api.routes import router as notifications_router
from app.modules.procurement.api.routes import router as procurement_router
from app.modules.project_risk.api.routes import router as project_risk_router
from app.modules.reporting.api.routes import router as reporting_router
from app.modules.visual_inspection.api.routes import router as visual_router

estim_logging.setup_logging()
setup_tracing(settings.app_name)

app = FastAPI(
    title="Estim AI Platform",
    description="Construction intelligence platform (modular monolith).",
    version="0.1.0",
    openapi_tags=[
        {"name": "platform", "description": "Platform health and status."},
        {"name": "identity", "description": "Authentication and user management."},
        {"name": "procurement", "description": "Procurement intelligence (Phase 4)."},
        {"name": "cost-forecasting", "description": "Cost forecasting (Phase 5.1)."},
        {"name": "inventory", "description": "Inventory intelligence (Phase 5.2)."},
        {"name": "maintenance", "description": "Maintenance intelligence (Phase 5.3)."},
        {"name": "project-risk", "description": "Project risk intelligence (Phase 5.4)."},
        {"name": "visual-inspection",
         "description": "Visual inspection (Phase 5.5)."},
        {"name": "documents", "description": "Document intelligence (Phase 5.6)."},
        {"name": "notifications", "description": "Notifications (Phase 6.1)."},
        {"name": "reports", "description": "Reporting (Phase 6.2)."},
        {"name": "audit", "description": "Audit logs (Phase 6.3)."},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
register_middleware(app)
register_handlers(app)
register_dependencies()
register_audit_middleware(app)


@app.on_event("startup")
async def _capture_event_loop() -> None:
    """Record the main loop so sync code can publish realtime frames."""
    realtime.capture_loop()

app.include_router(identity_router)
app.include_router(procurement_router)
app.include_router(cost_forecasting_router)
app.include_router(inventory_router)
app.include_router(maintenance_router)
app.include_router(project_risk_router)
app.include_router(visual_router)
app.include_router(documents_router)
app.include_router(notifications_router)
app.include_router(reporting_router)
app.include_router(audit_router)

instrument_fastapi(app)


@app.get("/health", tags=["platform"])
def health() -> dict:
    """Liveness probe for Docker / load balancers."""
    return {"status": "ok", "app": settings.app_name, "env": settings.environment}


@app.get("/metrics", tags=["platform"], include_in_schema=False)
def metrics() -> Response:
    """Prometheus metrics endpoint scraped by the Prometheus server."""
    body, headers = metrics_response()
    return Response(content=body, media_type=headers["Content-Type"])


@app.websocket("/ws")
async def websocket_route(websocket: WebSocket) -> None:
    """Realtime WebSocket (Roadmap 1.2): /ws?token=<access_token>."""
    await realtime.websocket_endpoint(websocket)


@app.get("/realtime/status", tags=["platform"])
def realtime_status() -> dict:
    """Connection count + channel membership for ops dashboards."""
    return {
        "connections": realtime.manager.connection_count,
        "channels": realtime.manager.channels(),
    }


@app.get("/", tags=["platform"])
def root() -> dict:
    return {
        "app": settings.app_name,
        "docs": "/docs",
        "health": "/health",
    }

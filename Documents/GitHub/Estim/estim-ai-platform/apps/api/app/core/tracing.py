"""OpenTelemetry distributed tracing with Jaeger export.

Per docs/architecture/01-overview.md §10.3: Trace ID flows through API,
workers, and database. Module boundaries are traced in-process.

Setup:
  1. `setup_tracing()` configures the TracerProvider with a Jaeger exporter
  2. `FastAPIInstrumentor` auto-instruments HTTP routes (span per request)
  3. `get_tracer()` returns a tracer for custom spans in business logic
"""

from opentelemetry import trace
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

from app.core.config import settings

_tracer_provider_configured = False


def setup_tracing(service_name: str = "estim-api") -> None:
    """Configure OpenTelemetry tracing with Jaeger exporter.

    Safe to call multiple times; reconfigures the global TracerProvider
    each time so tests can inject custom service names.
    """
    global _tracer_provider_configured

    # Clear any existing provider to allow reconfiguration
    existing = trace.get_tracer_provider()
    if isinstance(existing, TracerProvider):
        trace.set_tracer_provider(None)

    resource = Resource.create(
        {
            "service.name": service_name,
            "service.version": "0.1.0",
            "deployment.environment": settings.environment,
        }
    )

    provider = TracerProvider(resource=resource)

    # Export to Jaeger (Thrift over UDP via jaeger-all-in-one)
    jaeger_exporter = JaegerExporter(
        agent_host_name=settings.jaeger_host,
        agent_port=settings.jaeger_port,
    )
    provider.add_span_processor(BatchSpanProcessor(jaeger_exporter))

    trace.set_tracer_provider(provider)
    _tracer_provider_configured = True

def get_tracer(name: str = "estim") -> trace.Tracer:
    """Return a tracer for creating custom spans in business logic."""
    return trace.get_tracer(name)


def instrument_fastapi(app) -> None:
    """Auto-instrument a FastAPI app with OpenTelemetry HTTP tracing."""
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

    FastAPIInstrumentor.instrument_app(app)

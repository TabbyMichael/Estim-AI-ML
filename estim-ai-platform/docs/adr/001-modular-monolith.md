# ADR-001: Modular Monolith vs Microservices

## Status

Accepted

## Context

Estim Construction requires an AI/ML platform with seven distinct business domains (procurement, cost forecasting, inventory, maintenance, project risk, visual inspection, document intelligence). The system must integrate with Odoo ERP and provide a unified user experience.

We considered two architectural approaches:

1. **Microservices**: Each business domain as an independently deployable service
2. **Modular Monolith**: One application with strict module boundaries

## Decision

We choose **Modular Monolith** for the initial implementation of the Estim AI Platform.

## Rationale

### Advantages of Modular Monolith for Estim

1. **Lower Initial Complexity**
   - Single deployment unit (Docker Compose or one Kubernetes deployment)
   - No distributed transaction management
   - Simpler local development (one application to run)
   - Easier debugging (direct breakpoints, no distributed tracing needed)

2. **Faster Development Timeline**
   - Team can focus on business logic rather than infrastructure
   - Shared database simplifies data joins for reporting
   - No need for service discovery, API gateways, or inter-service communication complexity

3. **Better Fit for Initial Scale**
   - Estim likely has 1-10 concurrent users initially
   - Single team or small team structure
   - Monolith can handle thousands of requests per second with proper optimization

4. **Module Boundaries Enable Future Migration**
   - Clear module boundaries allow extraction to microservices later if needed
   - Domain events and interfaces already decouple modules
   - No architectural rework required to split later

5. **Database Consistency**
   - ACID transactions across modules when needed
   - No eventual consistency concerns for initial features
   - Simpler backup and restore

### When We Would Consider Microservices

We will only split into microservices when:
- A module requires significantly different scaling (e.g., computer vision needs GPU)
- A module has independent deployment cycles (e.g., weekly vs monthly releases)
- Different teams own different modules
- A module has clear independent bounded context with minimal coupling

**We will not split services prematurely.**

## Consequences

### Positive

- Faster time to market for initial AI features
- Lower operational overhead for small team
- Easier to reason about system behavior
- Shared infrastructure reduces duplication

### Negative

- Module boundaries must be actively enforced (architectural tests required)
- Single deployment means all modules must be released together
- Team must be disciplined about module communication patterns
- May need to refactor later if scaling requires microservices

### Mitigation Strategies

1. **Architectural Tests**: Enforce module boundaries in CI
2. **Interface Contracts**: Define clear module interfaces (Protocols)
3. **Domain Events**: Use events for asynchronous communication
4. **Database Schema Separation**: Each module owns its schema
5. **Code Organization**: Physical folder structure mirrors module boundaries

## Implementation Notes

- Module communication through application interfaces, not direct model access
- Domain events for asynchronous workflows
- Transactional outbox for reliable event delivery
- One PostgreSQL instance with module-owned schemas
- Celery workers for background jobs (still part of monolith codebase)

## Alternatives Considered

### Microservices from Start

**Rejected because:**
- Too much infrastructure overhead for initial implementation
- Distributed transactions and eventual consistency add complexity
- Team size doesn't justify operational overhead
- Can split later if needed (no lock-in)

### Event-Driven Architecture (EDA)

**Rejected because:**
- Too complex for initial implementation
- Event sourcing adds operational complexity
- We can adopt event-driven patterns within monolith
- Can evolve to full EDA if needed

## References

- [Modular Monolith: Architecture That Can Scale](https://herbertograca.com/2017/09/14/modular-monolith-the-way-to-scalable-software/)
- [Monolith First](https://martinfowler.com/bliki/MonolithFirst.html)
- [Microservices Premium](https://martinfowler.com/articles/microservices.html)

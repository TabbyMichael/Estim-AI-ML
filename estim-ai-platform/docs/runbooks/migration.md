# Estim AI Platform - Migration Runbook

## 1. Migration Overview

This runbook defines the process for performing database schema migrations and data migrations.

## 2. Migration Types

| Type | Description | Examples |
|------|-------------|----------|
| **Schema Migration** | Database structure changes | New tables, columns, indexes |
| **Data Migration** | Data transformations | Legacy data cleanup, referential updates |
| **Seed Migration** | Initial data | Sample data, configuration values |
| **Version Migration** | Version-specific updates | Upgrades, configuration changes |

## 3. Pre-Migration Checklist

### 3.1 Preparation

- [ ] Migration scripts reviewed with team
- [ ] Backup created (database + object storage)
- [ ] Staging environment tested
- [ ] Rollback plan documented
- [ ] Stakeholders notified

### 3.2 Testing

- [ ] Local testing completed
- [ ] Staging migration tested
- [ ] Performance impact assessed
- [ ] Data integrity verified

## 4. Schema Migrations

### 4.1 Running Migrations

```bash
# Apply pending migrations
alembic upgrade head

# Verify migrations
alembic History
```

### 4.2 Creating Migrations

```bash
# Create migration file
alembic revision --autogenerate -m "Add new column to invoices table"

# Review generated migration
vim migrations/versions/xxxx_add_column.py

# Test migration on staging
alembic upgrade head
```

### 4.3 Migration Best Practices

| Practice | Why |
|----------|-----|
| **Always version migrations** | Track changes over time |
| **Test backward compatibility** | Support rolling upgrades |
| **Never edit applied migrations** | Second application breaks |
| **Use transactions** | Atomic migrations |
| **Test thoroughly** | Prevent data loss |

## 5. Data Migrations

### 5.1 Data Migration Planning

1. **Define scope**
   - Which tables affected
   - Which data needs transformation
   - Expected data volume

2. **Write migration script**
   - Idempotent (safe to run multiple times)
   - Document transformations
   - Add logging

3. **Test on production copy**
   - Verify data integrity
   - Measure performance

### 5.2 Example Data Migration

```python
# migrations/versions/20261019_add_profitability.py
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    # Add new column
    op.add_column('invoices', sa.Column('is_profitable', sa.Boolean(), nullable=True))
    
    # Backfill data
    connection = op.get_bind()
    result = connection.execute(
        sa.text("""
            UPDATE invoices
            SET is_profitable = (
                SELECT amount > (SELECT COALESCE(SUM(purchase_order_amount), 0)
                              FROM purchase_order_relationships
                              WHERE purchase_order_id = invoices.related_po_id)
                FROM invoices p2
                WHERE p2.id = invoices.id
            );
        """)
    )
    
    # Set constraint
    op.alter_column('invoices', 'is_profitable', nullable=False)
    
    # Add index
    op.create_index('ix_invoices_is_profitable', 'invoices', ['is_profitable'])


def downgrade():
    op.drop_index('ix_invoices_is_profitable', 'invoices')
    op.drop_column('invoices', 'is_profitable')
```

### 5.3 Data Migration Safety

| Practice | When |
|----------|------|
| **Double-check queries** | Before running on production |
| **Use transactions** | For small data volumes |
| **Split large migrations** | For > 1 million rows |
| **Monitor during execution** | Watch for performance |

## 6. Migration Procedures

### 6.1 Schema Migration Procedure

1. **Prepare**
   - Create migration
   - Test on staging
   - Write rollback plan

2. **Execute**
   ```bash
   # Stop application
   docker compose stop estim-api
   
   # Run migrations
   alembic upgrade head
   
   # Start application
   docker compose start estim-api
   ```

3. **Verify**
   - Check schema
     ```bash
     docker compose exec postgres psql -U estim -d estim -c "\d+ invoices"
     ```
   - Run smoke tests
   - Monitor performance

### 6.2 Data Migration Procedure

1. **Backup**
   - Database dump
   - Object storage state

2. **Execute**
   ```bash
   python -m scripts.migrate_data
   ```

3. **Verify**
   - Check data integrity
   - Compare with backups
   - Run reconciliation tests

### 6.3 Deployment

1. **Schedule**
   - Use maintenance window
   - Notify stakeholders

2. **Execute**
   - Application downtime if needed
   - Run migrations
   - Validate

3. **Communicate**
   - Success message
   - Post-mortem if needed

## 7. Rollback Procedures

### 7.1 Schema Rollback

```bash
# Downgrade one version
alembic downgrade -1

# Or to specific version
alembic downgrade rev:20261019_abc123
```

**Note:** Rollback only works if migration is reversible.

### 7.2 Data Rollback

1. Restore from backup
   ```bash
   ./backup_db.sh --restore <timestamp>
   ```

2. Reapply migrations
   ```bash
   alembic upgrade head
   ```

## 8. Monitoring During Migration

### 8.1 Key Metrics

| Metric | Target |
|--------|--------|
| Migration duration | < 30 minutes |
| Rollback success | 100% |
| Data integrity errors | 0 |
| Performance impact | < 20% degradation |

### 8.2 Alerts

| Alert | Threshold | Action |
|-------|-----------|--------|
| Migration failure | Any failure | Immediate abort |
| Slow query | > 5 min | Stops migration |
| Data integrity | Any error | Rollback trigger |

## 9. Post-Migration Tasks

1. **Verify**
   - Data integrity checks
   - Application health
   - User access

2. **Cleanup**
   - Remove old backups after retention
   - Document migration

3. **Communicate**
   - Success report
   - Lessons learned

## 10. Related Documentation

- [Deployment Runbook](../runbooks/deployment.md)
- [Backup and Restore Runbook](../runbooks/backup-restore.md)
- [Incident Response Runbook](../runbooks/incident-response.md)

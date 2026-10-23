#!/usr/bin/env python3
"""
Estim AI Platform - Database Maintenance
Performs routine database maintenance: vacuum, analyze, reindex, cleanup.
"""

import logging
import sys
import os
from datetime import datetime
from typing import List, Dict

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DatabaseMaintenance:
    """Performs PostgreSQL database maintenance tasks."""

    def __init__(self, database_url: str):
        self.database_url = database_url
        self.tasks_completed: List[str] = []
        self.tasks_failed: List[str] = []

    def vacuum_analyze(self) -> bool:
        """Run VACUUM ANALYZE on all tables."""
        logger.info("Running VACUUM ANALYZE...")
        try:
            import psycopg2
            conn = psycopg2.connect(self.database_url)
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute("VACUUM ANALYZE;")
            cur.close()
            conn.close()
            self.tasks_completed.append("vacuum_analyze")
            logger.info("VACUUM ANALYZE completed successfully")
            return True
        except Exception as e:
            self.tasks_failed.append(f"vacuum_analyze: {e}")
            logger.error(f"VACUUM ANALYZE failed: {e}")
            return False

    def reindex_database(self) -> bool:
        """Reindex all tables."""
        logger.info("Running REINDEX DATABASE...")
        try:
            import psycopg2
            conn = psycopg2.connect(self.database_url)
            conn.autocommit = True
            cur = conn.cursor()
            cur.execute("REINDEX DATABASE estim_ai;")
            cur.close()
            conn.close()
            self.tasks_completed.append("reindex_database")
            logger.info("REINDEX DATABASE completed successfully")
            return True
        except Exception as e:
            self.tasks_failed.append(f"reindex_database: {e}")
            logger.error(f"REINDEX DATABASE failed: {e}")
            return False

    def cleanup_old_logs(self, days_to_keep: int = 30) -> bool:
        """Clean up old audit logs."""
        logger.info(f"Cleaning up audit logs older than {days_to_keep} days...")
        try:
            import psycopg2
            conn = psycopg2.connect(self.database_url)
            cur = conn.cursor()
            cur.execute(
                "DELETE FROM core.audit_logs WHERE created_at < NOW() - INTERVAL %s days",
                (days_to_keep,)
            )
            deleted = cur.rowcount
            conn.commit()
            cur.close()
            conn.close()
            self.tasks_completed.append(f"cleanup_old_logs ({deleted} rows)")
            logger.info(f"Deleted {deleted} old audit log rows")
            return True
        except Exception as e:
            self.tasks_failed.append(f"cleanup_old_logs: {e}")
            logger.error(f"Cleanup old logs failed: {e}")
            return False

    def check_table_bloat(self) -> Dict[str, float]:
        """Check for table bloat."""
        logger.info("Checking table bloat...")
        try:
            import psycopg2
            conn = psycopg2.connect(self.database_url)
            cur = conn.cursor()
            cur.execute("""
                SELECT schemaname, tablename,
                       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
                FROM pg_tables
                WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
                ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
                LIMIT 10;
            """)
            results = cur.fetchall()
            cur.close()
            conn.close()
            logger.info(f"Table bloat check completed: {len(results)} tables analyzed")
            return {row[1]: row[2] for row in results}
        except Exception as e:
            logger.error(f"Table bloat check failed: {e}")
            return {}

    def run_all(self) -> None:
        """Run all maintenance tasks."""
        logger.info("=" * 60)
        logger.info("Starting Database Maintenance")
        logger.info("=" * 60)

        self.vacuum_analyze()
        self.reindex_database()
        self.cleanup_old_logs()
        self.check_table_bloat()

        logger.info("=" * 60)
        logger.info(f"Maintenance Summary: {len(self.tasks_completed)} completed, "
                    f"{len(self.tasks_failed)} failed")
        for task in self.tasks_completed:
            logger.info(f"  ✓ {task}")
        for task in self.tasks_failed:
            logger.error(f"  ✗ {task}")
        logger.info("=" * 60)


def main():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        logger.error("DATABASE_URL environment variable not set")
        sys.exit(1)

    maintenance = DatabaseMaintenance(database_url)
    maintenance.run_all()

    if maintenance.tasks_failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
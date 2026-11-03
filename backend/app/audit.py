from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditLog


def record(
    db: Session,
    *,
    actor_type: str,
    actor_id: Any,
    action: str,
    entity: str,
    entity_id: Any,
    before: dict | None = None,
    after: dict | None = None,
    ip: str | None = None,
) -> None:
    """Tambah satu baris audit log di transaksi yang sama dengan perubahannya (commit dilakukan pemanggil)."""
    db.add(
        AuditLog(
            actor_type=actor_type,
            actor_id=str(actor_id) if actor_id is not None else None,
            action=action,
            entity=entity,
            entity_id=str(entity_id) if entity_id is not None else None,
            before=before,
            after=after,
            ip=ip,
        )
    )

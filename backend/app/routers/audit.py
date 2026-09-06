from __future__ import annotations
import csv
import io
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, Response
from pydantic import BaseModel
from sqlalchemy import desc
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import AuditEvent, AuditOutcome, User
from app.dependencies import get_current_user
from app.schemas import UserOut

router = APIRouter(prefix="/audit", tags=["Audit Log"])


class AuditEventOut(BaseModel):
    id: int
    actor_id: int
    actor: Optional[UserOut] = None
    action: str
    resource_type: str
    resource_id: int
    outcome: str
    ip_address: Optional[str] = None
    timestamp: str

    class Config:
        from_attributes = True


class AuditPaginatedResponse(BaseModel):
    items: List[AuditEventOut]
    total: int
    page: int
    limit: int
    pages: int


@router.get("", response_model=AuditPaginatedResponse)
def get_audit_logs(
    case_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    outcome: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve audit log entries with multi-column filtering and pagination."""
    query = db.query(AuditEvent).options(joinedload(AuditEvent.actor))

    if user_id:
        query = query.filter(AuditEvent.actor_id == user_id)
    if action:
        query = query.filter(AuditEvent.action.ilike(f"%{action}%"))
    if outcome:
        query = query.filter(AuditEvent.outcome == AuditOutcome(outcome))
    if case_id:
        query = query.filter(
            ((AuditEvent.resource_type == "case") & (AuditEvent.resource_id == case_id)) |
            ((AuditEvent.resource_type.in_(["document", "document_version"])) & (AuditEvent.resource_id == case_id))
        )
    if from_date:
        try:
            dt_from = datetime.fromisoformat(from_date.replace("Z", "+00:00"))
            query = query.filter(AuditEvent.timestamp >= dt_from)
        except Exception:
            pass
    if to_date:
        try:
            dt_to = datetime.fromisoformat(to_date.replace("Z", "+00:00"))
            query = query.filter(AuditEvent.timestamp <= dt_to)
        except Exception:
            pass

    total = query.count()
    pages = (total + limit - 1) // limit if total > 0 else 1

    events = query.order_by(desc(AuditEvent.timestamp)).offset((page - 1) * limit).limit(limit).all()

    items = []
    for ev in events:
        actor_out = UserOut.model_validate(ev.actor) if ev.actor else None
        items.append(
            AuditEventOut(
                id=ev.id,
                actor_id=ev.actor_id,
                actor=actor_out,
                action=ev.action,
                resource_type=ev.resource_type,
                resource_id=ev.resource_id,
                outcome=ev.outcome.value if hasattr(ev.outcome, 'value') else str(ev.outcome),
                ip_address=ev.ip_address,
                timestamp=ev.timestamp.isoformat() if ev.timestamp else "",
            )
        )

    return AuditPaginatedResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.get("/export")
def export_audit_csv(
    case_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    outcome: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export filtered audit logs as a downloadable CSV file."""
    query = db.query(AuditEvent).options(joinedload(AuditEvent.actor))

    if user_id:
        query = query.filter(AuditEvent.actor_id == user_id)
    if action:
        query = query.filter(AuditEvent.action.ilike(f"%{action}%"))
    if outcome:
        query = query.filter(AuditEvent.outcome == AuditOutcome(outcome))
    if case_id:
        query = query.filter(
            ((AuditEvent.resource_type == "case") & (AuditEvent.resource_id == case_id)) |
            ((AuditEvent.resource_type.in_(["document", "document_version"])) & (AuditEvent.resource_id == case_id))
        )
    if from_date:
        try:
            dt_from = datetime.fromisoformat(from_date.replace("Z", "+00:00"))
            query = query.filter(AuditEvent.timestamp >= dt_from)
        except Exception:
            pass
    if to_date:
        try:
            dt_to = datetime.fromisoformat(to_date.replace("Z", "+00:00"))
            query = query.filter(AuditEvent.timestamp <= dt_to)
        except Exception:
            pass

    events = query.order_by(desc(AuditEvent.timestamp)).limit(5000).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Event ID",
        "Timestamp",
        "Actor ID",
        "Actor Name",
        "Actor Email",
        "Actor Role",
        "Action",
        "Resource Type",
        "Resource ID",
        "Outcome",
        "IP Address"
    ])

    for ev in events:
        actor_name = ev.actor.full_name if ev.actor else "System/Unknown"
        actor_email = ev.actor.email if ev.actor else "N/A"
        actor_role = ev.actor.role.value if ev.actor and hasattr(ev.actor.role, 'value') else "N/A"
        outcome_str = ev.outcome.value if hasattr(ev.outcome, 'value') else str(ev.outcome)

        writer.writerow([
            ev.id,
            ev.timestamp.isoformat() if ev.timestamp else "",
            ev.actor_id,
            actor_name,
            actor_email,
            actor_role,
            ev.action,
            ev.resource_type,
            ev.resource_id,
            outcome_str,
            ev.ip_address or ""
        ])

    csv_data = output.getvalue()
    filename = f"securecase_audit_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )

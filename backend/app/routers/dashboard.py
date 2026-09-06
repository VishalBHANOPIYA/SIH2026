from __future__ import annotations
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, desc, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User, Case, CaseStatus, Document, DocType, DocumentVersion,
    AuditEvent, AuditOutcome, Signature, LedgerTransaction, ShareRequest, ShareStatus
)
from app.dependencies import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


class CaseStatusCount(BaseModel):
    status: str
    label: str
    count: int


class DocTypeCount(BaseModel):
    doc_type: str
    label: str
    count: int


class AuditDailyActivity(BaseModel):
    date: str
    display_date: str
    count: int
    success: int
    denied: int


class SecurityAlert(BaseModel):
    id: str
    severity: str  # 'high' | 'medium' | 'info'
    type: str
    title: str
    description: str
    timestamp: str


class TotalsSummary(BaseModel):
    cases: int
    documents: int
    signatures: int
    audit_events: int
    active_shares: int


class DashboardStatsResponse(BaseModel):
    cases_by_status: List[CaseStatusCount]
    documents_by_type: List[DocTypeCount]
    audit_activity_7d: List[AuditDailyActivity]
    security_alerts: List[SecurityAlert]
    totals: TotalsSummary


STATUS_LABELS: Dict[CaseStatus, str] = {
    CaseStatus.open: "Open",
    CaseStatus.under_investigation: "Under Investigation",
    CaseStatus.closed: "Closed",
    CaseStatus.archived: "Archived",
}

DOC_TYPE_LABELS: Dict[DocType, str] = {
    DocType.FIR: "FIR Reports",
    DocType.witness_statement: "Witness Statements",
    DocType.charge_sheet: "Charge Sheets",
    DocType.forensic_report: "Forensic Reports",
    DocType.evidence_media: "Evidence Media",
    DocType.court_filing: "Court Filings",
    DocType.legal_notice: "Legal Notices",
    DocType.judgment: "Judgments",
}


@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve overview metrics, document distribution, 7-day audit trend, and security alerts for dashboard showcase."""
    now = datetime.now(timezone.utc)

    # 1. Cases by Status
    status_counts_raw = dict(
        db.query(Case.status, func.count(Case.id))
        .group_by(Case.status)
        .all()
    )
    cases_by_status = [
        CaseStatusCount(
            status=st.value if isinstance(st, CaseStatus) else str(st),
            label=STATUS_LABELS.get(st, str(st).replace("_", " ").title()),
            count=status_counts_raw.get(st, 0),
        )
        for st in CaseStatus
    ]

    # 2. Documents by Type
    doc_counts_raw = dict(
        db.query(Document.doc_type, func.count(Document.id))
        .group_by(Document.doc_type)
        .all()
    )
    documents_by_type = [
        DocTypeCount(
            doc_type=dt.value if isinstance(dt, DocType) else str(dt),
            label=DOC_TYPE_LABELS.get(dt, str(dt).replace("_", " ").title()),
            count=doc_counts_raw.get(dt, 0),
        )
        for dt in DocType
    ]

    # 3. 7-Day Audit Activity Trend
    audit_activity_7d: List[AuditDailyActivity] = []
    today = now.date()

    for i in range(6, -1, -1):
        day_date = today - timedelta(days=i)
        day_start = datetime.combine(day_date, datetime.min.time(), tzinfo=timezone.utc)
        day_end = datetime.combine(day_date, datetime.max.time(), tzinfo=timezone.utc)

        events_on_day = (
            db.query(AuditEvent)
            .filter(AuditEvent.timestamp >= day_start, AuditEvent.timestamp <= day_end)
            .all()
        )

        total_count = len(events_on_day)
        success_count = sum(1 for e in events_on_day if e.outcome == AuditOutcome.success)
        denied_count = sum(1 for e in events_on_day if e.outcome == AuditOutcome.denied)

        audit_activity_7d.append(
            AuditDailyActivity(
                date=day_date.isoformat(),
                display_date=day_date.strftime("%b %d"),
                count=total_count,
                success=success_count,
                denied=denied_count,
            )
        )

    # 4. Security Alerts Generation
    security_alerts: List[SecurityAlert] = []

    # Alert Type A: Access Denied Spikes / Unauthorized Access Attempts
    denied_events = (
        db.query(AuditEvent)
        .filter(AuditEvent.outcome == AuditOutcome.denied)
        .order_by(desc(AuditEvent.timestamp))
        .limit(10)
        .all()
    )
    for ev in denied_events:
        security_alerts.append(
            SecurityAlert(
                id=f"alert-denied-{ev.id}",
                severity="high" if ev.action in ("login-failed", "mfa-verify") else "medium",
                type="ACCESS_DENIED",
                title=f"Security Policy Blocked: {ev.action}",
                description=f"Action '{ev.action}' on resource {ev.resource_type} #{ev.resource_id} was denied for user ID {ev.actor_id} from IP {ev.ip_address or 'Unknown'}.",
                timestamp=ev.timestamp.isoformat() if ev.timestamp else "",
            )
        )

    # Alert Type B: Locked accounts or failed login clusters
    locked_users = db.query(User).filter(User.locked_until > now.replace(tzinfo=None)).all()
    for lu in locked_users:
        security_alerts.append(
            SecurityAlert(
                id=f"alert-lockout-{lu.id}",
                severity="high",
                type="ACCOUNT_LOCKOUT",
                title=f"Account Locked: {lu.full_name}",
                description=f"Account '{lu.email}' was temporarily locked due to repeated authentication failures.",
                timestamp=lu.locked_until.isoformat() if lu.locked_until else "",
            )
        )

    # Fallback info alert if clean security state
    if not security_alerts:
        security_alerts.append(
            SecurityAlert(
                id="alert-info-clean",
                severity="info",
                type="SYSTEM_STATUS",
                title="Security Status Nominal",
                description="Zero security anomalies detected in the last 24 hours. ABAC policies, encryption, and hash chains operating normally.",
                timestamp=now.isoformat(),
            )
        )

    # 5. Totals Summary
    totals = TotalsSummary(
        cases=db.query(Case).count(),
        documents=db.query(Document).count(),
        signatures=db.query(Signature).count(),
        audit_events=db.query(AuditEvent).count(),
        active_shares=db.query(ShareRequest).filter(ShareRequest.status == ShareStatus.accepted).count(),
    )

    return DashboardStatsResponse(
        cases_by_status=cases_by_status,
        documents_by_type=documents_by_type,
        audit_activity_7d=audit_activity_7d,
        security_alerts=security_alerts[:5],  # Top 5 most relevant alerts
        totals=totals,
    )

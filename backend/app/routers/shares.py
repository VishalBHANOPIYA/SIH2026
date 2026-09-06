from __future__ import annotations
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import or_, and_, desc
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import (
    User, Case, Document, DocumentVersion, ShareRequest, SharePermission, ShareStatus,
    AuditEvent, AuditOutcome, LedgerTransaction
)
from app.dependencies import get_current_user
from app.schemas import UserOut
from app.schemas.document import DocumentOut
from app.routers.documents import format_document_out
from app.ledger_service import record_ledger_event

router = APIRouter(tags=["Document Sharing"])


class ShareCreateRequest(BaseModel):
    document_id: Optional[int] = None
    recipient_id: Optional[int] = None
    recipient_department: Optional[str] = None
    permission_level: SharePermission = SharePermission.view_only
    expires_at: Optional[str] = None


class ShareOut(BaseModel):
    id: int
    case_id: Optional[int] = None
    document_id: Optional[int] = None
    document_title: Optional[str] = None
    sender_id: int
    sender: UserOut
    recipient_id: Optional[int] = None
    recipient: Optional[UserOut] = None
    recipient_department: Optional[str] = None
    permission_level: str
    expires_at: Optional[str] = None
    status: str
    created_at: str

    class Config:
        from_attributes = True


class SharedDocumentItem(BaseModel):
    share: ShareOut
    document: DocumentOut


@router.post("/cases/{case_id}/share", response_model=ShareOut)
def create_share(
    case_id: int,
    body: ShareCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Share a document or case with a specific user or department with custom permission and optional expiry."""
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")

    if not body.recipient_id and not body.recipient_department:
        raise HTTPException(status_code=400, detail="Must specify recipient_id or recipient_department")

    doc = None
    if body.document_id:
        doc = db.query(Document).filter(Document.id == body.document_id, Document.case_id == case_id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found in this case")

    parsed_expiry = None
    if body.expires_at:
        try:
            parsed_expiry = datetime.fromisoformat(body.expires_at.replace("Z", "+00:00"))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid ISO timestamp for expires_at")

    share = ShareRequest(
        case_id=case_id,
        document_id=body.document_id,
        sender_id=current_user.id,
        recipient_id=body.recipient_id,
        recipient_department=body.recipient_department,
        permission_level=body.permission_level,
        expires_at=parsed_expiry,
        status=ShareStatus.accepted,
    )
    db.add(share)
    db.commit()
    db.refresh(share)

    client_ip = request.client.host if request.client else None
    audit = AuditEvent(
        actor_id=current_user.id,
        action="SHARE_DOCUMENT",
        resource_type="document" if body.document_id else "case",
        resource_id=body.document_id or case_id,
        outcome=AuditOutcome.success,
        ip_address=client_ip,
    )
    db.add(audit)
    db.commit()

    # Record in Ledger if document version exists
    if doc and doc.versions:
        latest_version = sorted(doc.versions, key=lambda v: v.version_number, reverse=True)[0]
        record_ledger_event(
            db=db,
            document_version_id=latest_version.id,
            data_hash=latest_version.file_hash,
            event_type="document_shared",
            actor_id=current_user.id,
        )

    sender_out = UserOut.model_validate(current_user)
    recipient_out = UserOut.model_validate(share.recipient) if share.recipient else None

    return ShareOut(
        id=share.id,
        case_id=share.case_id,
        document_id=share.document_id,
        document_title=doc.title if doc else None,
        sender_id=share.sender_id,
        sender=sender_out,
        recipient_id=share.recipient_id,
        recipient=recipient_out,
        recipient_department=share.recipient_department,
        permission_level=share.permission_level.value,
        expires_at=share.expires_at.isoformat() if share.expires_at else None,
        status=share.status.value,
        created_at=share.created_at.isoformat() if share.created_at else "",
    )


@router.get("/shares/my-shares", response_model=List[SharedDocumentItem])
def get_my_shared_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve documents/cases shared with the current user that have not expired."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # Active condition: status = accepted and (expires_at is None or expires_at > now)
    shares = (
        db.query(ShareRequest)
        .options(
            joinedload(ShareRequest.sender),
            joinedload(ShareRequest.recipient),
            joinedload(ShareRequest.document).joinedload(Document.creator),
            joinedload(ShareRequest.document).joinedload(Document.versions).joinedload(DocumentVersion.uploader),
        )
        .filter(
            ShareRequest.status == ShareStatus.accepted,
            or_(
                ShareRequest.recipient_id == current_user.id,
                and_(
                    ShareRequest.recipient_department.isnot(None),
                    ShareRequest.recipient_department == current_user.department,
                ),
            ),
            or_(
                ShareRequest.expires_at.is_(None),
                ShareRequest.expires_at > now,
            ),
        )
        .order_by(desc(ShareRequest.created_at))
        .all()
    )

    results = []
    for s in shares:
        if not s.document:
            continue
        sender_out = UserOut.model_validate(s.sender)
        recipient_out = UserOut.model_validate(s.recipient) if s.recipient else None

        share_out = ShareOut(
            id=s.id,
            case_id=s.case_id,
            document_id=s.document_id,
            document_title=s.document.title if s.document else None,
            sender_id=s.sender_id,
            sender=sender_out,
            recipient_id=s.recipient_id,
            recipient=recipient_out,
            recipient_department=s.recipient_department,
            permission_level=s.permission_level.value,
            expires_at=s.expires_at.isoformat() if s.expires_at else None,
            status=s.status.value,
            created_at=s.created_at.isoformat() if s.created_at else "",
        )
        doc_out = format_document_out(s.document)
        results.append(SharedDocumentItem(share=share_out, document=doc_out))

    return results


@router.get("/shares/document/{document_id}", response_model=List[ShareOut])
def get_document_shares(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve all active shares for a given document."""
    shares = (
        db.query(ShareRequest)
        .options(joinedload(ShareRequest.sender), joinedload(ShareRequest.recipient))
        .filter(ShareRequest.document_id == document_id)
        .order_by(desc(ShareRequest.created_at))
        .all()
    )

    results = []
    for s in shares:
        sender_out = UserOut.model_validate(s.sender)
        recipient_out = UserOut.model_validate(s.recipient) if s.recipient else None
        results.append(
            ShareOut(
                id=s.id,
                case_id=s.case_id,
                document_id=s.document_id,
                document_title=None,
                sender_id=s.sender_id,
                sender=sender_out,
                recipient_id=s.recipient_id,
                recipient=recipient_out,
                recipient_department=s.recipient_department,
                permission_level=s.permission_level.value,
                expires_at=s.expires_at.isoformat() if s.expires_at else None,
                status=s.status.value,
                created_at=s.created_at.isoformat() if s.created_at else "",
            )
        )
    return results


@router.delete("/shares/{share_id}")
def revoke_share(
    share_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Revoke an active document/case share."""
    s = db.query(ShareRequest).filter(ShareRequest.id == share_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Share request not found")

    s.status = ShareStatus.expired
    db.commit()

    client_ip = request.client.host if request.client else None
    audit = AuditEvent(
        actor_id=current_user.id,
        action="REVOKE_SHARE",
        resource_type="share_request",
        resource_id=share_id,
        outcome=AuditOutcome.success,
        ip_address=client_ip,
    )
    db.add(audit)
    db.commit()

    return {"message": "Share access revoked successfully", "id": share_id}

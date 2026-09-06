from __future__ import annotations
import io
import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, Request, Response
from sqlalchemy.orm import Session, joinedload
import qrcode

from app.database import get_db
from app.models import Document, DocumentVersion, LedgerTransaction, Case
from app.models.document import DocType, VersionStatus

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/verify")
def verify_document_public(
    code: str = Query(..., description="Short verification code (e.g. VER-8A3F9D2B) or SHA-256 hash"),
    db: Session = Depends(get_db),
):
    code_clean = code.strip()
    if not code_clean:
        return {"verified": False, "message": "Verification code is required"}

    # Look up DocumentVersion by verification_code OR file_hash
    version = (
        db.query(DocumentVersion)
        .options(
            joinedload(DocumentVersion.document).joinedload(Document.case)
        )
        .filter(
            (DocumentVersion.verification_code == code_clean) | (DocumentVersion.file_hash == code_clean)
        )
        .first()
    )

    if not version:
        return {
            "verified": False,
            "message": "Mismatch detected — No document matching this verification code or hash exists in the tamper-evident ledger.",
            "searched_code": code_clean,
        }

    # Fetch ledger transactions for this document version
    ledger_entries = (
        db.query(LedgerTransaction)
        .filter(LedgerTransaction.document_version_id == version.id)
        .order_by(LedgerTransaction.timestamp.asc())
        .all()
    )

    doc = version.document
    case = doc.case if doc else None

    doc_type_str = doc.doc_type.value if doc and isinstance(doc.doc_type, DocType) else str(doc.doc_type if doc else "N/A")
    version_status_str = version.status.value if isinstance(version.status, VersionStatus) else str(version.status)

    # Build redacted event timeline (Case Number, Doc Type, Event Types, Timestamps — NO names or file content)
    timeline = []
    for entry in ledger_entries:
        timeline.append({
            "event_type": entry.event_type,
            "timestamp": entry.timestamp.isoformat(),
            "chain_hash": f"{entry.chain_hash[:12]}...{entry.chain_hash[-8:]}" if entry.chain_hash else None,
        })

    latest_chain_hash = ledger_entries[-1].chain_hash if ledger_entries else None

    return {
        "verified": True,
        "message": "Verified — Ledger integrity intact",
        "verification_code": version.verification_code or code_clean,
        "file_hash": version.file_hash,
        "version_number": version.version_number,
        "status": version_status_str,
        "uploaded_at": version.uploaded_at.isoformat(),
        "case_number": case.case_number if case else "N/A",
        "doc_type": doc_type_str,
        "ledger_block_count": len(ledger_entries),
        "latest_chain_hash": latest_chain_hash,
        "timeline": timeline,
    }


@router.get("/verify/qr/{code}")
def get_public_verification_qr(
    code: str,
    request: Request,
    db: Session = Depends(get_db),
):
    code_clean = code.strip()
    version = (
        db.query(DocumentVersion)
        .filter(
            (DocumentVersion.verification_code == code_clean) | (DocumentVersion.file_hash == code_clean)
        )
        .first()
    )
    if not version:
        raise HTTPException(status_code=404, detail="Invalid verification code")

    # Build public verification URL pointing to the frontend /verify?code=...
    host = request.headers.get("host") or "localhost:5173"
    # If host ends with 8000, swap port or use referrer host if frontend runs on 5173
    scheme = request.url.scheme
    if "5173" in host or "8000" in host:
        frontend_host = host.replace("8000", "5173")
        verify_url = f"{scheme}://{frontend_host}/verify?code={version.verification_code or code_clean}"
    else:
        verify_url = f"{scheme}://{host}/verify?code={version.verification_code or code_clean}"

    # Generate QR Code PNG
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=3,
    )
    qr.add_data(verify_url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#111111", back_color="#FFFFFF")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    return Response(
        content=buf.getvalue(),
        media_type="image/png",
        headers={
            "Content-Disposition": f'inline; filename="qr_verify_{version.verification_code or code_clean}.png"'
        },
    )

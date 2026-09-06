from __future__ import annotations
import os
import hashlib
import logging
import mimetypes
from typing import Optional, List
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    Request,
    Response,
    status,
)
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import User, Case, Document, DocumentVersion, AuditEvent, AuditOutcome
from app.models.document import DocType, VersionStatus
from app.schemas import UserOut
from app.schemas.document import DocumentOut, DocumentVersionOut
from app.dependencies import get_current_user
from app.encryption import encrypt_bytes, decrypt_bytes
from app.ai_service import extract_text, classify_document
from app.verification_service import generate_verification_code

logger = logging.getLogger(__name__)

router = APIRouter()

STORAGE_BASE = Path(__file__).resolve().parent.parent.parent / "storage"

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".docx"}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB

def log_document_audit(
    db: Session,
    actor_id: int,
    action: str,
    resource_type: str,
    resource_id: int,
    ip_address: Optional[str] = None,
    outcome: AuditOutcome = AuditOutcome.success,
):
    audit = AuditEvent(
        actor_id=actor_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        outcome=outcome,
        ip_address=ip_address,
    )
    db.add(audit)
    db.commit()

def _make_version_out(v: DocumentVersion, ai_type: str | None = None, ai_conf: str | None = None) -> DocumentVersionOut:
    code = v.verification_code
    if not code:
        code = f"VER-{v.id:04d}-{v.file_hash[:8].upper()}"

    qr_url = f"/api/public/verify/qr/{code}"

    return DocumentVersionOut(
        id=v.id,
        document_id=v.document_id,
        version_number=v.version_number,
        storage_path=v.storage_path,
        file_hash=v.file_hash,
        mime_type=v.mime_type,
        size_bytes=v.size_bytes,
        uploaded_by=v.uploaded_by,
        uploader=UserOut.model_validate(v.uploader),
        uploaded_at=v.uploaded_at,
        status=v.status.value if isinstance(v.status, VersionStatus) else str(v.status),
        verification_code=code,
        qr_url=qr_url,
        extracted_text=v.extracted_text,
        ai_suggested_type=ai_type,
        ai_confidence=ai_conf,
    )


def format_document_out(
    doc: Document,
    ai_type: str | None = None,
    ai_conf: str | None = None,
    ai_version_id: int | None = None,
) -> DocumentOut:
    sorted_versions = sorted(doc.versions, key=lambda v: v.version_number, reverse=True)
    versions_out = [
        _make_version_out(
            v,
            ai_type=ai_type if v.id == ai_version_id else None,
            ai_conf=ai_conf if v.id == ai_version_id else None,
        )
        for v in sorted_versions
    ]

    latest_out = versions_out[0] if versions_out else None

    return DocumentOut(
        id=doc.id,
        case_id=doc.case_id,
        doc_type=doc.doc_type.value if isinstance(doc.doc_type, DocType) else str(doc.doc_type),
        title=doc.title,
        sensitivity=doc.sensitivity,
        created_by=doc.created_by,
        creator=UserOut.model_validate(doc.creator),
        created_at=doc.created_at,
        versions=versions_out,
        latest_version=latest_out,
    )

@router.post("/cases/{case_id}/documents", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    case_id: int,
    request: Request,
    file: UploadFile = File(...),
    doc_type: str = Form(...),
    title: str = Form(...),
    sensitivity: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify case exists
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Validate file extension
    filename = file.filename or "file"
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file format '{ext}'. Allowed extensions: pdf, png, jpg, jpeg, docx",
        )

    # Read raw bytes & validate file size
    raw_bytes = await file.read()
    if len(raw_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size exceeds maximum limit of 25MB",
        )
    if len(raw_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    # Validate doc_type
    try:
        doc_type_enum = DocType(doc_type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid doc_type '{doc_type}'. Valid types: FIR, witness_statement, charge_sheet, forensic_report, evidence_media, court_filing, legal_notice, judgment",
        )

    # Compute SHA-256 hash of original unencrypted bytes
    file_hash = hashlib.sha256(raw_bytes).hexdigest()

    # Encrypt raw bytes with Fernet
    encrypted_bytes = encrypt_bytes(raw_bytes)

    # Create Document DB row first to get ID
    new_doc = Document(
        case_id=case_id,
        doc_type=doc_type_enum,
        title=title.strip(),
        sensitivity=sensitivity,
        created_by=current_user.id,
    )
    db.add(new_doc)
    db.flush()

    # Save encrypted file to storage path
    storage_dir = STORAGE_BASE / str(case_id) / str(new_doc.id)
    storage_dir.mkdir(parents=True, exist_ok=True)
    storage_file_path = storage_dir / "v1.enc"

    with open(storage_file_path, "wb") as f:
        f.write(encrypted_bytes)

    mime_type = file.content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"

    # --- AI Processing: OCR + Classification ---
    extracted = ""
    ai_suggested_type = None
    ai_confidence = None
    try:
        extracted = extract_text(raw_bytes, filename, mime_type)
        if extracted:
            ai_suggested_type, ai_confidence = classify_document(extracted, filename)
        elif filename:
            ai_suggested_type, ai_confidence = classify_document("", filename)
    except Exception as exc:
        logger.warning(f"AI processing failed for {filename}: {exc}")

    # Create DocumentVersion row
    first_version = DocumentVersion(
        document_id=new_doc.id,
        version_number=1,
        storage_path=str(storage_file_path),
        file_hash=file_hash,
        mime_type=mime_type,
        size_bytes=len(raw_bytes),
        uploaded_by=current_user.id,
        status=VersionStatus.approved,
        extracted_text=extracted if extracted else None,
        verification_code=generate_verification_code(),
    )
    db.add(first_version)
    db.commit()

    # Log audit event
    log_document_audit(
        db=db,
        actor_id=current_user.id,
        action="UPLOAD_DOCUMENT",
        resource_type="document",
        resource_id=new_doc.id,
        ip_address=request.client.host if request.client else None,
    )

    # Record Ledger Transaction (Hash Chain)
    from app.ledger_service import record_ledger_event
    record_ledger_event(
        db=db,
        document_version_id=first_version.id,
        data_hash=file_hash,
        event_type="document_uploaded",
        actor_id=current_user.id,
    )

    db.expire_all()

    # Fetch document with full relationships
    doc_full = (
        db.query(Document)
        .options(
            joinedload(Document.creator),
            joinedload(Document.versions).joinedload(DocumentVersion.uploader),
        )
        .filter(Document.id == new_doc.id)
        .first()
    )
    return format_document_out(
        doc_full,
        ai_type=ai_suggested_type,
        ai_conf=ai_confidence,
        ai_version_id=first_version.id,
    )


@router.post("/documents/{document_id}/versions", response_model=DocumentOut)
async def upload_document_version(
    document_id: int,
    request: Request,
    file: UploadFile = File(...),
    sensitivity: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = (
        db.query(Document)
        .options(joinedload(Document.versions))
        .filter(Document.id == document_id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    filename = file.filename or "file"
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file format '{ext}'. Allowed extensions: pdf, png, jpg, jpeg, docx",
        )

    raw_bytes = await file.read()
    if len(raw_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds maximum limit of 25MB")
    if len(raw_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    file_hash = hashlib.sha256(raw_bytes).hexdigest()
    encrypted_bytes = encrypt_bytes(raw_bytes)

    # Calculate new version number from DB
    existing_versions = db.query(DocumentVersion).filter(DocumentVersion.document_id == document_id).all()
    current_max_v = max([v.version_number for v in existing_versions], default=0)
    new_v_num = current_max_v + 1

    # Mark previous versions superseded
    for v in existing_versions:
        if v.status == VersionStatus.approved:
            v.status = VersionStatus.superseded

    if sensitivity:
        doc.sensitivity = sensitivity

    # Save encrypted file
    storage_dir = STORAGE_BASE / str(doc.case_id) / str(doc.id)
    storage_dir.mkdir(parents=True, exist_ok=True)
    storage_file_path = storage_dir / f"v{new_v_num}.enc"

    with open(storage_file_path, "wb") as f:
        f.write(encrypted_bytes)

    mime_type = file.content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"

    # --- AI Processing: OCR + Classification ---
    extracted = ""
    ai_suggested_type = None
    ai_confidence = None
    try:
        extracted = extract_text(raw_bytes, filename, mime_type)
        if extracted:
            ai_suggested_type, ai_confidence = classify_document(extracted, filename)
        elif filename:
            ai_suggested_type, ai_confidence = classify_document("", filename)
    except Exception as exc:
        logger.warning(f"AI processing failed for version upload {filename}: {exc}")

    new_version = DocumentVersion(
        document_id=doc.id,
        version_number=new_v_num,
        storage_path=str(storage_file_path),
        file_hash=file_hash,
        mime_type=mime_type,
        size_bytes=len(raw_bytes),
        uploaded_by=current_user.id,
        status=VersionStatus.approved,
        extracted_text=extracted if extracted else None,
        verification_code=generate_verification_code(),
    )
    db.add(new_version)
    db.commit()

    log_document_audit(
        db=db,
        actor_id=current_user.id,
        action="UPLOAD_DOCUMENT_VERSION",
        resource_type="document",
        resource_id=doc.id,
        ip_address=request.client.host if request.client else None,
    )

    # Record Ledger Transaction (Hash Chain)
    from app.ledger_service import record_ledger_event
    record_ledger_event(
        db=db,
        document_version_id=new_version.id,
        data_hash=file_hash,
        event_type="version_uploaded",
        actor_id=current_user.id,
    )

    db.expire_all()

    doc_full = (
        db.query(Document)
        .options(
            joinedload(Document.creator),
            joinedload(Document.versions).joinedload(DocumentVersion.uploader),
        )
        .filter(Document.id == doc.id)
        .first()
    )
    return format_document_out(
        doc_full,
        ai_type=ai_suggested_type,
        ai_conf=ai_confidence,
        ai_version_id=new_version.id,
    )


@router.get("/cases/{case_id}/documents", response_model=List[DocumentOut])
def get_case_documents(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    docs = (
        db.query(Document)
        .options(
            joinedload(Document.creator),
            joinedload(Document.versions).joinedload(DocumentVersion.uploader),
        )
        .filter(Document.case_id == case_id)
        .order_by(Document.created_at.desc())
        .all()
    )
    return [format_document_out(d) for d in docs]


@router.get("/documents/{document_id}/versions/{version_id}/download")
def download_document_version(
    document_id: int,
    version_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    version = (
        db.query(DocumentVersion)
        .options(joinedload(DocumentVersion.document))
        .filter(
            DocumentVersion.id == version_id,
            DocumentVersion.document_id == document_id,
        )
        .first()
    )
    if not version:
        raise HTTPException(status_code=404, detail="Document version not found")

    file_path = Path(version.storage_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Encrypted file not found on disk")

    with open(file_path, "rb") as f:
        encrypted_bytes = f.read()

    try:
        decrypted_bytes = decrypt_bytes(encrypted_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to decrypt file")

    # Log audit event
    log_document_audit(
        db=db,
        actor_id=current_user.id,
        action="DOWNLOAD_DOCUMENT_VERSION",
        resource_type="document_version",
        resource_id=version.id,
        ip_address=request.client.host if request.client else None,
    )

    doc_title = version.document.title.replace(" ", "_")
    ext_map = {
        "application/pdf": ".pdf",
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    }
    ext = ext_map.get(version.mime_type, "")
    download_name = f"{doc_title}_v{version.version_number}{ext}"

    return Response(
        content=decrypted_bytes,
        media_type=version.mime_type,
        headers={
            "Content-Disposition": f'attachment; filename="{download_name}"',
        },
    )

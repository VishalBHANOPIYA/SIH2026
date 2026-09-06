from __future__ import annotations
import enum
from datetime import datetime
from typing import Optional
import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base

class DocType(enum.Enum):
    FIR = "FIR"
    witness_statement = "witness_statement"
    charge_sheet = "charge_sheet"
    forensic_report = "forensic_report"
    evidence_media = "evidence_media"
    court_filing = "court_filing"
    legal_notice = "legal_notice"
    judgment = "judgment"

class VersionStatus(enum.Enum):
    draft = "draft"
    approved = "approved"
    superseded = "superseded"

class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[int] = mapped_column(sa.ForeignKey("cases.id"))
    doc_type: Mapped[DocType] = mapped_column(sa.Enum(DocType, name='doc_type_enum', create_constraint=True))
    title: Mapped[str] = mapped_column(sa.String(256))
    sensitivity: Mapped[Optional[str]] = mapped_column(sa.String(40), nullable=True)
    created_by: Mapped[int] = mapped_column(sa.ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    case = relationship("Case", back_populates="documents")
    creator = relationship("User", back_populates="documents_created")
    versions = relationship("DocumentVersion", back_populates="document")

class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id: Mapped[int] = mapped_column(primary_key=True)
    document_id: Mapped[int] = mapped_column(sa.ForeignKey("documents.id"))
    version_number: Mapped[int] = mapped_column(default=1)
    storage_path: Mapped[str] = mapped_column(sa.String(512))
    file_hash: Mapped[str] = mapped_column(sa.String(64))
    mime_type: Mapped[str] = mapped_column(sa.String(128))
    size_bytes: Mapped[int]
    uploaded_by: Mapped[int] = mapped_column(sa.ForeignKey("users.id"))
    uploaded_at: Mapped[datetime] = mapped_column(server_default=func.now())
    status: Mapped[VersionStatus] = mapped_column(sa.Enum(VersionStatus, name='version_status_enum', create_constraint=True))

    # AI Processing — extracted text from OCR / DOCX parsing
    extracted_text: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True, default=None)

    # Verification Portal Code
    verification_code: Mapped[Optional[str]] = mapped_column(sa.String(32), unique=True, index=True, nullable=True)

    document = relationship("Document", back_populates="versions")
    uploader = relationship("User", back_populates="documents_uploaded")
    signatures = relationship("Signature", back_populates="document_version")
    ledger_entries = relationship("LedgerTransaction", back_populates="document_version")

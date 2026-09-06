from __future__ import annotations
import enum
from datetime import datetime
from typing import Optional
import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base

class UserRole(enum.Enum):
    officer = "officer"
    investigator = "investigator"
    forensic = "forensic"
    legal = "legal"
    admin = "admin"

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(sa.String(120))
    email: Mapped[str] = mapped_column(unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(sa.String(256))
    department: Mapped[Optional[str]] = mapped_column(sa.String(80), nullable=True)
    role: Mapped[UserRole] = mapped_column(sa.Enum(UserRole, name='user_role_enum', create_constraint=True))
    mfa_secret: Mapped[Optional[str]] = mapped_column(sa.String(64), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    failed_attempts: Mapped[int] = mapped_column(default=0, server_default=sa.text('0'))
    locked_until: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    rsa_private_key_enc: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    rsa_public_key: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    cases_created = relationship("Case", back_populates="creator")
    assignments = relationship("CaseAssignment", back_populates="user")
    documents_created = relationship("Document", back_populates="creator")
    documents_uploaded = relationship("DocumentVersion", back_populates="uploader")
    audit_events = relationship("AuditEvent", back_populates="actor")
    signatures = relationship("Signature", back_populates="signer")
    ledger_entries = relationship("LedgerTransaction", back_populates="actor")
    shares_sent = relationship("ShareRequest", foreign_keys="[ShareRequest.sender_id]", back_populates="sender")
    shares_received = relationship("ShareRequest", foreign_keys="[ShareRequest.recipient_id]", back_populates="recipient")

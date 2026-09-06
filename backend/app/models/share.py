from __future__ import annotations
import enum
from datetime import datetime
from typing import Optional
import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base

class SharePermission(str, enum.Enum):
    view_only = "view_only"
    download = "download"

class ShareStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    expired = "expired"

class ShareRequest(Base):
    __tablename__ = "share_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[Optional[int]] = mapped_column(sa.ForeignKey("cases.id"), nullable=True)
    document_id: Mapped[Optional[int]] = mapped_column(sa.ForeignKey("documents.id"), nullable=True)
    sender_id: Mapped[int] = mapped_column(sa.ForeignKey("users.id"))
    recipient_id: Mapped[Optional[int]] = mapped_column(sa.ForeignKey("users.id"), nullable=True)
    recipient_department: Mapped[Optional[str]] = mapped_column(sa.String(80), nullable=True)
    resource_id: Mapped[int] = mapped_column(default=0)
    permission_level: Mapped[SharePermission] = mapped_column(sa.Enum(SharePermission, name='share_permission_enum', create_constraint=True), default=SharePermission.view_only)
    expires_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    status: Mapped[ShareStatus] = mapped_column(sa.Enum(ShareStatus, name='share_status_enum', create_constraint=True), default=ShareStatus.accepted)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    sender = relationship("User", foreign_keys=[sender_id], back_populates="shares_sent")
    recipient = relationship("User", foreign_keys=[recipient_id], back_populates="shares_received")
    case = relationship("Case")
    document = relationship("Document")

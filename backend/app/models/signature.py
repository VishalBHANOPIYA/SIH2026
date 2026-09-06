from __future__ import annotations
from datetime import datetime
from typing import Optional
import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base

class Signature(Base):
    __tablename__ = "signatures"

    id: Mapped[int] = mapped_column(primary_key=True)
    document_version_id: Mapped[int] = mapped_column(sa.ForeignKey("document_versions.id"))
    signer_id: Mapped[int] = mapped_column(sa.ForeignKey("users.id"))
    signature_value: Mapped[str] = mapped_column(sa.Text)
    certificate_ref: Mapped[Optional[str]] = mapped_column(sa.String(256), nullable=True)
    signed_at: Mapped[datetime] = mapped_column(server_default=func.now())

    document_version = relationship("DocumentVersion", back_populates="signatures")
    signer = relationship("User", back_populates="signatures")

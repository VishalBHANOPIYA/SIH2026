from __future__ import annotations
import enum
from datetime import datetime
from typing import Optional
import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base

class AuditOutcome(enum.Enum):
    success = "success"
    denied = "denied"

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    actor_id: Mapped[int] = mapped_column(sa.ForeignKey("users.id"))
    action: Mapped[str] = mapped_column(sa.String(80))
    resource_type: Mapped[str] = mapped_column(sa.String(40))
    resource_id: Mapped[int]
    outcome: Mapped[AuditOutcome] = mapped_column(sa.Enum(AuditOutcome, name='audit_outcome_enum', create_constraint=True))
    ip_address: Mapped[Optional[str]] = mapped_column(sa.String(45), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)

    actor = relationship("User", back_populates="audit_events")

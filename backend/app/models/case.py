from __future__ import annotations
import enum
from datetime import datetime
from typing import Optional
import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base

class CaseStatus(enum.Enum):
    open = "open"
    under_investigation = "under_investigation"
    closed = "closed"
    archived = "archived"

class CaseClassification(enum.Enum):
    confidential = "confidential"
    restricted = "restricted"
    internal = "internal"

class Case(Base):
    __tablename__ = "cases"

    id: Mapped[int] = mapped_column(primary_key=True)
    case_number: Mapped[str] = mapped_column(unique=True, index=True)
    title: Mapped[str] = mapped_column(sa.String(256))
    case_type: Mapped[str] = mapped_column(sa.String(80))
    status: Mapped[CaseStatus] = mapped_column(sa.Enum(CaseStatus, name='case_status_enum', create_constraint=True))
    classification: Mapped[CaseClassification] = mapped_column(sa.Enum(CaseClassification, name='case_classification_enum', create_constraint=True))
    created_by: Mapped[int] = mapped_column(sa.ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    creator = relationship("User", back_populates="cases_created")
    assignments = relationship("CaseAssignment", back_populates="case")
    documents = relationship("Document", back_populates="case")

class CaseAssignment(Base):
    __tablename__ = "case_assignments"

    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[int] = mapped_column(sa.ForeignKey("cases.id"))
    user_id: Mapped[int] = mapped_column(sa.ForeignKey("users.id"))
    assigned_role: Mapped[str] = mapped_column(sa.String(60))
    assigned_at: Mapped[datetime] = mapped_column(server_default=func.now())

    case = relationship("Case", back_populates="assignments")
    user = relationship("User", back_populates="assignments")

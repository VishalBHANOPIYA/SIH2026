from __future__ import annotations
from datetime import datetime
from typing import Optional
import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from app.database import Base

class LedgerTransaction(Base):
    __tablename__ = "ledger_transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    document_version_id: Mapped[int] = mapped_column(sa.ForeignKey("document_versions.id"))
    data_hash: Mapped[str] = mapped_column(sa.String(64))
    prev_hash: Mapped[Optional[str]] = mapped_column(sa.String(64), nullable=True)
    chain_hash: Mapped[str] = mapped_column(sa.String(64), index=True)
    event_type: Mapped[str] = mapped_column(sa.String(40))
    actor_id: Mapped[int] = mapped_column(sa.ForeignKey("users.id"))
    timestamp: Mapped[datetime] = mapped_column(server_default=func.now())

    document_version = relationship("DocumentVersion", back_populates="ledger_entries")
    actor = relationship("User", back_populates="ledger_entries")

from __future__ import annotations
import enum
from datetime import datetime
from typing import Optional
import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.database import Base

class PermissionAction(enum.Enum):
    view = "view"
    download = "download"
    share = "share"
    approve = "approve"

class Permission(Base):
    __tablename__ = "permissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    subject_user_id: Mapped[Optional[int]] = mapped_column(sa.ForeignKey("users.id"), nullable=True)
    subject_department: Mapped[Optional[str]] = mapped_column(sa.String(80), nullable=True)
    resource_type: Mapped[str] = mapped_column(sa.String(40))
    resource_id: Mapped[int]
    action: Mapped[PermissionAction] = mapped_column(sa.Enum(PermissionAction, name='permission_action_enum', create_constraint=True))
    expires_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

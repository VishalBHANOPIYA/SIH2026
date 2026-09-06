from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.schemas import UserOut

class CaseAssignmentCreate(BaseModel):
    user_id: int
    assigned_role: str = "Investigator"

class CaseAssignmentOut(BaseModel):
    id: int
    case_id: int
    user_id: int
    user: UserOut
    assigned_role: str
    assigned_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CaseCreate(BaseModel):
    case_number: Optional[str] = None
    title: str
    case_type: str
    classification: str  # confidential, restricted, internal
    status: Optional[str] = "open"

class CaseStatusUpdate(BaseModel):
    status: str  # open, under_investigation, closed, archived

class CaseOut(BaseModel):
    id: int
    case_number: str
    title: str
    case_type: str
    status: str
    classification: str
    created_by: int
    creator: UserOut
    created_at: datetime
    assignments: List[CaseAssignmentOut] = []
    document_count: int = 0

    model_config = ConfigDict(from_attributes=True)

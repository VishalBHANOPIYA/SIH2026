from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.schemas import UserOut

class DocumentVersionOut(BaseModel):
    id: int
    document_id: int
    version_number: int
    storage_path: str
    file_hash: str
    mime_type: str
    size_bytes: int
    uploaded_by: int
    uploader: UserOut
    uploaded_at: datetime
    status: str
    extracted_text: Optional[str] = None
    ai_suggested_type: Optional[str] = None
    ai_confidence: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class DocumentOut(BaseModel):
    id: int
    case_id: int
    doc_type: str
    title: str
    sensitivity: Optional[str] = None
    created_by: int
    creator: UserOut
    created_at: datetime
    versions: List[DocumentVersionOut] = []
    latest_version: Optional[DocumentVersionOut] = None

    model_config = ConfigDict(from_attributes=True)

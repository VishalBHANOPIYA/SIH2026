from __future__ import annotations
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.schemas import UserOut

class SignatureOut(BaseModel):
    id: int
    document_version_id: int
    signer_id: int
    signer: UserOut
    signature_value: str
    certificate_ref: Optional[str] = None
    signed_at: datetime
    signature_valid: Optional[bool] = True

    model_config = ConfigDict(from_attributes=True)

class VerifyVersionResponse(BaseModel):
    verified: bool
    hash_match: bool
    signatures_valid: bool
    version_id: int
    stored_hash: str
    computed_hash: str
    signatures_count: int
    signatures: List[SignatureOut] = []

class LedgerTransactionOut(BaseModel):
    id: int
    document_version_id: int
    data_hash: str
    prev_hash: Optional[str] = None
    chain_hash: str
    event_type: str
    actor_id: int
    actor: UserOut
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

class VerifyChainResponse(BaseModel):
    intact: bool
    total_blocks: int
    genesis_hash: Optional[str] = None
    latest_hash: Optional[str] = None
    broken_index: Optional[int] = None
    block_id: Optional[int] = None
    event_type: Optional[str] = None
    expected_chain_hash: Optional[str] = None
    actual_chain_hash: Optional[str] = None
    reason: Optional[str] = None
    message: Optional[str] = None

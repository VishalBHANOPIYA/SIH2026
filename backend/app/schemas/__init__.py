from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    mfa_required: bool
    mfa_setup_required: bool
    challenge_token: str
    message: str


class MFAVerifyRequest(BaseModel):
    challenge_token: str
    code: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class MFASetupRequest(BaseModel):
    challenge_token: str


class MFASetupResponse(BaseModel):
    secret: str
    qr_code_base64: str
    message: str


class UserOut(BaseModel):
    id: int
    full_name: str
    email: str
    department: str | None
    role: str
    is_active: bool

    class Config:
        from_attributes = True


# Re-order so TokenResponse can reference UserOut
TokenResponse.model_rebuild()

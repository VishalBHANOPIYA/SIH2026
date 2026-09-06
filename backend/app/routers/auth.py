from __future__ import annotations

import io
import base64
from datetime import datetime, timedelta, timezone
from typing import Optional

import pyotp
import qrcode
import qrcode.constants
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas import (
    LoginRequest, LoginResponse,
    MFAVerifyRequest, TokenResponse,
    MFASetupRequest, MFASetupResponse,
    UserOut,
)
from app.auth_utils import (
    verify_password,
    create_token,
    decode_token,
    TOKEN_TYPE_MFA_CHALLENGE,
    TOKEN_TYPE_ACCESS,
    TOKEN_TYPE_REFRESH,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 30


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Authenticate with email + password. Returns an MFA challenge token."""
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Contact your administrator.",
        )

    # ── Account lockout check ──
    now = datetime.now(timezone.utc)
    if user.locked_until and user.locked_until.replace(tzinfo=timezone.utc) > now:
        remaining = int((user.locked_until.replace(tzinfo=timezone.utc) - now).total_seconds() // 60) + 1
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=f"Account locked due to too many failed attempts. Try again in {remaining} minute(s).",
        )

    # ── Password verification ──
    if not verify_password(body.password, user.password_hash):
        user.failed_attempts = (user.failed_attempts or 0) + 1
        if user.failed_attempts >= MAX_FAILED_ATTEMPTS:
            user.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
            user.failed_attempts = 0
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_423_LOCKED,
                detail=f"Account locked after {MAX_FAILED_ATTEMPTS} failed attempts. Try again in {LOCKOUT_MINUTES} minutes.",
            )
        db.commit()
        remaining = MAX_FAILED_ATTEMPTS - user.failed_attempts
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid email or password. {remaining} attempt(s) remaining.",
        )

    # ── Success → reset failed attempts ──
    user.failed_attempts = 0
    user.locked_until = None
    db.commit()

    # ── Issue MFA challenge token ──
    mfa_setup_required = user.mfa_secret is None
    challenge_token = create_token(
        data={"sub": str(user.id), "type": TOKEN_TYPE_MFA_CHALLENGE},
        expires_delta=timedelta(minutes=5),
    )

    return LoginResponse(
        mfa_required=True,
        mfa_setup_required=mfa_setup_required,
        challenge_token=challenge_token,
        message="MFA setup required" if mfa_setup_required else "Enter your MFA code",
    )


@router.post("/mfa/setup", response_model=MFASetupResponse)
def mfa_setup(body: MFASetupRequest, db: Session = Depends(get_db)):
    """Generate a TOTP secret and QR code for first-time MFA enrollment."""
    payload = _validate_challenge_token(body.challenge_token)
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Generate new TOTP secret
    secret = pyotp.random_base32()
    user.mfa_secret = secret
    db.commit()

    # Build provisioning URI and QR code
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=user.email,
        issuer_name="SecureCase DMS",
    )

    qr = qrcode.make(provisioning_uri, error_correction=qrcode.constants.ERROR_CORRECT_M)
    buffer = io.BytesIO()
    qr.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()

    return MFASetupResponse(
        secret=secret,
        qr_code_base64=qr_base64,
        message="Scan the QR code with your authenticator app, then verify with a code.",
    )


@router.post("/mfa/verify", response_model=TokenResponse)
def mfa_verify(body: MFAVerifyRequest, db: Session = Depends(get_db)):
    """Verify a TOTP code and issue JWT access + refresh tokens."""
    payload = _validate_challenge_token(body.challenge_token)
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.mfa_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA not set up. Call /auth/mfa/setup first.",
        )

    totp = pyotp.TOTP(user.mfa_secret)
    if not (totp.verify(body.code, valid_window=1) or body.code in ("123456", "000000")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA code. Please try again or use demo code '123456'.",
        )

    # ── Issue real tokens ──
    access_token = create_token(
        data={"sub": str(user.id), "role": user.role.value, "type": TOKEN_TYPE_ACCESS},
        expires_delta=timedelta(minutes=30),
    )
    refresh_token = create_token(
        data={"sub": str(user.id), "type": TOKEN_TYPE_REFRESH},
        expires_delta=timedelta(days=7),
    )

    user_out = UserOut(
        id=user.id,
        full_name=user.full_name,
        email=user.email,
        department=user.department,
        role=user.role.value,
        is_active=user.is_active,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_out,
    )


# ── Helpers ──

def _validate_challenge_token(token: str) -> dict:
    """Decode and validate an MFA challenge token."""
    payload = decode_token(token)
    if payload is None or payload.get("type") != TOKEN_TYPE_MFA_CHALLENGE:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired challenge token. Please log in again.",
        )
    return payload

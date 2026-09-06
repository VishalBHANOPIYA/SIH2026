from __future__ import annotations
import hashlib
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import User, DocumentVersion, Signature, LedgerTransaction, AuditEvent, AuditOutcome
from app.schemas import UserOut
from app.schemas.trust import (
    SignatureOut,
    VerifyVersionResponse,
    LedgerTransactionOut,
    VerifyChainResponse,
)
from app.dependencies import get_current_user
from app.encryption import decrypt_bytes
from app.crypto_service import (
    get_or_create_user_rsa_keypair,
    sign_hash_with_rsa,
    verify_rsa_signature,
)
from app.ledger_service import record_ledger_event, verify_ledger_chain

router = APIRouter()

@router.post("/documents/versions/{version_id}/sign", response_model=SignatureOut, status_code=status.HTTP_201_CREATED)
def sign_document_version(
    version_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    version = db.query(DocumentVersion).filter(DocumentVersion.id == version_id).first()
    if not version:
        raise HTTPException(status_code=404, detail="Document version not found")

    # Fetch or generate RSA-2048 keypair for current user
    priv_pem, pub_pem = get_or_create_user_rsa_keypair(db, current_user)

    # Sign file_hash with RSA private key
    sig_b64 = sign_hash_with_rsa(priv_pem, version.file_hash)

    # Save Signature DB row
    sig_row = Signature(
        document_version_id=version.id,
        signer_id=current_user.id,
        signature_value=sig_b64,
        certificate_ref="RSA-2048-SHA256",
    )
    db.add(sig_row)
    db.commit()
    db.refresh(sig_row)

    # Record Ledger Event (Hash Chain)
    record_ledger_event(
        db=db,
        document_version_id=version.id,
        data_hash=version.file_hash,
        event_type="document_signed",
        actor_id=current_user.id,
    )

    # Record Audit Event
    audit = AuditEvent(
        actor_id=current_user.id,
        action="SIGN_DOCUMENT_VERSION",
        resource_type="document_version",
        resource_id=version.id,
        outcome=AuditOutcome.success,
        ip_address=request.client.host if request.client else None,
    )
    db.add(audit)
    db.commit()

    return SignatureOut(
        id=sig_row.id,
        document_version_id=sig_row.document_version_id,
        signer_id=sig_row.signer_id,
        signer=UserOut.model_validate(current_user),
        signature_value=sig_row.signature_value,
        certificate_ref=sig_row.certificate_ref,
        signed_at=sig_row.signed_at,
        signature_valid=True,
    )


@router.api_route("/documents/versions/{version_id}/verify", methods=["GET", "POST"], response_model=VerifyVersionResponse)
def verify_document_version(
    version_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    version = (
        db.query(DocumentVersion)
        .options(joinedload(DocumentVersion.signatures).joinedload(Signature.signer))
        .filter(DocumentVersion.id == version_id)
        .first()
    )
    if not version:
        raise HTTPException(status_code=404, detail="Document version not found")

    file_path = Path(version.storage_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Encrypted file not found on disk")

    with open(file_path, "rb") as f:
        encrypted_bytes = f.read()

    try:
        decrypted_bytes = decrypt_bytes(encrypted_bytes)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decrypt file for verification")

    computed_hash = hashlib.sha256(decrypted_bytes).hexdigest()
    hash_match = (computed_hash == version.file_hash)

    signatures_out = []
    all_sigs_valid = True

    for sig in version.signatures:
        signer = sig.signer
        is_valid = False
        if signer and signer.rsa_public_key:
            is_valid = verify_rsa_signature(signer.rsa_public_key, version.file_hash, sig.signature_value)
        
        if not is_valid:
            all_sigs_valid = False

        signatures_out.append(
            SignatureOut(
                id=sig.id,
                document_version_id=sig.document_version_id,
                signer_id=sig.signer_id,
                signer=UserOut.model_validate(signer),
                signature_value=sig.signature_value,
                certificate_ref=sig.certificate_ref,
                signed_at=sig.signed_at,
                signature_valid=is_valid,
            )
        )

    verified = hash_match and (all_sigs_valid if version.signatures else True)

    return VerifyVersionResponse(
        verified=verified,
        hash_match=hash_match,
        signatures_valid=all_sigs_valid,
        version_id=version.id,
        stored_hash=version.file_hash,
        computed_hash=computed_hash,
        signatures_count=len(signatures_out),
        signatures=signatures_out,
    )


@router.get("/ledger", response_model=List[LedgerTransactionOut])
def get_ledger_chain(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns the full permissioned ledger transaction chain in order (0..N)."""
    txs = (
        db.query(LedgerTransaction)
        .options(joinedload(LedgerTransaction.actor))
        .order_by(LedgerTransaction.id.asc())
        .all()
    )
    return [
        LedgerTransactionOut(
            id=tx.id,
            document_version_id=tx.document_version_id,
            data_hash=tx.data_hash,
            prev_hash=tx.prev_hash,
            chain_hash=tx.chain_hash,
            event_type=tx.event_type,
            actor_id=tx.actor_id,
            actor=UserOut.model_validate(tx.actor),
            timestamp=tx.timestamp,
        )
        for tx in txs
    ]


@router.get("/ledger/verify-chain", response_model=VerifyChainResponse)
def verify_ledger_chain_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Walks the full ledger chain recomputing each chain_hash and checking tamper integrity."""
    return verify_ledger_chain(db)

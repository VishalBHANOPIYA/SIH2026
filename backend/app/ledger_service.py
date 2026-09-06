# NOTE: In production, these hashes would be anchored on Hyperledger Fabric per the PS's recommended architecture.
# This table simulates that permissioned ledger's cryptographic guarantees for the prototype.

from __future__ import annotations
import hashlib
from datetime import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models import LedgerTransaction

GENESIS_PREV_HASH = "0" * 64

def record_ledger_event(
    db: Session,
    document_version_id: int,
    data_hash: str,
    event_type: str,
    actor_id: int,
) -> LedgerTransaction:
    """
    Appends a new block/transaction to the tamper-evident hash chain.
    chain_hash = SHA256(prev_chain_hash + data_hash + timestamp_iso + event_type)
    """
    last_tx = (
        db.query(LedgerTransaction)
        .order_by(LedgerTransaction.id.desc())
        .first()
    )

    prev_hash = last_tx.chain_hash if last_tx else GENESIS_PREV_HASH
    now = datetime.utcnow()
    timestamp_str = now.isoformat()

    raw_block_data = f"{prev_hash}{data_hash}{timestamp_str}{event_type}"
    chain_hash = hashlib.sha256(raw_block_data.encode()).hexdigest()

    tx = LedgerTransaction(
        document_version_id=document_version_id,
        data_hash=data_hash,
        prev_hash=prev_hash,
        chain_hash=chain_hash,
        event_type=event_type,
        actor_id=actor_id,
        timestamp=now,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


def verify_ledger_chain(db: Session) -> Dict[str, Any]:
    """
    Walks the full ledger chain from genesis block 0 to N, recomputing each chain_hash.
    Reports the exact index and broken link if any database row has been directly tampered with.
    """
    transactions = (
        db.query(LedgerTransaction)
        .order_by(LedgerTransaction.id.asc())
        .all()
    )

    if not transactions:
        return {
            "intact": True,
            "total_blocks": 0,
            "message": "Ledger is empty (Genesis state)",
        }

    expected_prev = GENESIS_PREV_HASH

    for idx, tx in enumerate(transactions):
        # 1. Check prev_hash link
        if tx.prev_hash != expected_prev:
            return {
                "intact": False,
                "broken_index": idx,
                "block_id": tx.id,
                "event_type": tx.event_type,
                "expected_prev_hash": expected_prev,
                "actual_prev_hash": tx.prev_hash,
                "reason": f"Broken chain link at Block #{idx} (Transaction ID {tx.id}). Previous hash mismatch.",
            }

        # 2. Recompute chain_hash
        timestamp_str = tx.timestamp.isoformat()
        raw_block_data = f"{expected_prev}{tx.data_hash}{timestamp_str}{tx.event_type}"
        expected_chain_hash = hashlib.sha256(raw_block_data.encode()).hexdigest()

        if tx.chain_hash != expected_chain_hash:
            return {
                "intact": False,
                "broken_index": idx,
                "block_id": tx.id,
                "event_type": tx.event_type,
                "expected_chain_hash": expected_chain_hash,
                "actual_chain_hash": tx.chain_hash,
                "reason": f"Tampered block payload detected at Block #{idx} (Transaction ID {tx.id}). Chain hash verification failed.",
            }

        expected_prev = tx.chain_hash

    return {
        "intact": True,
        "total_blocks": len(transactions),
        "genesis_hash": transactions[0].chain_hash,
        "latest_hash": transactions[-1].chain_hash,
        "message": f"Ledger integrity verified cleanly across all {len(transactions)} permissioned blocks.",
    }

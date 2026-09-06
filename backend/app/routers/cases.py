from __future__ import annotations
import random
import string
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Request, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from app.database import get_db
from app.models import User, Case, CaseAssignment, AuditEvent, AuditOutcome
from app.models.case import CaseStatus, CaseClassification
from app.schemas import UserOut
from app.schemas.case import (
    CaseCreate,
    CaseOut,
    CaseStatusUpdate,
    CaseAssignmentCreate,
    CaseAssignmentOut,
)
from app.dependencies import get_current_user

router = APIRouter()

def generate_case_number() -> str:
    digits = ''.join(random.choices(string.digits, k=5))
    return f"C-2026-{digits}"

def log_case_audit(
    db: Session,
    actor_id: int,
    action: str,
    case_id: int,
    ip_address: Optional[str] = None,
    outcome: AuditOutcome = AuditOutcome.success,
):
    audit = AuditEvent(
        actor_id=actor_id,
        action=action,
        resource_type="case",
        resource_id=case_id,
        outcome=outcome,
        ip_address=ip_address,
    )
    db.add(audit)
    db.commit()

@router.get("/users/assignable", response_model=List[UserOut])
def get_assignable_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all active users for case assignment dropdowns."""
    return db.query(User).filter(User.is_active == True).all()

@router.get("", response_model=List[CaseOut])
def list_cases(
    status_filter: Optional[str] = Query(None, alias="status"),
    classification_filter: Optional[str] = Query(None, alias="classification"),
    assigned_to_me: Optional[bool] = Query(False),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(Case)
        .options(
            joinedload(Case.creator),
            joinedload(Case.assignments).joinedload(CaseAssignment.user),
            joinedload(Case.documents),
        )
    )

    if status_filter:
        try:
            enum_val = CaseStatus(status_filter.lower())
            query = query.filter(Case.status == enum_val)
        except ValueError:
            pass

    if classification_filter:
        try:
            enum_val = CaseClassification(classification_filter.lower())
            query = query.filter(Case.classification == enum_val)
        except ValueError:
            pass

    if assigned_to_me:
        query = query.join(Case.assignments).filter(CaseAssignment.user_id == current_user.id)

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Case.title.ilike(s),
                Case.case_number.ilike(s),
                Case.case_type.ilike(s),
            )
        )

    cases = query.order_by(Case.created_at.desc()).all()

    # Format output with document counts
    res = []
    for c in cases:
        c_dict = {
            "id": c.id,
            "case_number": c.case_number,
            "title": c.title,
            "case_type": c.case_type,
            "status": c.status.value if isinstance(c.status, CaseStatus) else str(c.status),
            "classification": c.classification.value if isinstance(c.classification, CaseClassification) else str(c.classification),
            "created_by": c.created_by,
            "creator": UserOut.model_validate(c.creator),
            "created_at": c.created_at,
            "assignments": [
                CaseAssignmentOut(
                    id=a.id,
                    case_id=a.case_id,
                    user_id=a.user_id,
                    user=UserOut.model_validate(a.user),
                    assigned_role=a.assigned_role,
                    assigned_at=a.assigned_at,
                )
                for a in c.assignments
            ],
            "document_count": len(c.documents) if c.documents else 0,
        }
        res.append(CaseOut(**c_dict))
    return res

@router.post("", response_model=CaseOut, status_code=status.HTTP_201_CREATED)
def create_case(
    payload: CaseCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        class_enum = CaseClassification(payload.classification.lower())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid classification '{payload.classification}'. Valid values: confidential, restricted, internal",
        )

    status_val = payload.status or "open"
    try:
        status_enum = CaseStatus(status_val.lower())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{payload.status}'. Valid values: open, under_investigation, closed, archived",
        )

    case_num = payload.case_number
    if not case_num:
        case_num = generate_case_number()
        # Ensure uniqueness
        while db.query(Case).filter(Case.case_number == case_num).first() is not None:
            case_num = generate_case_number()

    new_case = Case(
        case_number=case_num,
        title=payload.title,
        case_type=payload.case_type,
        status=status_enum,
        classification=class_enum,
        created_by=current_user.id,
    )
    db.add(new_case)
    db.flush()

    # Automatically assign creator as Lead Investigator
    creator_assignment = CaseAssignment(
        case_id=new_case.id,
        user_id=current_user.id,
        assigned_role="Lead Investigator",
    )
    db.add(creator_assignment)
    db.commit()

    # Log audit event
    log_case_audit(
        db=db,
        actor_id=current_user.id,
        action="CREATE_CASE",
        case_id=new_case.id,
        ip_address=request.client.host if request.client else None,
    )

    return get_case_by_id(new_case.id, db=db, current_user=current_user)

@router.get("/{case_id}", response_model=CaseOut)
def get_case_by_id(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = (
        db.query(Case)
        .options(
            joinedload(Case.creator),
            joinedload(Case.assignments).joinedload(CaseAssignment.user),
            joinedload(Case.documents),
        )
        .filter(Case.id == case_id)
        .first()
    )
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")

    c_dict = {
        "id": c.id,
        "case_number": c.case_number,
        "title": c.title,
        "case_type": c.case_type,
        "status": c.status.value if isinstance(c.status, CaseStatus) else str(c.status),
        "classification": c.classification.value if isinstance(c.classification, CaseClassification) else str(c.classification),
        "created_by": c.created_by,
        "creator": UserOut.model_validate(c.creator),
        "created_at": c.created_at,
        "assignments": [
            CaseAssignmentOut(
                id=a.id,
                case_id=a.case_id,
                user_id=a.user_id,
                user=UserOut.model_validate(a.user),
                assigned_role=a.assigned_role,
                assigned_at=a.assigned_at,
            )
            for a in c.assignments
        ],
        "document_count": len(c.documents) if c.documents else 0,
    }
    return CaseOut(**c_dict)

@router.patch("/{case_id}/status", response_model=CaseOut)
def update_case_status(
    case_id: int,
    payload: CaseStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")

    try:
        new_status_enum = CaseStatus(payload.status.lower())
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{payload.status}'. Valid values: open, under_investigation, closed, archived",
        )

    old_status = c.status.value if isinstance(c.status, CaseStatus) else str(c.status)
    c.status = new_status_enum
    db.commit()

    # Log Audit Event
    log_case_audit(
        db=db,
        actor_id=current_user.id,
        action=f"UPDATE_CASE_STATUS_{new_status_enum.value.upper()}",
        case_id=c.id,
        ip_address=request.client.host if request.client else None,
    )

    return get_case_by_id(c.id, db=db, current_user=current_user)

@router.post("/{case_id}/assignments", response_model=CaseOut)
def assign_user_to_case(
    case_id: int,
    payload: CaseAssignmentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")

    target_user = db.query(User).filter(User.id == payload.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")

    existing = (
        db.query(CaseAssignment)
        .filter(
            CaseAssignment.case_id == case_id,
            CaseAssignment.user_id == payload.user_id,
        )
        .first()
    )
    if existing:
        # Update assigned role if changed
        existing.assigned_role = payload.assigned_role
        db.commit()
    else:
        assignment = CaseAssignment(
            case_id=case_id,
            user_id=payload.user_id,
            assigned_role=payload.assigned_role,
        )
        db.add(assignment)
        db.commit()

    # Log Audit Event
    log_case_audit(
        db=db,
        actor_id=current_user.id,
        action=f"ASSIGN_USER_{payload.user_id}",
        case_id=c.id,
        ip_address=request.client.host if request.client else None,
    )

    return get_case_by_id(case_id, db=db, current_user=current_user)

@router.delete("/{case_id}/assignments/{user_id}", response_model=CaseOut)
def remove_user_from_case(
    case_id: int,
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found")

    assignment = (
        db.query(CaseAssignment)
        .filter(
            CaseAssignment.case_id == case_id,
            CaseAssignment.user_id == user_id,
        )
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=404, detail="User assignment not found for this case")

    db.delete(assignment)
    db.commit()

    # Log Audit Event
    log_case_audit(
        db=db,
        actor_id=current_user.id,
        action=f"UNASSIGN_USER_{user_id}",
        case_id=c.id,
        ip_address=request.client.host if request.client else None,
    )

    return get_case_by_id(case_id, db=db, current_user=current_user)

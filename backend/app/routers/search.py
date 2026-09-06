"""
Full-text search router — searches across document titles and extracted text.
Uses Postgres full-text search functions directly via raw SQL for maximum
performance and compatibility.
"""
from __future__ import annotations

from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.models import User, Document, DocumentVersion, Case, CaseAssignment
from app.dependencies import get_current_user
from pydantic import BaseModel

router = APIRouter()


class SearchHit(BaseModel):
    document_id: int
    document_title: str
    doc_type: str
    version_id: int
    version_number: int
    snippet: str
    case_id: int
    case_number: str
    case_title: str
    rank: float


class SearchResultGroup(BaseModel):
    case_id: int
    case_number: str
    case_title: str
    hits: List[SearchHit]


class SearchResponse(BaseModel):
    query: str
    total_hits: int
    groups: List[SearchResultGroup]


@router.get("/search", response_model=SearchResponse)
def search_documents(
    q: str = Query(..., min_length=1, max_length=200),
    case_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Full-text search across document titles and OCR-extracted text.
    Results are grouped by case and ranked by relevance.
    """
    if not q.strip():
        return SearchResponse(query=q, total_hits=0, groups=[])

    # Build the search query using Postgres full-text search functions
    # We search across document.title and document_version.extracted_text
    # using plainto_tsquery for safe user input handling
    sql = text("""
        SELECT
            d.id as document_id,
            d.title as document_title,
            d.doc_type as doc_type,
            dv.id as version_id,
            dv.version_number,
            c.id as case_id,
            c.case_number,
            c.title as case_title,
            ts_rank(
                to_tsvector('english', COALESCE(d.title, '') || ' ' || COALESCE(dv.extracted_text, '')),
                plainto_tsquery('english', :query)
            ) as rank,
            ts_headline(
                'english',
                COALESCE(dv.extracted_text, d.title),
                plainto_tsquery('english', :query),
                'MaxWords=35, MinWords=15, StartSel=<<, StopSel=>>'
            ) as snippet
        FROM document_versions dv
        JOIN documents d ON d.id = dv.document_id
        JOIN cases c ON c.id = d.case_id
        WHERE
            dv.status != 'superseded'
            AND (
                to_tsvector('english', COALESCE(d.title, '') || ' ' || COALESCE(dv.extracted_text, ''))
                @@ plainto_tsquery('english', :query)
                OR d.title ILIKE :like_query
            )
            {case_filter}
        ORDER BY rank DESC
        LIMIT 50
    """.format(
        case_filter="AND c.id = :case_id" if case_id else ""
    ))

    params = {"query": q, "like_query": f"%{q}%"}
    if case_id:
        params["case_id"] = case_id

    rows = db.execute(sql, params).fetchall()

    # Group results by case
    groups_map: dict[int, SearchResultGroup] = {}
    for row in rows:
        hit = SearchHit(
            document_id=row.document_id,
            document_title=row.document_title,
            doc_type=row.doc_type,
            version_id=row.version_id,
            version_number=row.version_number,
            snippet=row.snippet,
            case_id=row.case_id,
            case_number=row.case_number,
            case_title=row.case_title,
            rank=float(row.rank),
        )

        if row.case_id not in groups_map:
            groups_map[row.case_id] = SearchResultGroup(
                case_id=row.case_id,
                case_number=row.case_number,
                case_title=row.case_title,
                hits=[],
            )
        groups_map[row.case_id].hits.append(hit)

    groups = sorted(groups_map.values(), key=lambda g: max(h.rank for h in g.hits), reverse=True)
    total_hits = sum(len(g.hits) for g in groups)

    return SearchResponse(
        query=q,
        total_hits=total_hits,
        groups=groups,
    )

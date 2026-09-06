"""
AI Processing Service
- OCR text extraction (pytesseract for images / scanned PDFs, python-docx for DOCX)
- Rule-based document classifier
"""
from __future__ import annotations

import io
import re
import logging
from typing import Optional, Tuple

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Text Extraction
# ---------------------------------------------------------------------------

def extract_text(raw_bytes: bytes, filename: str, mime_type: str) -> str:
    """
    Extract text from a file's raw bytes based on its MIME type.
    Returns the extracted text or an empty string on failure.
    """
    text = ""
    try:
        if mime_type in ("image/png", "image/jpeg", "image/jpg"):
            text = _ocr_image(raw_bytes)
        elif mime_type == "application/pdf":
            text = _ocr_pdf(raw_bytes)
        elif mime_type in (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
        ):
            text = _extract_docx(raw_bytes)
        else:
            logger.info(f"Unsupported MIME type for text extraction: {mime_type}")
    except Exception as exc:
        logger.warning(f"Text extraction failed for {filename}: {exc}")
    return text.strip()


def _ocr_image(raw_bytes: bytes) -> str:
    """Run pytesseract OCR on a single image."""
    try:
        from PIL import Image
        import pytesseract
    except ImportError as e:
        logger.warning(f"OCR dependencies not available: {e}")
        return ""

    image = Image.open(io.BytesIO(raw_bytes))
    return pytesseract.image_to_string(image) or ""


def _ocr_pdf(raw_bytes: bytes) -> str:
    """Convert each PDF page to an image and run OCR."""
    try:
        from pdf2image import convert_from_bytes
        import pytesseract
    except ImportError as e:
        logger.warning(f"PDF OCR dependencies not available: {e}")
        return ""

    pages = []
    try:
        images = convert_from_bytes(raw_bytes, dpi=200)
        for img in images:
            page_text = pytesseract.image_to_string(img) or ""
            pages.append(page_text)
    except Exception as exc:
        logger.warning(f"PDF OCR processing error: {exc}")

    return "\n\n".join(pages)


def _extract_docx(raw_bytes: bytes) -> str:
    """Extract text from a DOCX file."""
    try:
        import docx
    except ImportError as e:
        logger.warning(f"python-docx not available: {e}")
        return ""

    doc = docx.Document(io.BytesIO(raw_bytes))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


# ---------------------------------------------------------------------------
# Document Classification  (Rule / Keyword-based)
# ---------------------------------------------------------------------------

# Keyword sets mapped to DocType enum values
_CLASSIFICATION_RULES: list[Tuple[str, list[str], float]] = [
    # (doc_type_value, keywords, base_weight)
    ("FIR", [
        "first information report", "fir ", "fir_", "f.i.r",
        "complaint registered", "police station", "section 154",
        "cognizable offence", "complainant", "informant",
    ], 1.0),
    ("witness_statement", [
        "witness", "statement", "deposition", "testimony",
        "testify", "eyewitness", "sworn statement", "affidavit",
        "declaration under oath", "witness_statement",
    ], 1.0),
    ("charge_sheet", [
        "charge sheet", "chargesheet", "charge_sheet",
        "prosecution", "accused persons", "list of witnesses",
        "list of documents", "final report",
    ], 1.0),
    ("forensic_report", [
        "forensic", "dna analysis", "ballistic", "toxicology",
        "fingerprint", "autopsy", "post-mortem", "lab report",
        "chemical analysis", "digital forensic", "cyber forensic",
        "forensic_report",
    ], 1.0),
    ("evidence_media", [
        "evidence", "photograph", "cctv", "surveillance",
        "video footage", "audio recording", "exhibit",
        "evidence_media", "crime scene photo",
    ], 0.8),
    ("court_filing", [
        "court filing", "court_filing", "petition", "appeal",
        "bail application", "remand", "judicial",
        "hon'ble court", "honourable court", "jurisdiction",
    ], 1.0),
    ("legal_notice", [
        "legal notice", "legal_notice", "notice to",
        "cease and desist", "show cause", "statutory notice",
        "demand notice", "reply to notice",
    ], 1.0),
    ("judgment", [
        "judgment", "judgement", "order of the court",
        "verdict", "sentenced", "acquitted", "convicted",
        "in the matter of", "pronounced", "decree",
    ], 1.0),
]


def classify_document(text: str, filename: str) -> Tuple[str, str]:
    """
    Guess the document type from extracted text and filename.

    Returns:
        (doc_type_value, confidence)  where confidence is 'high', 'medium', or 'low'
    """
    combined = f"{filename.lower()} {text.lower()}"

    scores: dict[str, float] = {}

    for doc_type, keywords, weight in _CLASSIFICATION_RULES:
        score = 0.0
        for kw in keywords:
            matches = len(re.findall(re.escape(kw), combined))
            if matches > 0:
                score += matches * weight
        if score > 0:
            scores[doc_type] = score

    if not scores:
        return ("forensic_report", "low")

    best_type = max(scores, key=scores.get)  # type: ignore[arg-type]
    best_score = scores[best_type]

    if best_score >= 5:
        confidence = "high"
    elif best_score >= 2:
        confidence = "medium"
    else:
        confidence = "low"

    return (best_type, confidence)

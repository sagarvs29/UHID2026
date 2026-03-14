"""
OCR Router — POST /ai/ocr
Pipeline: Tesseract (local, free) → Google Cloud Vision fallback if confidence < 0.85
"""

from __future__ import annotations

import io
import os
import re
import logging
from typing import Literal

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl

logger = logging.getLogger(__name__)

router = APIRouter()


# ─── Request / Response models ────────────────────────────────────────────────

class OcrRequest(BaseModel):
    fileUrl: str
    mimeType: str  # e.g. "image/jpeg", "application/pdf"


class OcrResponse(BaseModel):
    text: str
    confidence: float
    engine: Literal["tesseract", "google_vision"]


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _clean_text(raw: str) -> str:
    """Remove scan artifacts and normalise whitespace."""
    # Remove non-printable chars except newlines
    cleaned = re.sub(r"[^\x20-\x7E\n]", " ", raw)
    # Collapse multiple spaces / blank lines
    cleaned = re.sub(r" {2,}", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


async def _fetch_file(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.content


def _tesseract_ocr(image_bytes: bytes) -> tuple[str, float]:
    """Run pytesseract on raw image bytes. Returns (text, confidence 0-1)."""
    try:
        import pytesseract
        from PIL import Image

        img = Image.open(io.BytesIO(image_bytes))
        # Get detailed data to compute confidence
        data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)
        # Filter valid word confidences (-1 = non-word)
        confs = [int(c) for c in data["conf"] if int(c) > 0]
        avg_conf = (sum(confs) / len(confs) / 100.0) if confs else 0.0
        text = pytesseract.image_to_string(img)
        return text, avg_conf
    except Exception as exc:
        logger.warning("Tesseract failed: %s", exc)
        return "", 0.0


async def _google_vision_ocr(image_bytes: bytes) -> str:
    """Call Google Cloud Vision API for OCR. Returns extracted text."""
    try:
        from google.cloud import vision  # type: ignore

        client = vision.ImageAnnotatorClient()
        image = vision.Image(content=image_bytes)
        response = client.text_detection(image=image)
        if response.error.message:
            raise RuntimeError(response.error.message)
        annotations = response.text_annotations
        return annotations[0].description if annotations else ""
    except Exception as exc:
        logger.error("Google Vision OCR failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"Google Vision error: {exc}")


# ─── Route ────────────────────────────────────────────────────────────────────

@router.post("", response_model=OcrResponse)
async def run_ocr(body: OcrRequest) -> OcrResponse:
    """
    Step 1: Download file from Cloudinary URL.
    Step 2: Run Tesseract OCR.
    Step 3: If confidence < 0.85 → escalate to Google Cloud Vision.
    Step 4: Clean text and return.
    """
    # Download the file
    try:
        file_bytes = await _fetch_file(body.fileUrl)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Cannot fetch file: {exc}")

    # For PDFs, we can only use Google Vision (Tesseract needs images)
    is_pdf = body.mimeType == "application/pdf" or body.fileUrl.lower().endswith(".pdf")

    if not is_pdf:
        text, confidence = _tesseract_ocr(file_bytes)
    else:
        text, confidence = "", 0.0  # Force Google Vision for PDFs

    CONFIDENCE_THRESHOLD = float(os.getenv("OCR_CONFIDENCE_THRESHOLD", "0.85"))

    if confidence >= CONFIDENCE_THRESHOLD and text.strip():
        return OcrResponse(
            text=_clean_text(text),
            confidence=confidence,
            engine="tesseract",
        )

    # Fallback to Google Vision
    vision_text = await _google_vision_ocr(file_bytes)
    return OcrResponse(
        text=_clean_text(vision_text),
        confidence=0.95,  # Google Vision is high-accuracy
        engine="google_vision",
    )

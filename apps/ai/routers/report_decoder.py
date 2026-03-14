"""
Report Decoder Router — POST /ai/report/decode
Translates a medical record's extracted text (or raw file via OCR) into
a patient-friendly plain-language summary using GPT-4o.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Literal

from fastapi import APIRouter, HTTPException
from openai import AsyncOpenAI, APIError, RateLimitError
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()

# ─── Models ───────────────────────────────────────────────────────────────────

class DecodeRequest(BaseModel):
    recordId: str
    extractedText: str          # Pre-OCR'd text from medical_records.extractedText
    patientContext: dict | None = None  # Optional: age, gender, known conditions


class SimplifiedValue(BaseModel):
    parameter: str
    value: str
    normalRange: str
    status: Literal["NORMAL", "LOW", "HIGH", "CRITICAL"]
    explanation: str
    recommendation: str


class DecodeResponse(BaseModel):
    recordId: str
    summaryText: str
    simplifiedValues: list[SimplifiedValue]
    overallRiskLevel: Literal["NORMAL", "LOW", "MODERATE", "HIGH", "CRITICAL"]
    actionItems: list[str]
    disclaimer: str
    modelUsed: str
    tokensUsed: int


# ─── Prompts ──────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a medical AI assistant that explains lab reports and medical documents to patients in simple, non-technical language. Your audience is a layperson with no medical training.

Rules:
1. NEVER make a diagnosis. Always recommend consulting a doctor.
2. Use simple, empathetic language (reading level: Grade 8).
3. For each parameter found, explain what it measures, what the result means, and whether it is a concern.
4. Always include the exact disclaimer provided in the schema.
5. Classify overall risk as: NORMAL, LOW, MODERATE, HIGH, or CRITICAL.
6. Do NOT include any patient PII (name, ID number, phone) in your output.
7. Output ONLY valid JSON matching the schema exactly — no extra prose, no markdown fences.

Output schema (strict JSON):
{
  "summaryText": "string — 2-3 sentence plain-language overview",
  "simplifiedValues": [
    {
      "parameter": "string",
      "value": "string",
      "normalRange": "string",
      "status": "NORMAL | LOW | HIGH | CRITICAL",
      "explanation": "string — what this parameter measures",
      "recommendation": "string — what the patient should do"
    }
  ],
  "overallRiskLevel": "NORMAL | LOW | MODERATE | HIGH | CRITICAL",
  "actionItems": ["string", ...],
  "disclaimer": "This is an AI-generated summary for informational purposes only. It is not a medical diagnosis. Always consult a qualified healthcare provider."
}"""


# ─── AI client factory ────────────────────────────────────────────────────────

def _get_client() -> AsyncOpenAI:
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key or api_key.startswith("sk-proj-fill"):
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")
    return AsyncOpenAI(api_key=api_key)


async def _call_openai(client: AsyncOpenAI, prompt: str) -> tuple[str, int]:
    """Call GPT-4o with fallback to gemini via proxy. Returns (content, tokens_used)."""
    try:
        resp = await client.chat.completions.create(
            model="gpt-4o",
            temperature=0.1,
            max_tokens=2000,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": prompt},
            ],
        )
        content = resp.choices[0].message.content or "{}"
        tokens  = resp.usage.total_tokens if resp.usage else 0
        return content, tokens
    except RateLimitError:
        # Fallback: try Gemini-compatible endpoint if configured
        gemini_key = os.getenv("GEMINI_API_KEY", "")
        if not gemini_key:
            raise HTTPException(status_code=503, detail="OpenAI quota exceeded and no Gemini fallback configured")
        gemini_client = AsyncOpenAI(
            api_key=gemini_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        )
        resp = await gemini_client.chat.completions.create(
            model="gemini-1.5-pro",
            temperature=0.1,
            max_tokens=2000,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": prompt},
            ],
        )
        content = resp.choices[0].message.content or "{}"
        tokens  = resp.usage.total_tokens if resp.usage else 0
        return content, tokens
    except APIError as exc:
        logger.error("OpenAI API error: %s", exc)
        raise HTTPException(status_code=502, detail=f"AI service error: {exc.message}")


def _strip_pii(text: str) -> str:
    """
    Remove common PII patterns before sending to external AI.
    Strips: phone numbers, Aadhaar-like numbers, email addresses.
    Patient name should already be absent since extractedText is raw lab values.
    """
    import re
    text = re.sub(r"\b[6-9]\d{9}\b", "[PHONE]", text)                 # Indian mobile
    text = re.sub(r"\b\d{4}\s?\d{4}\s?\d{4}\b", "[AADHAAR]", text)    # Aadhaar
    text = re.sub(r"\S+@\S+\.\S+", "[EMAIL]", text)                    # Email
    return text


# ─── Route ────────────────────────────────────────────────────────────────────

@router.post("/decode", response_model=DecodeResponse)
async def decode_report(body: DecodeRequest) -> DecodeResponse:
    """
    Decode a medical record's extracted text into patient-friendly language.
    Called by Express backend after checking auth + cache.
    """
    if not body.extractedText or len(body.extractedText.strip()) < 20:
        raise HTTPException(status_code=400, detail="extractedText is too short to analyse")

    client = _get_client()

    # Build context string (no PII)
    clean_text = _strip_pii(body.extractedText)
    context_note = ""
    if body.patientContext:
        age     = body.patientContext.get("age", "unknown")
        gender  = body.patientContext.get("gender", "unknown")
        context_note = f"\n\nPatient context (for better interpretation): Age {age}, Gender {gender}."

    user_prompt = (
        f"Please analyse the following medical report and return the JSON summary.\n\n"
        f"Report text:\n{clean_text}{context_note}"
    )

    raw_json, tokens = await _call_openai(client, user_prompt)

    try:
        parsed = json.loads(raw_json)
    except json.JSONDecodeError as exc:
        logger.error("GPT returned invalid JSON: %s\nRaw: %s", exc, raw_json[:500])
        raise HTTPException(status_code=502, detail="AI returned malformed JSON")

    # Enforce disclaimer
    parsed["disclaimer"] = (
        "This is an AI-generated summary for informational purposes only. "
        "It is not a medical diagnosis. Always consult a qualified healthcare provider."
    )

    model_used = "gpt-4o"
    if "gemini" in raw_json.lower():
        model_used = "gemini-1.5-pro"

    return DecodeResponse(
        recordId      = body.recordId,
        summaryText   = parsed.get("summaryText", ""),
        simplifiedValues = [SimplifiedValue(**v) for v in parsed.get("simplifiedValues", [])],
        overallRiskLevel = parsed.get("overallRiskLevel", "NORMAL"),
        actionItems   = parsed.get("actionItems", []),
        disclaimer    = parsed["disclaimer"],
        modelUsed     = model_used,
        tokensUsed    = tokens,
    )

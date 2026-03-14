"""
Clinical Summary Router — POST /ai/summary/clinical
Aggregates a patient's full history and generates a doctor-grade briefing using GPT-4o.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

from fastapi import APIRouter, HTTPException
from openai import AsyncOpenAI, APIError, RateLimitError
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()


# ─── Models ───────────────────────────────────────────────────────────────────

class PatientHistoryInput(BaseModel):
    """
    All patient data aggregated by the Express backend.
    Express is responsible for consent checking before calling this endpoint.
    """
    patientUhid: str
    patientContext: dict          # age, gender, bloodGroup, allergies, chronicConditions
    clinicalNotes: list[dict]     # [{icd10Code, diagnosis, vitalSigns, createdAt, ...}]
    prescriptions: list[dict]     # [{diagnosis, items:[{drugName, dosage, frequency}], createdAt}]
    medicalRecords: list[dict]    # [{title, recordType, subType, recordDate}]


class RiskScores(BaseModel):
    overall: str
    cardiovascular: str
    renal: str
    diabetic: str


class SummaryResponse(BaseModel):
    patientUhid: str
    summaryForDoctor: str
    activeConditions: list[dict]
    currentMedications: list[dict]
    vitalTrends: dict
    riskScore: RiskScores
    attentionItems: list[str]
    modelUsed: str
    tokensUsed: int


# ─── Prompts ──────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a clinical decision support AI for doctors. Your output is read by licensed physicians. Speak concisely using medical terminology.

Rules:
1. Aggregate all provided data (conditions, medications, labs, vitals).
2. Identify trends over time — improving or deteriorating.
3. Flag drug-condition conflicts (e.g., Metformin + eGFR <60, NSAIDs + anticoagulants).
4. Estimate multi-domain risk scores: overall, cardiovascular, renal, diabetic.
5. List attention items in priority order (most urgent first).
6. Do NOT include any patient PII (name, ID, phone) in output.
7. Output ONLY valid JSON matching the schema — no extra prose, no markdown.

Output schema (strict JSON):
{
  "summaryForDoctor": "string — 3-5 sentence clinical briefing",
  "activeConditions": [
    { "icd10": "string", "description": "string", "since": "YYYY-MM or unknown" }
  ],
  "currentMedications": [
    { "drug": "string", "frequency": "string", "since": "YYYY-MM or unknown" }
  ],
  "vitalTrends": {
    "bp":          [{ "date": "YYYY-MM", "value": "string" }],
    "pulse":       [{ "date": "YYYY-MM", "value": "string" }],
    "temperature": [{ "date": "YYYY-MM", "value": "string" }],
    "spo2":        [{ "date": "YYYY-MM", "value": "string" }]
  },
  "riskScore": {
    "overall": "LOW | MODERATE | HIGH | CRITICAL",
    "cardiovascular": "LOW | MODERATE | HIGH | CRITICAL",
    "renal": "LOW | MODERATE | HIGH | CRITICAL",
    "diabetic": "LOW | MODERATE | HIGH | CRITICAL"
  },
  "attentionItems": ["string", ...]
}"""


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_client() -> AsyncOpenAI:
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key or api_key.startswith("sk-proj-fill"):
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")
    return AsyncOpenAI(api_key=api_key)


async def _call_openai(client: AsyncOpenAI, user_prompt: str) -> tuple[str, str, int]:
    """Returns (content, model_used, tokens_used)."""
    try:
        resp = await client.chat.completions.create(
            model="gpt-4o",
            temperature=0.1,
            max_tokens=3000,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": user_prompt},
            ],
        )
        content    = resp.choices[0].message.content or "{}"
        tokens     = resp.usage.total_tokens if resp.usage else 0
        model_used = "gpt-4o"
        return content, model_used, tokens

    except RateLimitError:
        gemini_key = os.getenv("GEMINI_API_KEY", "")
        if not gemini_key:
            raise HTTPException(status_code=503, detail="OpenAI quota exceeded; no Gemini fallback")
        gemini_client = AsyncOpenAI(
            api_key=gemini_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        )
        resp = await gemini_client.chat.completions.create(
            model="gemini-1.5-pro",
            temperature=0.1,
            max_tokens=3000,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": user_prompt},
            ],
        )
        content    = resp.choices[0].message.content or "{}"
        tokens     = resp.usage.total_tokens if resp.usage else 0
        return content, "gemini-1.5-pro", tokens

    except APIError as exc:
        logger.error("OpenAI API error: %s", exc)
        raise HTTPException(status_code=502, detail=f"AI service error: {exc.message}")


def _build_prompt(body: PatientHistoryInput) -> str:
    ctx = body.patientContext
    lines: list[str] = [
        f"Patient: Age {ctx.get('age', '?')}, Gender {ctx.get('gender', '?')}, "
        f"Blood Group {ctx.get('bloodGroup', '?')}",
        f"Known allergies: {', '.join(ctx.get('allergies', [])) or 'None'}",
        f"Chronic conditions: {', '.join(ctx.get('chronicConditions', [])) or 'None'}",
        "",
        "--- CLINICAL NOTES ---",
    ]
    for note in body.clinicalNotes:
        date = note.get("createdAt", "")[:10]
        lines.append(
            f"[{date}] ICD-10: {note.get('icd10Code')} — {note.get('diagnosis')} | "
            f"Chief: {note.get('chiefComplaint')} | "
            f"Vitals: {json.dumps(note.get('vitalSigns', {}))}"
        )

    lines.append("")
    lines.append("--- PRESCRIPTIONS ---")
    for rx in body.prescriptions:
        date  = rx.get("createdAt", "")[:10]
        drugs = "; ".join(
            f"{item.get('drugName')} {item.get('dosage')} {item.get('frequency')}"
            for item in rx.get("items", [])
        )
        lines.append(f"[{date}] Dx: {rx.get('diagnosis')} | Drugs: {drugs}")

    lines.append("")
    lines.append("--- MEDICAL RECORDS ---")
    for rec in body.medicalRecords:
        date = (rec.get("recordDate") or "")[:10]
        lines.append(f"[{date}] {rec.get('recordType')} — {rec.get('title')}")

    lines.append("")
    lines.append("Generate the clinical summary JSON based on the above data.")
    return "\n".join(lines)


# ─── Route ────────────────────────────────────────────────────────────────────

@router.post("/clinical", response_model=SummaryResponse)
async def generate_clinical_summary(body: PatientHistoryInput) -> SummaryResponse:
    """
    Generates a doctor-grade clinical briefing for a patient.
    Called by Express backend which has already verified consent.
    """
    if not body.clinicalNotes and not body.prescriptions and not body.medicalRecords:
        raise HTTPException(
            status_code=400,
            detail="Insufficient patient data to generate a clinical summary",
        )

    client     = _get_client()
    prompt     = _build_prompt(body)
    raw_json, model_used, tokens = await _call_openai(client, prompt)

    try:
        parsed: dict[str, Any] = json.loads(raw_json)
    except json.JSONDecodeError as exc:
        logger.error("GPT returned invalid JSON: %s\nRaw: %s", exc, raw_json[:500])
        raise HTTPException(status_code=502, detail="AI returned malformed JSON")

    risk_raw  = parsed.get("riskScore", {})
    risk      = RiskScores(
        overall        = risk_raw.get("overall", "LOW"),
        cardiovascular = risk_raw.get("cardiovascular", "LOW"),
        renal          = risk_raw.get("renal", "LOW"),
        diabetic       = risk_raw.get("diabetic", "LOW"),
    )

    return SummaryResponse(
        patientUhid      = body.patientUhid,
        summaryForDoctor = parsed.get("summaryForDoctor", ""),
        activeConditions = parsed.get("activeConditions", []),
        currentMedications = parsed.get("currentMedications", []),
        vitalTrends      = parsed.get("vitalTrends", {}),
        riskScore        = risk,
        attentionItems   = parsed.get("attentionItems", []),
        modelUsed        = model_used,
        tokensUsed       = tokens,
    )

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os

# Routers (added in Phase 5)
from routers import report_decoder, clinical_summary, ocr

app = FastAPI(
    title="UHID AI Service",
    version="1.0.0",
    description="Internal AI microservice for UHID platform",
    docs_url="/docs" if os.getenv("ENV") != "production" else None,
    redoc_url=None,
)

# ─── CORS — internal only ───────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# ─── Internal auth guard ────────────────────────────────────
INTERNAL_SECRET = os.getenv("INTERNAL_SERVICE_SECRET", "")


@app.middleware("http")
async def verify_internal_secret(request: Request, call_next):
    if request.url.path in ["/health", "/docs", "/openapi.json"]:
        return await call_next(request)

    secret = request.headers.get("x-internal-secret")
    if not secret or secret != INTERNAL_SECRET:
        raise HTTPException(status_code=403, detail="Forbidden")

    return await call_next(request)


# ─── Health check ───────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "uhid-ai",
        "openai_configured": bool(os.getenv("OPENAI_API_KEY")),
    }


# ─── Mount routers (Phase 5) ─────────────────────────────────
app.include_router(report_decoder.router, prefix="/ai/report", tags=["Report Decoder"])
app.include_router(clinical_summary.router, prefix="/ai/summary", tags=["Clinical Summary"])
app.include_router(ocr.router, prefix="/ai/ocr", tags=["OCR"])

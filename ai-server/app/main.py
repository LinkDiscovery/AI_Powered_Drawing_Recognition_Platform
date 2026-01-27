from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import ocr
from app.config import settings
import logging

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Drawing Analysis Server",
    description="OCR and AI services for drawing analysis",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(ocr.router, prefix="/api/ocr", tags=["OCR"])

@app.on_event("startup")
async def startup_event():
    logger.info("Starting AI Drawing Analysis Server...")
    logger.info(f"OCR Languages: {settings.ocr_languages_list}")
    logger.info(f"GPU Enabled: {settings.OCR_GPU}")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "AI Drawing Analysis Server",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "services": {
            "ocr": "active"
        },
        "version": "1.0.0"
    }

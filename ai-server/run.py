"""
AI Drawing Analysis Server - Run Script

Usage:
    python run.py
"""

import uvicorn
from app.config import settings

if __name__ == "__main__":
    print(f"Starting AI Drawing Analysis Server on {settings.HOST}:{settings.PORT}")
    print(f"OCR Languages: {settings.ocr_languages_list}")
    print(f"GPU Enabled: {settings.OCR_GPU}")
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,  # Auto-reload on code changes (development mode)
        log_level=settings.LOG_LEVEL.lower()
    )

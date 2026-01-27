from pydantic_settings import BaseSettings
from typing import List
import json

class Settings(BaseSettings):
    """Application settings"""
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS
    ALLOWED_ORIGINS: str = '["http://localhost:8080","http://localhost:5173"]'
    
    # OCR
    OCR_LANGUAGES: str = '["ko","en"]'
    OCR_GPU: bool = True
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    @property
    def allowed_origins_list(self) -> List[str]:
        """Parse ALLOWED_ORIGINS JSON string to list"""
        return json.loads(self.ALLOWED_ORIGINS)
    
    @property
    def ocr_languages_list(self) -> List[str]:
        """Parse OCR_LANGUAGES JSON string to list"""
        return json.loads(self.OCR_LANGUAGES)
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()

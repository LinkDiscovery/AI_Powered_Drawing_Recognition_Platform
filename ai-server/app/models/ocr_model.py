import easyocr
import torch
import logging
from typing import Dict, List, Any, Optional
import numpy as np

logger = logging.getLogger(__name__)

class OCRModel:
    """EasyOCR 기반 OCR 모델"""
    
    _instance: Optional['OCRModel'] = None
    
    def __new__(cls, *args, **kwargs):
        """Singleton pattern to avoid loading model multiple times"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self, languages: List[str] = None, gpu: bool = True):
        """
        Initialize OCR model
        
        Args:
            languages: List of languages to recognize (default: ["ko", "en"])
            gpu: Whether to use GPU (default: True)
        """
        # Only initialize once
        if hasattr(self, 'reader'):
            return
            
        if languages is None:
            languages = ["ko", "en"]
            
        self.languages = languages
        self.gpu = gpu and torch.cuda.is_available()
        
        logger.info(f"Initializing OCR model...")
        logger.info(f"Languages: {languages}")
        logger.info(f"GPU available: {torch.cuda.is_available()}")
        logger.info(f"Using GPU: {self.gpu}")
        
        try:
            self.reader = easyocr.Reader(
                languages,
                gpu=self.gpu,
                verbose=False
            )
            logger.info("OCR model initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize OCR model: {e}")
            raise
    
    def extract_text(
        self,
        image: np.ndarray,
        detail: int = 1
    ) -> Dict[str, Any]:
        """
        Extract text from image
        
        Args:
            image: Image as numpy array (RGB format)
            detail: 0=text only, 1=bbox+text+confidence, 2=all info
        
        Returns:
            Dictionary containing extracted text and metadata
        """
        try:
            logger.debug(f"Performing OCR on image shape: {image.shape}")
            
            # Perform OCR
            results = self.reader.readtext(image, detail=detail)
            
            if detail == 0:
                # Text only
                return {
                    "text": '\n'.join(results),
                    "confidence": None,
                    "details": None
                }
            
            # Parse results with bbox and confidence
            if not results:
                logger.warning("No text detected in image")
                return {
                    "text": "",
                    "confidence": 0.0,
                    "details": []
                }
            
            text_lines = [result[1] for result in results]
            confidences = [result[2] for result in results]
            bboxes = [result[0] for result in results]
            
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
            
            logger.info(f"OCR completed. Detected {len(text_lines)} text blocks. Avg confidence: {avg_confidence:.2f}")
            
            return {
                "text": '\n'.join(text_lines),
                "confidence": round(avg_confidence, 4),
                "details": [
                    {
                        "bbox": [[int(coord[0]), int(coord[1])] for coord in bbox],
                        "text": text,
                        "confidence": round(conf, 4)
                    }
                    for bbox, text, conf in zip(bboxes, text_lines, confidences)
                ]
            }
            
        except Exception as e:
            logger.error(f"OCR extraction failed: {str(e)}")
            raise RuntimeError(f"OCR extraction failed: {str(e)}")

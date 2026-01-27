from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import cv2
import numpy as np
from PIL import Image
import io
import logging

from app.models.ocr_model import OCRModel
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize OCR model (singleton)
ocr_model = OCRModel(
    languages=settings.ocr_languages_list,
    gpu=settings.OCR_GPU
)

class BBoxRequest(BaseModel):
    """Bounding box for cropping"""
    x: int
    y: int
    width: int
    height: int
    page: Optional[int] = 1

@router.post("/extract")
async def extract_text(
    file: UploadFile = File(...),
    x: Optional[int] = Form(None),
    y: Optional[int] = Form(None),
    width: Optional[int] = Form(None),
    height: Optional[int] = Form(None),
    page: Optional[int] = Form(1),
    rotation: Optional[int] = Form(0)  # 0, 90, 180, 270 degrees
):
    """
    Extract text from uploaded image
    
    Args:
        file: Uploaded image file
        x, y, width, height: Optional bounding box coordinates
        page: Page number (for PDF, not implemented yet)
        rotation: Image rotation in degrees (0, 90, 180, 270)
    
    Returns:
        JSON response with extracted text and metadata
    """
    try:
        logger.info(f"Received OCR request for file: {file.filename}, rotation: {rotation}")
        
        # Read file
        contents = await file.read()
        
        # Convert to PIL Image
        image = Image.open(io.BytesIO(contents))
        logger.debug(f"Image size: {image.size}, mode: {image.mode}")
        
        # Convert to numpy array
        img_array = np.array(image)
        
        # Convert to RGB (EasyOCR requires RGB)
        if len(img_array.shape) == 2:  # Grayscale
            img_array = cv2.cvtColor(img_array, cv2.COLOR_GRAY2RGB)
        elif img_array.shape[2] == 4:  # RGBA
            img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2RGB)
        elif img_array.shape[2] == 3 and image.mode == 'BGR':
            img_array = cv2.cvtColor(img_array, cv2.COLOR_BGR2RGB)
        
        # Crop if bbox provided
        if all(v is not None for v in [x, y, width, height]):
            logger.info(f"Cropping image with bbox: x={x}, y={y}, w={width}, h={height}")
            
            # Boundary check
            x = max(0, x)
            y = max(0, y)
            width = min(width, img_array.shape[1] - x)
            height = min(height, img_array.shape[0] - y)
            
            if width <= 0 or height <= 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid bounding box: x={x}, y={y}, w={width}, h={height}"
                )
            
            img_array = img_array[y:y+height, x:x+width]
            logger.debug(f"Cropped image shape: {img_array.shape}")
        
        # Apply rotation if specified (matches PDF viewer's clockwise rotation)
        if rotation and rotation != 0:
            rotation = rotation % 360  # Normalize to 0-359
            logger.info(f"Rotating image by {rotation} degrees (clockwise)")
            
            if rotation == 90:
                # 90° clockwise rotation
                img_array = cv2.rotate(img_array, cv2.ROTATE_90_CLOCKWISE)
            elif rotation == 180:
                img_array = cv2.rotate(img_array, cv2.ROTATE_180)
            elif rotation == 270:
                # 270° clockwise = 90° counterclockwise
                img_array = cv2.rotate(img_array, cv2.ROTATE_90_COUNTERCLOCKWISE)
            
            logger.debug(f"Rotated image shape: {img_array.shape}")
        
        # Perform OCR
        result = ocr_model.extract_text(img_array, detail=1)
        
        logger.info(f"OCR completed successfully. Confidence: {result.get('confidence', 0):.2f}")
        
        return JSONResponse({
            "success": True,
            "data": result
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OCR failed: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"OCR processing failed: {str(e)}"
        )

@router.get("/health")
async def ocr_health():
    """Check OCR service health"""
    return {
        "status": "healthy",
        "model": "EasyOCR",
        "languages": settings.ocr_languages_list,
        "gpu_available": torch.cuda.is_available() if 'torch' in dir() else False,
        "gpu_enabled": settings.OCR_GPU
    }

# Import torch for health check
import torch

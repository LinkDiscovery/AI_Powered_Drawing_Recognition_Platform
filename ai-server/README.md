# AI Drawing Analysis Server

Python-based AI server for OCR, classification, and LLM services.

## Features

- **OCR**: Text extraction using EasyOCR (Korean + English)
- **GPU Support**: CUDA acceleration for faster processing
- **REST API**: FastAPI-based endpoints

## Setup

### 1. Create Virtual Environment

```bash
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

Copy `.env.example` to `.env` and adjust settings:

```bash
copy .env.example .env  # Windows
# cp .env.example .env  # Linux/Mac
```

### 4. Run Server

```bash
python run.py
```

Server will start on `http://localhost:8000`

## API Endpoints

### Health Check
```
GET /health
```

### OCR Text Extraction
```
POST /api/ocr/extract
Content-Type: multipart/form-data

Parameters:
- file: Image file
- x, y, width, height: Optional bounding box
```

Example response:
```json
{
  "success": true,
  "data": {
    "text": "Extracted text...",
    "confidence": 0.95,
    "details": [...]
  }
}
```

## Development

### Project Structure

```
ai-server/
├── app/
│   ├── main.py           # FastAPI app
│   ├── config.py         # Configuration
│   ├── models/
│   │   └── ocr_model.py  # OCR model
│   ├── routers/
│   │   └── ocr.py        # OCR endpoints
│   ├── services/
│   └── utils/
├── tests/
├── requirements.txt
├── run.py
└── README.md
```

### Testing

```bash
# Run tests
pytest tests/

# Test OCR endpoint
curl -X POST http://localhost:8000/api/ocr/extract \
  -F "file=@test_image.png"
```

## Integration with Spring Boot

The Spring Boot backend connects to this server via HTTP:

```java
// Spring Boot
AIServiceClient client = new AIServiceClient();
OcrResult result = client.performOcr(imageData, filename, bbox);
```

## Future Phases

- **Phase 2**: Classification model for drawing types
- **Phase 3**: LLM integration for intelligent parsing

## License

MIT

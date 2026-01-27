# AI OCR 서버 구동 방식 설명

## 📋 개요

이 문서는 Python FastAPI 기반 AI OCR 서버가 어떻게 구동되는지 상세히 설명합니다.

---

## 🚀 서버 실행 방법

### 1. 가상환경 활성화 후 실행

```bash
cd d:\AI_Powered_Drawing_Recognition_Platform\ai-server
.\venv\Scripts\activate
python run.py
```

### 2. 한 줄로 실행

```bash
cd d:\AI_Powered_Drawing_Recognition_Platform\ai-server
.\venv\Scripts\activate; python run.py
```

---

## 🔧 구동 흐름 (Execution Flow)

### 1단계: `run.py` 실행

**파일**: [run.py](file:///d:/AI_Powered_Drawing_Recognition_Platform/ai-server/run.py)

```python
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",      # FastAPI 앱 위치
        host="0.0.0.0",      # 모든 네트워크 인터페이스에서 접근 가능
        port=8000,           # 포트 8000에서 실행
        reload=True,         # 코드 변경 시 자동 재시작 (개발 모드)
        log_level="info"     # 로그 레벨
    )
```

**역할:**
- Uvicorn ASGI 서버를 시작
- `app.main:app`을 로드하여 FastAPI 애플리케이션 실행
- 개발 모드에서 코드 변경 감지 및 자동 재시작

---

### 2단계: FastAPI 앱 초기화 (`app/main.py`)

**파일**: [app/main.py](file:///d:/AI_Powered_Drawing_Recognition_Platform/ai-server/app/main.py)

```python
app = FastAPI(
    title="AI Drawing Analysis Server",
    description="OCR and AI services for drawing analysis",
    version="1.0.0"
)
```

**주요 작업:**

#### 1. CORS 미들웨어 설정
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
- 프론트엔드(React)와 백엔드(Spring Boot)에서 API 호출 허용

#### 2. 라우터 등록
```python
app.include_router(ocr.router, prefix="/api/ocr", tags=["OCR"])
```
- OCR 관련 엔드포인트를 `/api/ocr` 경로에 등록

#### 3. 시작 이벤트 처리
```python
@app.on_event("startup")
async def startup_event():
    logger.info("Starting AI Drawing Analysis Server...")
    logger.info(f"OCR Languages: {settings.ocr_languages_list}")
    logger.info(f"GPU Enabled: {settings.OCR_GPU}")
```
- 서버 시작 시 설정 정보 로깅

---

### 3단계: OCR 모델 초기화 (`app/routers/ocr.py`)

**파일**: [app/routers/ocr.py](file:///d:/AI_Powered_Drawing_Recognition_Platform/ai-server/app/routers/ocr.py)

```python
# 라우터 로드 시 OCR 모델 초기화 (싱글톤)
ocr_model = OCRModel(
    languages=settings.ocr_languages_list,  # ['en', 'ko']
    gpu=settings.OCR_GPU                     # True/False
)
```

**OCRModel 클래스** ([app/models/ocr_model.py](file:///d:/AI_Powered_Drawing_Recognition_Platform/ai-server/app/models/ocr_model.py)):
```python
class OCRModel:
    _instance = None  # 싱글톤 패턴
    
    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self, languages=['en', 'ko'], gpu=True):
        if self._initialized:
            return
        
        # EasyOCR Reader 초기화 (시간이 걸림)
        self.reader = easyocr.Reader(
            languages,
            gpu=gpu,
            model_storage_directory='./models'
        )
        self._initialized = True
```

**중요 포인트:**
- **싱글톤 패턴**: 모델은 한 번만 로드되고 재사용됨
- **초기화 시간**: 첫 실행 시 모델 다운로드 및 로드 (약 10-30초)
- **메모리 효율**: 모델을 메모리에 유지하여 빠른 응답 제공

---

## 📡 API 엔드포인트

### 1. Health Check

**엔드포인트**: `GET /health`

```json
{
  "status": "healthy",
  "services": {
    "ocr": "active"
  },
  "version": "1.0.0"
}
```

### 2. OCR 텍스트 추출

**엔드포인트**: `POST /api/ocr/extract`

**요청 (Multipart Form Data):**
- `file`: 이미지 파일 (PNG, JPG, JPEG, BMP, TIFF)
- `x`, `y`, `width`, `height` (선택): 크롭할 영역 좌표
- `page` (선택): PDF 페이지 번호 (현재 미구현)

**응답:**
```json
{
  "success": true,
  "data": {
    "detected_texts": [
      {
        "text": "프로젝트명",
        "bbox": {
          "x_min": 10,
          "y_min": 20,
          "x_max": 100,
          "y_max": 50
        },
        "confidence": 0.95
      }
    ],
    "full_text": "프로젝트명\n도면명\n...",
    "processing_time": 1.23
  }
}
```

---

## 🔄 요청 처리 흐름

### Spring Boot → Python OCR 서버

```
1. 사용자가 프론트엔드에서 "AI로 인식하기" 클릭
   ↓
2. React → Spring Boot: POST /api/ocr/process/{fileId}
   ↓
3. Spring Boot (OcrService.java):
   - PDF/이미지에서 BBox 영역 크롭
   - 임시 PNG 파일 생성
   ↓
4. Spring Boot (AIServiceClient.java):
   - Python OCR 서버로 HTTP POST 요청
   - URL: http://localhost:8000/api/ocr/extract
   - Body: Multipart form data (이미지 파일)
   ↓
5. Python OCR 서버 (app/routers/ocr.py):
   - 이미지 수신 및 전처리
   - EasyOCR로 텍스트 추출
   - JSON 응답 반환
   ↓
6. Spring Boot (OcrService.java):
   - OCR 결과 수신
   - 프로젝트명, 도면명 등 파싱
   - TitleBlockText 엔티티로 DB 저장
   ↓
7. React: OCR 결과 화면에 표시
```

---

## 📁 파일 구조 및 역할

```
ai-server/
├── run.py                      # 서버 실행 진입점
├── requirements.txt            # Python 의존성
├── .env                        # 환경 변수 (생성 필요)
├── .env.example               # 환경 변수 템플릿
│
├── app/
│   ├── __init__.py
│   ├── main.py                # FastAPI 앱 정의
│   ├── config.py              # 설정 관리 (환경 변수 로드)
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   └── ocr_model.py       # EasyOCR 래퍼 (싱글톤)
│   │
│   ├── routers/
│   │   ├── __init__.py
│   │   └── ocr.py             # OCR API 엔드포인트
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   └── image_processor.py # 이미지 전처리
│   │
│   └── utils/
│       ├── __init__.py
│       └── logger.py          # 로깅 유틸리티
│
└── models/                     # EasyOCR 모델 저장 위치 (자동 생성)
```

---

## ⚙️ 환경 설정 (`.env`)

**파일**: `.env` (직접 생성 필요)

```bash
# 서버 설정
HOST=0.0.0.0
PORT=8000

# OCR 설정
OCR_LANGUAGES=en,ko           # 지원 언어 (영어, 한글)
OCR_GPU=True                  # GPU 사용 여부
OCR_CONFIDENCE_THRESHOLD=0.3  # 최소 신뢰도 임계값

# CORS 설정
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8080

# 로그 레벨
LOG_LEVEL=INFO
```

**설정 로드 방식** ([app/config.py](file:///d:/AI_Powered_Drawing_Recognition_Platform/ai-server/app/config.py)):
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    OCR_LANGUAGES: str = "en,ko"
    OCR_GPU: bool = True
    # ...
    
    class Config:
        env_file = ".env"

settings = Settings()
```

---

## 🧠 OCR 처리 과정

### 1. 이미지 수신 및 전처리

```python
# 1. 파일 읽기
contents = await file.read()
image = Image.open(io.BytesIO(contents))

# 2. NumPy 배열로 변환
img_array = np.array(image)

# 3. RGB 변환 (EasyOCR 요구사항)
if len(img_array.shape) == 2:  # Grayscale
    img_array = cv2.cvtColor(img_array, cv2.COLOR_GRAY2RGB)
elif img_array.shape[2] == 4:  # RGBA
    img_array = cv2.cvtColor(img_array, cv2.COLOR_RGBA2RGB)
```

### 2. 크롭 (선택적)

```python
# BBox가 제공된 경우 이미지 크롭
if all(v is not None for v in [x, y, width, height]):
    img_array = img_array[y:y+height, x:x+width]
```

### 3. OCR 실행

```python
# EasyOCR로 텍스트 추출
result = ocr_model.extract_text(img_array, detail=1)
```

### 4. 결과 반환

```python
return JSONResponse({
    "success": True,
    "data": {
        "detected_texts": [...],
        "full_text": "...",
        "processing_time": 1.23
    }
})
```

---

## 🔍 디버깅 및 모니터링

### 1. 로그 확인

서버 실행 시 콘솔에 다음과 같은 로그가 출력됩니다:

```
Starting AI Drawing Analysis Server on 0.0.0.0:8000
OCR Languages: ['en', 'ko']
GPU Enabled: True
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### 2. API 문서 (Swagger UI)

브라우저에서 http://localhost:8000/docs 접속

- 모든 엔드포인트 확인
- 직접 API 테스트 가능
- 요청/응답 스키마 확인

### 3. Health Check

```bash
curl http://localhost:8000/health
```

---

## ⚠️ 주의사항

### 1. 첫 실행 시 모델 다운로드

- EasyOCR 모델이 자동으로 다운로드됨 (약 100-200MB)
- 인터넷 연결 필요
- `./models` 디렉토리에 저장됨

### 2. GPU 사용

- GPU가 없으면 자동으로 CPU 모드로 전환
- CPU 모드에서는 처리 속도가 느릴 수 있음

### 3. 메모리 사용량

- EasyOCR 모델이 메모리에 상주 (약 500MB-1GB)
- 서버 재시작 시 모델 재로드 필요

### 4. 포트 충돌

- 기본 포트 8000이 이미 사용 중이면 `.env`에서 변경

---

## 🚀 성능 최적화

### 1. 싱글톤 패턴

- OCR 모델을 한 번만 로드하여 메모리 효율성 확보
- 요청마다 모델 재로드하지 않음

### 2. 비동기 처리

- FastAPI의 `async/await`로 동시 요청 처리
- I/O 대기 시간 최소화

### 3. 이미지 전처리

- 불필요한 변환 최소화
- OpenCV로 빠른 이미지 처리

---

## 🔗 관련 문서

- [README.md](file:///d:/AI_Powered_Drawing_Recognition_Platform/ai-server/README.md) - 프로젝트 개요
- [INSTALLATION.md](file:///d:/AI_Powered_Drawing_Recognition_Platform/ai-server/INSTALLATION.md) - 설치 가이드
- [Spring Boot 연동 가이드](file:///d:/AI_Powered_Drawing_Recognition_Platform/history/2026-01-27_03_Spring_Boot_OCR_연동.md)

---

**작성일**: 2026-01-27  
**버전**: 1.0.0

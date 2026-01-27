# Python OCR 서버 설치 및 실행 가이드

## 현재 진행 상황

✅ **완료:**
1. 프로젝트 구조 생성
2. Python 파일 작성
3. 가상환경 생성 (`venv`)
4. 의존성 설치 중... ⏳

---

## 설치 중인 패키지

```
fastapi==0.109.0          # 웹 프레임워크
uvicorn[standard]==0.27.0 # ASGI 서버
python-multipart==0.0.6   # 파일 업로드
easyocr==1.7.1            # OCR 엔진 ⭐
opencv-python==4.9.0.80   # 이미지 처리
pillow==10.2.0            # 이미지 라이브러리
numpy==1.26.3             # 수치 계산
pydantic==2.5.3           # 데이터 검증
pydantic-settings==2.1.0  # 설정 관리
python-dotenv==1.0.0      # 환경 변수
```

**예상 다운로드 크기**: ~500MB (EasyOCR 모델 포함)

---

## 설치 완료 후 실행 방법

### 1. 서버 실행

```bash
cd d:\AI_Powered_Drawing_Recognition_Platform\ai-server
.\venv\Scripts\activate
python run.py
```

**예상 출력:**
```
Starting AI Drawing Analysis Server on 0.0.0.0:8000
OCR Languages: ['ko', 'en']
GPU Enabled: True
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 2. 브라우저에서 확인

- **Swagger UI**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

---

## 첫 실행 시 주의사항

### EasyOCR 모델 다운로드

첫 실행 시 EasyOCR이 자동으로 한국어/영어 모델을 다운로드합니다:

```
Downloading detection model...
Downloading recognition model...
```

**다운로드 위치**: `C:\Users\{username}\.EasyOCR\model\`

**크기**: ~100MB

**시간**: 2-5분 (인터넷 속도에 따라)

---

## 테스트 방법

### 1. Health Check

```bash
curl http://localhost:8000/health
```

또는 브라우저에서: http://localhost:8000/health

**예상 응답:**
```json
{
  "status": "healthy",
  "services": {
    "ocr": "active"
  },
  "version": "1.0.0"
}
```

### 2. Swagger UI로 OCR 테스트

1. http://localhost:8000/docs 접속
2. `POST /api/ocr/extract` 클릭
3. "Try it out" 클릭
4. 이미지 파일 업로드
5. "Execute" 클릭

### 3. curl로 OCR 테스트

```bash
curl -X POST http://localhost:8000/api/ocr/extract \
  -F "file=@test_image.png"
```

---

## 트러블슈팅

### 문제 1: `torch` 관련 오류
**원인**: PyTorch 미설치
**해결**: 
```bash
pip install torch torchvision
```

### 문제 2: GPU 오류
**해결**: `.env` 파일 수정
```
OCR_GPU=false
```

### 문제 3: 포트 8000 이미 사용 중
**해결**: `.env` 파일 수정
```
PORT=8001
```

### 문제 4: EasyOCR 모델 다운로드 실패
**해결**: 수동 다운로드
1. https://github.com/JaidedAI/EasyOCR/releases
2. 모델 파일을 `~/.EasyOCR/model/` 에 배치

---

## 다음 단계: Spring Boot 연동

서버가 정상 실행되면, Spring Boot와 연동합니다:

1. **AIServiceClient.java** 생성
2. **OcrService.java** 수정
3. **통합 테스트**

---

## 성능 모니터링

### 메모리 사용량
- 초기: ~500MB
- OCR 실행 중: ~1-2GB
- GPU 사용 시: +VRAM 사용

### 응답 시간
- CPU: 2-5초
- GPU: 0.5-1초

---

## 서버 중지

터미널에서 `Ctrl+C` 누르기

---

## 참고

- 서버는 개발 모드로 실행됩니다 (코드 변경 시 자동 재시작)
- 프로덕션 배포 시 `reload=False` 설정 필요
- Docker 배포는 Phase 1 완료 후 진행 예정

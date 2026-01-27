# Python AI 서버 구축 - Phase 1 준비

## 현재 상태
- ✅ OCR 결과 자동 표시 기능 구현 완료
- ✅ OCR 중복 데이터 방지 기능 구현 완료
- ✅ Python AI 서버 단계적 구축 계획 수립 완료

## Phase 1: OCR Python 서버 구축 (다음 작업)

### 준비 사항

#### 1. 필요한 도구
- [ ] Python 3.11 이상 설치
- [ ] pip 최신 버전
- [ ] (선택) CUDA 설치 (GPU 사용 시)

#### 2. 프로젝트 구조 생성
```bash
cd d:\AI_Powered_Drawing_Recognition_Platform
mkdir ai-server
cd ai-server
```

#### 3. 가상환경 생성
```bash
python -m venv venv
venv\Scripts\activate  # Windows
```

#### 4. 의존성 설치
```bash
pip install fastapi uvicorn[standard] python-multipart easyocr opencv-python pillow numpy pydantic pydantic-settings python-dotenv
```

### 구현 순서

1. **FastAPI 서버 기본 구조**
   - `app/main.py` 생성
   - `app/config.py` 생성
   - Health check 엔드포인트

2. **OCR 모델 구현**
   - `app/models/ocr_model.py` 생성
   - EasyOCR 초기화
   - 텍스트 추출 함수

3. **OCR 라우터 구현**
   - `app/routers/ocr.py` 생성
   - `/api/ocr/extract` 엔드포인트
   - 이미지 전처리

4. **Spring Boot 연동**
   - `AIServiceClient.java` 생성
   - `OcrService.java` 수정
   - HTTP 통신 테스트

5. **테스트 및 검증**
   - 단위 테스트
   - 통합 테스트
   - 성능 비교 (Tess4J vs EasyOCR)

### 예상 소요 시간
- 기본 구조: 30분
- OCR 구현: 1시간
- Spring Boot 연동: 1시간
- 테스트: 30분
- **총 예상: 3시간**

### 성공 기준
- [ ] Python 서버가 정상적으로 실행됨
- [ ] `/health` 엔드포인트 응답 확인
- [ ] OCR 추출 성공 (한글 + 영어)
- [ ] Spring Boot에서 Python 서버 호출 성공
- [ ] Frontend에서 OCR 결과 정상 표시
- [ ] 한글 인식 정확도가 기존보다 향상됨

---

## Phase 2 & 3 (향후 계획)

### Phase 2: 분류 모델
- 도면 유형 분류 (평면도, 입면도, 단면도 등)
- CNN 모델 학습 및 배포
- 예상 소요: 1-2주

### Phase 3: LLM 통합
- GPT-4 또는 Claude API 연동
- 표제란 지능형 파싱
- 도면 분석 자동화
- 예상 소요: 1주

---

## 참고 문서
- [Implementation Plan](file:///C:/Users/asus/.gemini/antigravity/brain/c4580456-71f8-4cf0-a92f-abfc148e1fd4/implementation_plan.md)
- [현재 OcrService.java](file:///d:/AI_Powered_Drawing_Recognition_Platform/backend/platform-backend/src/main/java/com/example/demo/service/OcrService.java)

---

## 다음 작업 시작 시

Phase 1 구현을 시작할 준비가 되면 알려주세요!

```bash
# 시작 명령어
cd d:\AI_Powered_Drawing_Recognition_Platform
mkdir ai-server
cd ai-server
python -m venv venv
venv\Scripts\activate
```

# Spring Boot와 Python OCR 서버 연동

**날짜**: 2026-01-27  
**작업 시간**: 약 30분  
**목표**: Spring Boot 백엔드를 Python OCR 서버와 연동하여 실제 OCR 기능 구현

---

## 📋 작업 개요

기존 Tesseract 기반의 Mock OCR 구현을 Python EasyOCR 서버로 대체하여, 실제 한글/영어 텍스트 인식 기능을 구현했습니다.

---

## 🎯 주요 성과

### 1. AIServiceClient 구현

Python OCR 서버와 HTTP 통신하는 클라이언트를 생성했습니다.

**파일**: [AIServiceClient.java](file:///d:/AI_Powered_Drawing_Recognition_Platform/backend/platform-backend/src/main/java/com/example/demo/client/AIServiceClient.java)

**주요 기능**:
- ✅ Health Check - Python 서버 상태 확인
- ✅ OCR 추출 - 이미지 파일 전송 및 텍스트 추출
- ✅ 에러 핸들링 - `AIServiceException`으로 통합
- ✅ DTO 정의 - `OcrResult`, `DetectedText`, `BoundingBox`

### 2. RestTemplate 설정

HTTP 통신을 위한 Bean 설정을 추가했습니다.

**파일**: [RestClientConfig.java](file:///d:/AI_Powered_Drawing_Recognition_Platform/backend/platform-backend/src/main/java/com/example/demo/config/RestClientConfig.java)

- 연결 타임아웃: 10초
- 읽기 타임아웃: 30초

### 3. OcrService 업데이트

Tesseract 구현을 Python OCR 서버 호출로 대체했습니다.

**파일**: [OcrService.java](file:///d:/AI_Powered_Drawing_Recognition_Platform/backend/platform-backend/src/main/java/com/example/demo/service/OcrService.java)

**변경 내용**:
```java
// Before: Tesseract 직접 호출
Tesseract tesseract = new Tesseract();
return tesseract.doOCR(image);

// After: Python OCR 서버 호출
Path tempImagePath = Files.createTempFile("ocr_crop_", ".png");
ImageIO.write(image, "png", tempImagePath.toFile());
AIServiceClient.OcrResult result = aiServiceClient.extractText(tempImageFile);
return result.getFullText();
```

### 4. 설정 파일 업데이트

**파일**: [application.properties](file:///d:/AI_Powered_Drawing_Recognition_Platform/backend/platform-backend/src/main/resources/application.properties)

```properties
# AI OCR Server
ai.server.url=http://localhost:8000
```

---

## 🔧 아키텍처 변경

### Before
```
Frontend → Spring Boot (Tesseract) → Database
```

### After
```
Frontend → Spring Boot → Python OCR Server (EasyOCR)
                ↓
            Database
```

**장점**:
- 🚀 **성능 향상**: EasyOCR의 높은 정확도
- 🌏 **언어 지원**: 한글 + 영어 동시 인식 개선
- 📈 **확장성**: OCR 서버 독립 스케일링
- 🔧 **유지보수**: Python 로직 독립 업데이트

---

## ✅ 구현된 기능

### OCR 처리 흐름

1. **이미지 크롭**: PDF/이미지에서 BBox 영역 추출
2. **임시 파일 생성**: PNG 형식으로 저장
3. **Python 서버 호출**: HTTP POST로 이미지 전송
4. **텍스트 추출**: EasyOCR로 한글/영어 인식
5. **결과 파싱**: 프로젝트명, 도면명, 도면번호, 축척 자동 추출
6. **DB 저장**: `TitleBlockText` 엔티티로 저장
7. **정리**: 임시 파일 자동 삭제

### 에러 처리

- Python 서버 다운 시 `AIServiceException` 발생
- 네트워크 오류 시 명확한 에러 메시지
- 타임아웃 설정으로 무한 대기 방지

---

## 📝 생성/수정된 파일

### 새로 생성
1. `AIServiceClient.java` - Python OCR 클라이언트
2. `RestClientConfig.java` - RestTemplate 설정

### 수정
1. `OcrService.java` - Tesseract → Python OCR 전환
2. `application.properties` - OCR 서버 URL 추가
3. `OcrController.java` - 예외 타입 업데이트

---

## 🚀 다음 단계

### 통합 테스트
1. Spring Boot 서버 재시작 확인
2. 프론트엔드에서 실제 OCR 테스트
3. 다양한 PDF로 정확도 검증
4. 에러 케이스 테스트

### 성능 측정
- OCR 처리 시간
- 임시 파일 오버헤드
- 대용량 이미지 처리

---

## 💡 기술적 세부사항

### 임시 파일 관리
- 위치: 시스템 임시 디렉토리
- 패턴: `ocr_crop_*.png`
- 정리: `finally` 블록에서 자동 삭제

### 타임아웃 설정
- 연결: 10초
- 읽기: 30초 (OCR 처리 시간 고려)

---

**작성자**: AI Assistant  
**상태**: ✅ 구현 완료, ⏳ 통합 테스트 대기  
**다음**: 프론트엔드에서 실제 OCR 테스트

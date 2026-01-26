# AI 인식 페이지 및 OCR 구현

**날짜:** 2026-01-26
**작업:** 표제부 텍스트 추출을 위한 "AI 인식" 페이지 및 OCR 기능 구현.

## 1. 개요
"미리보기"와 "도면 보관함" 사이에 **"AI 인식"** 페이지를 새로 추가했습니다. 이 페이지에서 사용자는 도면을 불러오고, 표제부 영역을 지정하여 Tesseract OCR을 통해 텍스트를 추출할 수 있습니다.

## 2. 프론트엔드 변경 사항
- **새 페이지:** `src/pages/ai-recognition/` 경로에 `AiRecognitionPage.tsx` 생성.
- **라우팅:** `router.tsx`에 `/ai-recognition` 라우트 추가.
- **네비게이션:** `smallpdfHeader.config.ts` 헤더 설정에 "AI인식" 탭 추가.
- **기능:**
    - "도면 보관함"의 파일 목록에서 도면 선택 기능.
    - `PdfViewer` 컴포넌트를 연동하여 선택된 도면 표시 및 BBox(영역) 시각화.
    - "OCR 인식 시작" 버튼을 통해 백엔드 OCR API 호출.
    - 추출된 텍스트 필드(공사명, 도면명, 도면번호, 축척)를 확인하고 수정할 수 있는 결과 폼 구현.

## 3. 백엔드 변경 사항
- **의존성:** `pom.xml`에 `tess4j` (Java용 Tesseract) 및 `pdfbox` (PDF 렌더링용) 라이브러리 추가.
- **데이터 모델:** OCR 결과를 저장하기 위한 `TitleBlockText.java` 엔티티 생성 (`UserFile`과 연동).
- **리포지토리:** 데이터베이스 작업을 위한 `TitleBlockTextRepository` 생성.
- **서비스:** `OcrService.java` 구현:
    - PDF 페이지 렌더링 또는 이미지 로딩.
    - BBox 좌표를 기반으로 이미지 크롭.
    - Tesseract를 사용하여 OCR 수행.
    - 정규식(Regex)을 사용하여 원본 텍스트에서 주요 필드 파싱.
- **컨트롤러:** `OcrController.java` 생성 및 엔드포인트 구현:
    - `POST /api/ocr/process/{fileId}`: 특정 파일 및 영역에 대해 OCR 실행.
    - `GET /api/ocr/results/{fileId}`: 저장된 OCR 결과 조회.

## 4. 설정 요구사항
- **Tessdata:** 백엔드 프로젝트 루트(`backend/platform-backend/tessdata`)에 `kor.traineddata` (및 `eng.traineddata`) 파일이 반드시 존재해야 합니다.
- **재시작:** 새로운 Maven 의존성을 적용하기 위해 백엔드 서버 재시작이 필요합니다.

## 5. 향후 계획
- 실제 도면을 사용한 OCR 정확도 검증.
- `OcrService`의 필드 추출 정규식 고도화.
- 프론트엔드에서 수정한 OCR 결과를 DB에 저장하는 `PUT` API 구현.

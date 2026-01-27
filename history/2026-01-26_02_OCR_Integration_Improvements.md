# OCR 서비스 안정화 및 UX 개선

**날짜:** 2026-01-26 (오후)
**작업:** Tesseract OCR 연동 문제 해결, 미리보기-AI인식 페이지 간 자동 연동 구현, 결과 화면 UX 개선.

## 1. 주요 변경 사항

### A. Tesseract OCR 연동 및 에러 해결
- **언어 데이터 자동 다운로드:**
  - `tessdata` 폴더가 비어 있어 발생한 "Invalid memory access" 에러 해결.
  - `backend/platform-backend/tessdata/` 경로에 `kor.traineddata`, `eng.traineddata` 파일을 자동으로 다운로드하여 배치.
  - 이제 서버 배포 시 별도 파일 복사 없이도 OCR 기능이 정상 작동함.

- **PDFBox 호환성 패치:**
  - PDFBox 3.x 라이브러리 업데이트로 인해 `PDDocument.load()`가 제거된 문제 수정.
  - `Loader.loadPDF(file)` 메서드를 사용하도록 `OcrService.java` 코드를 업데이트하여 컴파일 에러 해결.

- **파일 경로 로직 수정:**
  - DB에 이미 절대 경로가 저장되어 있음에도 `uploadRoot.resolve()`를 중복 호출하여 경로가 꼬이는 문제 수정.
  - `Paths.get(userFile.getFilePath())`를 사용하여 올바른 경로를 참조하도록 변경.

### B. 페이지 간 연동 (Preview ↔ AI Recognition)
- **자동 파일 로드:**
  - 미리보기 페이지(`PreviewPage`)에서 "AI 인식" 버튼 클릭 시, 현재 보고 있던 파일의 ID를 `state`로 전달.
  - AI 인식 페이지(`AiRecognitionPage`) 진입 시 `useLocation`을 통해 전달받은 ID를 확인하고, 해당 파일을 자동으로 선택 및 로드하도록 구현.
  - 저장된 BBox(표제부 영역)가 있다면 즉시 표시되어 바로 OCR 수행 가능.

### C. UX/UI 개선
- **API 엔드포인트 수정:**
  - 프론트엔드에서 `/api/files`로 호출하던 것을 백엔드 스펙에 맞게 `/api/user/files`로 수정하여 404/HTML 반환 에러 해결.
- **결과 화면 개선:**
  - OCR 결과 텍스트 영역(`textarea`)의 높이를 늘리고 모노스페이스 폰트를 적용하여 가독성 향상.
  - OCR 완료 시 자동으로 결과 섹션으로 부드럽게 스크롤되도록 `scrollIntoView` 기능 추가.

## 2. 기술적 세부 사항

### 수정된 파일
- `backend/.../OcrService.java`: PDFBox Loader 적용.
- `backend/.../OcrController.java`: 파일 경로 resolving 로직 제거.
- `frontend/.../AiRecognitionPage.tsx`:
  - `useLocation` 훅 추가 (자동 파일 선택).
  - `API` 엔드포인트 수정.
  - `resultsRef` 및 자동 스크롤 로직 추가.
- `frontend/.../AiRecognitionPage.css`: 텍스트 영역 스타일링(`min-height`, `font-family`).
- `frontend/.../PreviewPage.tsx`: "AI 인식" 이동 버튼 추가 및 `navigate` state 전달.

## 3. 결과
이제 사용자는 파일을 업로드하고, 미리보기에서 영역을 지정한 뒤, 버튼 한 번으로 AI 인식 페이지로 이동하여 즉시 OCR 결과를 확인할 수 있는 매끄러운 워크플로우를 경험할 수 있습니다.

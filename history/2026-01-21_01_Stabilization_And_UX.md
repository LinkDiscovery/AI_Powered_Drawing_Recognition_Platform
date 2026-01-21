# 2026-01-21 시스템 안정화 및 UX 개선 작업

## 1. 개요
전반적인 시스템 안정화(Stabilization), 코드 정리(Cleanup), UX/Navigation 개선, 그리고 에러 핸들링 강화를 수행함.

## 2. 주요 작업 내용

### A. 코드 정리 및 안정화 (Backend & Frontend)
- **Backend (`FileController.java`)**
    - 불필요한 `import` 문 (Unused Imports) 제거
    - 운영 환경을 고려하여 디버그용 `System.out.println` 제거 및 로그 정리
    - 주석 처리된 Dead Code 삭제
    - 이미지 회전 로직에서 `MimeType` Null Check 추가 (`NullPointerException` 방지)
- **Frontend (`PdfViewer.tsx`)**
    - 개발용 `console.log` 제거
    - 불필요한 주석 정리

### B. 사용자 경험(UX) 및 네비게이션 개선
- **`PreviewPage.tsx` (미리보기/편집 페이지)**
    - 버튼 명칭 직관화:
        - "처음으로" -> **"파일 목록"** (업로드 리스트로 이동임이 명확해짐)
        - "데이터 확인 및 수정" -> **"마이 페이지"** (저장소가 마이 페이지임이 명확해짐)
    - 저장 완료 토스트 메시지 문구 수정 ("마이 페이지에서 확인 가능")
- **`UserDashboard.tsx` (마이 페이지)**
    - **"← 파일 업로드"** 링크 버튼 추가 (헤더 우측 상단): 대시보드에서 바로 파일 추가 작업으로 이동 가능하도록 개선
    - TypeScript 인터페이스(`BBox`) 수정 및 Lint Warning 해결

### C. 에러 핸들링 강화 (Error Handling)
- **Backend (`GlobalExceptionHandler.java` 추가)**
    - `com.example.demo.exception` 패키지 신설
    - 전역 예외 처리기(`@ControllerAdvice`) 구현
    - `MaxUploadSizeExceededException` 등 시스템 예외 발생 시, 클라이언트가 이해할 수 있는 JSON 포맷(`{"error": ..., "message": ...}`)으로 응답하도록 처리
- **Frontend (`FileContext.tsx`)**
    - **`uploadFile`**: 업로드 실패 시 백엔드로부터 받은 JSON 에러 메시지를 파싱하여, 사용자에게 구체적인 실패 사유(예: 용량 초과)를 토스트로 안내
    - **`claimFile`**: 파일 할당/저장 실패 시 단순 에러가 아닌, 백엔드 응답 메시지를 포함한 상세 에러를 `throw` 하도록 개선

## 3. 결과
- 사용자는 앱 내에서 더 자연스럽게 이동(파일 목록 <-> 마이 페이지 <-> 업로드)할 수 있음.
- 오류 발생 시 막연한 "실패"가 아닌 명확한 원인을 안내받을 수 있어 사용성 증대.
- 불필요한 코드가 제거되어 유지보수성 향상.

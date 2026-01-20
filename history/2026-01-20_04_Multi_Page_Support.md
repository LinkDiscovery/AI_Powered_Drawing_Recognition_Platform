# 멀티 페이지 PDF 지원 구현 (Multi-page PDF Support)

**날짜:** 2026-01-20
**작업자:** AI Assistant (Antigravity)

## 1. 개요 (Overview)
멀티 페이지 PDF 지원 기능을 구현했습니다. 기존에는 박스(BBox)들이 단일 캔버스에 속한 것으로 처리되어, 한 페이지에 그린 박스가 모든 페이지에 보이거나 잘못된 위치에 나타나는 문제가 있었습니다.
이제 시스템은 `page` 번호를 기준으로 박스를 저장하고 필터링하여 보여줍니다.

## 2. 변경 사항 (Changes)

### Backend
*   **파일:** `src/main/java/com/example/demo/model/BBox.java`
    *   `private Integer page;` 필드 추가 (기본값: 1).
    *   생성자(Constructor)가 `page`를 받도록 수정.
*   **파일:** `src/main/java/com/example/demo/FileController.java`
    *   `updateCoordinates` 메서드 수정: JSON 페이로드에서 `page` 정보를 파싱하여 DB에 저장하도록 변경.

### Frontend
*   **파일:** `src/components/SelectionOverlay.tsx`
    *   `BBox` 인터페이스에 `page?: number` (옵셔널) 속성 추가.
*   **파일:** `src/components/PdfViewer.tsx`
    *   **필터링 (Filtering):** `viewBBoxes`는 이제 전체 `bboxes` 리스트 중 `b.page === currentPage`인 항목만 걸러서 보여줍니다.
    *   **저장 (Saving):** `onSaveSelection` 호출 시 전체 리스트(모든 페이지의 박스)를 백엔드로 전송합니다. 백엔드가 이를 받아 업데이트합니다.
    *   **생성/수정 (Creating/Updating):** `handleBBoxChange`는 박스가 수정되거나 새로 생성될 때, 현재 `page` 번호를 할당한 뒤 전체 상태(State)에 병합하도록 처리합니다.

## 3. 검증 (Verification)
*   **시나리오:** 1페이지에 박스를 그립니다. 2페이지로 이동합니다.
    *   **결과:** 1페이지의 박스가 2페이지에서는 보이지 않아야 합니다.
    *   **결과:** 2페이지에 새로운 박스를 그립니다.
    *   **저장:** 두 박스 모두 저장되어야 합니다. 페이지를 새로고침(Reload) 해도 각 박스가 제 페이지에 올바르게 남아 있어야 합니다.

# 2026-01-27 Drag & Drop Implementation

## 1. 개요
사용자 편의성을 높이기 위해 파일 및 폴더를 마우스 드래그 앤 드롭으로 이동할 수 있는 기능을 구현했습니다.

## 2. 주요 변경 사항

### Frontend (`frontend`)
*   **UserDashboard.tsx**:
    *   **Drag & Drop Handlers**: `handleDragStart`, `handleDragOver`, `handleDragLeave`, `handleDrop` 핸들러 구현.
    *   **State**: `draggedItem` 상태 추가 (드래그 중인 아이템 추적).
    *   **Draggable/Droppable 적용**:
        *   **Source**: 파일 및 폴더 카드/리스트 아이템에 `draggable="true"` 속성 추가.
        *   **Target**: 폴더 카드, 사이드바의 "내 드라이브", 상단 Breadcrumb 경로에 `onDrop` 이벤트 연결.
    *   **이동 로직 재사용**: 기존 `moveData` 기반의 이동 로직을 `performMove` 함수로 분리하여 모달 이동과 드래그 이동에서 공통 사용.

### Style (`UserDashboard.css`)
*   **Visual Feedback**:
    *   `.drag-over`: 드래그 중인 아이템이 폴더 위에 올라갔을 때 테두리와 배경색(#EEF2FF) 변경.
    *   `.nav-drag-over`: 사이드바 네비게이션 아이템용 하이라이트 스타일.
    *   `.drag-over-text`: Breadcrumb 텍스트용 하이라이트 스타일.

## 3. 검증 결과
*   **파일 -> 폴더 이동**: 정상 작동.
*   **폴더 -> 폴더 이동**: 정상 작동.
*   **폴더 -> 내 드라이브(Root) 이동**: 사이드바 및 Breadcrumb의 "내 드라이브"에 드롭하여 이동 가능 확인.
*   **Breadcrumb 이동**: 상위 경로(Breadcrumb)로 드래그하여 이동 가능 확인.
*   **예외 처리**: 자기 자신에게 드롭 시 아무 동작 안 함 (정상).

## 4. 특이 사항
*   휴지통에 있는 항목은 드래그 불가능하도록 처리했습니다.
*   DragEvent의 `dataTransfer`를 사용하여 이동할 아이템의 ID와 타입을 전달합니다.
*   **드래그 고스트 개선 (Custom Layer & Optimization)**:
    *   **Custom Layer**: `setDragImage`에 빈 이미지를 사용하여 기본 고스트를 숨기고, React 컴포넌트(`div`)로 커스텀 고스트를 직접 렌더링했습니다.
    *   **Performance Optimization**: 마우스 위치 추적 시 `useState`로 인한 리렌더링 딜레이를 방지하기 위해, **`useRef`와 직접적인 DOM 조작 (`transform`)** 방식을 사용하여 드래그 레이어가 마우스 포인터를 즉각적으로 따라오도록 개선했습니다.
    *   **Positioning**: 드래그 레이어와 마우스 포인터 간의 오차를 최소화(`offset: 5px`)하고, **`translateY(-50%)`를 적용하여 마우스 포인터가 드래그 중인 아이템의 수직 중앙**에 오도록 조정했습니다. 이를 통해 사용자는 아이템을 '잡고' 있는 듯한 직관적인 느낌을 받을 수 있습니다.

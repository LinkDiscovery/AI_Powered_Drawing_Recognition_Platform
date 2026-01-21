# 2026-01-21 Google Drive Style File Management - Phase 1 (Backend)

## 1. 개요
기존 "도면 보관함"을 폴더 구조와 휴지통 기능을 갖춘 Google Drive 스타일로 개편하기 위한 **백엔드 기초 작업(Phase 1)**을 완료했습니다.
이전 시도에서의 시행착오(데이터 호환성 문제, 파일명 충돌)를 반영하여 안정성을 최우선으로 구현했습니다.

## 2. 주요 변경 사항 (Backend)

### 데이터베이스 및 엔티티
- **Folder 엔티티 생성**: 
    - 계층형 구조 지원 (`parentFolderId`).
    - 생성일시 및 휴지통 상태(`isTrashed`) 포함.
- **UserFile 엔티티 개선**:
    - **`folderId` 추가**: 파일이 속한 폴더를 지정 (NULL이면 최상위 루트).
    - **`isTrashed` 추가**: 파일 삭제 시 즉시 제거되지 않고 휴지통으로 이동.
    - **`name` 필드 표준화**: 기존의 혼재된 `fileName` 등의 명칭을 `name`으로 통일.

### API (`/api/files` & `/api/folders`)
- **폴더 관리**: 생성, 조회(계층/휴지통 필터링), 삭제(휴지통 이동), 복원.
- **파일 관리**:
    - **이동**: 파일을 특정 폴더로 이동 (`/move`).
    - **휴지통**: 파일 휴지통 보내기 및 복원 (`/trash`, `/restore`).
    - **루트 조회**: 폴더에 속하지 않은 최상위 파일 조회 (`folderId IS NULL`).

### 안정성 확보 조치
- **NULL 처리**: 기존 데이터에는 `isTrashed`나 `folderId` 값이 없으므로, 조회 시 `NULL`도 허용하는 쿼리(`OR isTrashed IS NULL`)를 적용하여 데이터 누락 쿼리를 방지했습니다.

---
**Status**: Phase 1 (Backend) Complete ✅

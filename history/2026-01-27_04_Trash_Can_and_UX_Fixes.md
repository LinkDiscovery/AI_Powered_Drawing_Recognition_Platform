# Trash Can Feature & UX Improvements

**날짜**: 2026-01-27  
**작업 시간**: 약 2시간  
**목표**: 파일/폴더 안전 삭제를 위한 휴지통 기능 구현 및 주요 UX/버그 수정

---

## 📋 작업 개요

사용자의 데이터 안전을 위해 "휴지통(Trash Can)" 기능을 전면 도입했습니다.  
또한, OCR 회전 동기화 문제와 로그인 지속성 버그를 해결하여 애플리케이션의 안정성을 높였습니다.

---

## 🎯 주요 성과

### 1. 휴지통 기능 (Trash Can)
**Goal**: 실수로 인한 데이터 영구 삭제 방지 및 안전한 복원 메커니즘 제공

#### Backend (`platform-backend`)
- **Schema Update**: `UserFile`, `Folder` 엔티티에 `isTrashed` (Boolean), `trashedAt` (Timestamp) 필드 추가
- **API Implementation**:
    - **이동 (Soft Delete)**: `PUT /api/files/{id}/trash`, `PUT /api/folders/{id}/trash`
    - **복원 (Restore)**: `PUT /api/files/{id}/restore`, `PUT /api/folders/{id}/restore`
    - **완전 삭제 (Hard Delete)**: `DELETE /api/files/{id}`, `DELETE /api/folders/{id}`
    - **재귀적 삭제**: 폴더 완전 삭제 시 하위 폴더 및 파일까지 일괄 삭제하는 로직 구현 (`deleteFolderRecursive`)
- **DB Constraint Fix**: `bboxes` 테이블의 FK 제약조건을 `ON DELETE CASCADE`로 변경하여 파일 삭제 시 연관 데이터 자동 정리

#### Frontend (`UserDashboard.tsx`)
- **UI**: 사이드바에 '휴지통' 탭 추가 (`Trash2` 아이콘)
- **UX Flow**:
    1. **삭제 버튼 클릭**: "휴지통으로 이동하시겠습니까?" 컨펌 후 Soft Delete
    2. **휴지통 탭**: 삭제된 파일/폴더만 표시
    3. **복원**: 원래 위치로 복구 (`RotateCcw` 아이콘)
    4. **영구 삭제**: "되돌릴 수 없습니다" 경고 후 DB/Disk에서 완전 삭제
- **Error Handling**: 삭제 실패 시 (예: DB 제약조건 위반) 명확한 `alert` 메시지 표시

### 2. OCR 회전 동기화 (Rotation Sync)
**Goal**: PDF 뷰어의 회전 상태와 OCR 엔진의 인식 방향 불일치 해결

- **Frontend**: PDF 뷰어의 회전 버튼과 상단 OCR 회전 드롭다운 상태를 양방향 동기화
- **Backend (Python)**: EasyOCR 회전 로직 수정 (90도 = 시계 방향)
- **Persistence**: 파일 저장 시 회전 각도도 함께 저장 및 로드되도록 수정

### 3. 로그인 버그 수정 (Auth Fix)
**Goal**: 새로고침 시 로그인 상태임에도 로그인 모달이 뜨는 문제 해결

- **Fix**: `AuthContext`에 `isLoading` 상태 추가. 세션 복구(`checkAuth`)가 완료될 때까지 UI 렌더링을 보류하여 깜빡임 제거

---

## 📝 기술적 상세 (Technical Details)

### 1. 폴더 재귀 삭제 로직
```java
private void deleteFolderRecursive(Long folderId) {
    // 1. 하위 폴더 재귀 삭제
    List<Folder> subFolders = folderRepository.findByParentFolderId(folderId);
    for (Folder sub : subFolders) {
        deleteFolderRecursive(sub.getId());
    }
    // 2. 현재 폴더 내 파일 삭제
    userFileRepository.deleteByFolderId(folderId);
    // 3. 현재 폴더 삭제
    folderRepository.deleteById(folderId);
}
```

### 2. DB 스키마 핫픽스
Spring Boot의 `ddl-auto=update`가 기존 FK 제약조건을 수정하지 못하는 문제를 해결하기 위해 `DatabaseFixer` 유틸리티를 임시 실행하여 제약조건을 재설정했습니다.
```sql
ALTER TABLE bboxes DROP CONSTRAINT fk_user_file_id;
ALTER TABLE bboxes ADD CONSTRAINT fk_bboxes_user_files 
    FOREIGN KEY (user_file_id) REFERENCES user_files(id) ON DELETE CASCADE;
```

---

## ✅ 검증 결과

| 기능 | 테스트 케이스 | 결과 |
| :--- | :--- | :--- |
| **휴지통 이동** | 파일/폴더 삭제 시 휴지통 탭으로 이동 확인 | ✅ Pass |
| **복원** | 휴지통에서 복원 시 원래 목록(드라이브/최근)에 재등장 확인 | ✅ Pass |
| **영구 삭제** | 휴지통에서 삭제 시 DB 및 디스크에서 파일 제거 확인 | ✅ Pass |
| **폴더 삭제** | 폴더 반전 삭제 시 내부 파일까지 모두 삭제됨을 확인 | ✅ Pass |
| **회전 동기화** | 뷰어 회전 시 OCR 결과도 해당 방향으로 인식됨 확인 | ✅ Pass |
| **로그인 유지** | 새로고침 후 로그인 모달 없이 대시보드 유지 확인 | ✅ Pass |

---

## 🚀 다음 단계

- **자동 삭제 스케줄러**: 휴지통에 30일 이상 보관된 파일 자동 삭제 기능 (`@Scheduled`)
- **휴지통 비우기**: 휴지통 내 모든 항목 일괄 삭제 버튼
- **폴더 트리 뷰**: 좌측 사이드바에 트리 형태의 폴더 구조 시각화 구현 고려

---
**작성자**: AI Assistant  
**상태**: ✅ 배포 준비 완료

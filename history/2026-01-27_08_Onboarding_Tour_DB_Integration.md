# Onboarding Tour DB Integration
**Date:** 2026-01-27
**Author:** Antigravity (Assistant)
**Status:** Completed

## 1. 개요 (Overview)
기존 `localStorage` 기반의 온보딩 투어 상태 관리(Client-Side)를 **Spring Boot Backend 및 PostgreSQL 데이터베이스(Server-Side)**와 연동하여, 사용자가 기기나 브라우저를 변경해도 투어 완료 상태가 유지되도록 고도화했습니다.

---

## 2. 변경 내역 (Changes)

### 2.1. Backend (Spring Boot)
*   **Entity Update (`User.java`)**: `hasSeenTour` (Boolean) 컬럼 추가. 기본값 `false`.
*   **Service (`UserService.java`)**:
    *   `completeTour(String email)`: 투어 완료 시 상태를 `true`로 업데이트하는 로직 구현.
    *   `getUser(String email)`: 사용자 전체 정보를 반환하는 메서드 추가.
*   **Controller (`UserController.java`)**:
    *   `POST /api/user/tour-complete`: 프론트엔드에서 투어 완료 시 호출하는 API.
    *   `GET /api/user/me`: 로그인된 사용자의 최신 상태(투어 완료 여부 포함)를 조회하는 API.
*   **DTO (`LoginResponse.java`)**: 로그인/회원가입 응답 시 `hasSeenTour` 정보를 포함하여 초기 상태 동기화 속도 향상.

### 2.2. Frontend (React)
*   **State Management (`AuthContext.tsx`)**:
    *   `localStorage` 의존성 제거 및 `user.hasSeenTour` DB 값 우선 사용.
    *   `syncUserProfile()` 함수 추가: `/api/user/me`를 주기적으로 호출하여 백엔드 상태와 프론트엔드 상태 동기화.
*   **Tour Components Update**:
    *   5개 컴포넌트(`AiRecognition`, `Home`, `Upload`, `Preview`, `Dashboard`) 로직 변경.
    *   **Trigger Condition**: `user && !user.hasSeenTour` (로그인 됨 AND 투어 안 봄).
    *   **Completion**: 투어 종료/스킵 시 `/api/user/tour-complete` 호출 후 `syncUserProfile` 실행.

### 2.3. 버그 수정 및 개선 (Fixes)
*   **Syntax Error Fix**: `HomeOnboardingTour.tsx`에서 `useEffect` 닫는 괄호/콤마 누락 오류 수정.
*   **Help Button Logic Restoration**: 리팩토링 과정에서 누락되었던 **도움말 아이콘 클릭 이벤트(`window.addEventListener`)**를 모든 투어 컴포넌트에 복구하여, 사용자가 원할 때 언제든 투어를 다시 볼 수 있도록 조치.
*   **Condition Relaxing**: 초기 로딩 시 `hasSeenTour` 값이 `undefined`일 수 있음을 고려하여 `=== false` 체크를 `!hasSeenTour`로 완화, 안정성 확보.

---

## 3. 설치 및 실행 (Setup)
DB 스키마 변경이 포함되어 있으므로 백엔드 재호출이 필요합니다.

```bash
# Backend
cd platform-backend
mvn clean compile
mvn spring-boot:run
```

# Onboarding Tour Implementation
**Date:** 2026-01-27
**Author:** Antigravity (Assistant)
**Status:** Completed

## 1. 개요 (Overview)
사용자 경험(UX) 향상을 위해 주요 페이지에 **온보딩 투어(Onboarding Tour)**를 도입했습니다. 처음 방문하는 사용자에게 주요 기능의 위치와 사용법을 직관적으로 안내합니다.

**적용된 페이지:**
1.  **Home Page** (`/`): 서비스 소개 및 시작 버튼 안내
2.  **Upload Page** (`/upload`): 파일 업로드 영역 안내
3.  **Preview Page** (`/preview`): 도면 뷰어 조작 및 AI 인식 기능 안내
4.  **Dashboard Page** (`/dashboard`): 파일 관리, 폴더 생성, 휴지통 안내

---

## 2. 기술 스택 및 라이브러리 (Tech Stack)
*   **Library**: `react-joyride`
*   **Reason**:
    *   유연한 커스터마이징 (스타일, 동작 제어)
    *   Beacon/Spotlight 방식의 직관적인 UI
    *   React 생태계와의 높은 호환성

---

## 3. 주요 구현 내용 (Implementation Details)

### 3.1. 공통 설정 (Common Configuration)
모든 투어 컴포넌트에 통일된 스타일과 안정성 설정을 적용했습니다.

*   **Dark Theme**: 애플리케이션의 디자인 언어에 맞춰 검은색 배경의 툴팁 적용.
*   **Robust Alignment (안정성 확보)**:
    *   `disableScrolling={true}`: 투어 중 불필요한 자동 스크롤로 인한 화면 울렁임 방지.
    *   `disableScrollParentFix={true}`: 복잡한 레이아웃(Fixed, Sticky 등)에서의 포지셔닝 버그 해결.
    *   `floaterProps={{ disableAnimation: true }}`: 애니메이션 중 좌표 계산 오차를 줄여 하이라이트 위치 정확도 향상.
    *   `spotlightPadding={6}`: 타겟 요소와 하이라이트 박스 간의 여유 공간 확보.

### 3.2. 페이지별 구현 (Page Specifics)

#### A. Home Page (`HomeOnboardingTour.tsx`)
*   **핵심 문제 해결**:
    *   **CSS Zoom 이슈**: 전역 CSS (`index.css`)에 적용된 `zoom: 1.1` 속성이 Joyride의 좌표 계산을 왜곡시켜 하이라이트가 어긋나는 문제 발견 -> **제거**하여 해결.
    *   **Button Display**: `Link` 컴포넌트 버튼에 `display: inline-block`을 적용하여 Box Model 계산 오류 수정.
*   **Step 구성**: 시작하기 버튼 -> 대시보드 버튼 -> 네비게이션 바.

#### B. Upload Page (`UploadOnboardingTour.tsx`)
*   **타겟팅 전략**:
    *   드롭존(`Dropzone`) 영역에 명시적인 ID (`#upload-dropzone`) 부여.
    *   파일 리스트 카드(`Card`)에 ID (`#uploader-list-card`) 부여.
*   **UX**: 파일이 없을 때와 있을 때(목록)를 구분하여 유연하게 안내 가능하도록 설계.

#### C. Preview Page (`PreviewOnboardingTour.tsx`)
*   **타겟팅 개선**:
    *   **뷰어 간섭 해결**: 초기에는 뷰어 전체를 타겟팅하여 모달이 중앙을 가리는 문제 발생 -> **상단 툴바**(`#pdf-control-bar`)로 타겟 변경 및 `placement: 'bottom'` 설정으로 시야 확보.
    *   **사이드바**: `Sidebar` 컴포넌트를 `div#sidebar-tools`로 감싸 정확한 위치 타겟팅.
    *   **버튼**: AI 인식(`#preview-ai-btn`), 다운로드(`#preview-download-btn`)에 ID 부여.

#### D. Dashboard Page (`DashboardOnboardingTour.tsx`)
*   **타겟팅 개선**:
    *   **파일 목록 간섭 해결**: 파일 리스트 전체 영역 대신 **섹션 타이틀**(`h3#dashboard-files-title`)을 타겟팅하여 실제 파일 목록을 가리지 않고 안내.
    *   **네비게이션**: 사이드바(`#dashboard-sidebar-nav`), 신규 버튼(`#dashboard-new-btn`), 휴지통(`#nav-item-trash`) 등 세부 요소 타겟팅.

---

## 4. 테스트 및 검증 (Testing)
*   **Test User Bypass**:
    *   `test@example.com` 계정으로 로그인 시 `localStorage` 기록을 무시하고 **항상 투어가 실행**되도록 로직 추가 (개발 및 시연 용이성 확보).
    *   일반 사용자는 `localStorage` (`hasSeenTour_pageName`)를 통해 최초 1회만 노출.

## 5. 결과 (Result)
*   전체 서비스 흐름(Home -> Upload -> Preview -> Dashboard)에 끊김 없는 온보딩 경험 제공.
*   다크 테마 디자인과 이질감 없는 UI 구현.
*   버전별/해상도별 위치 오차 최소화.

---
**Next Step:**
*   사용자 반응을 모니터링하며 문구 수정 및 Step 순서 최적화.
*   모바일 환경에서의 투어 동작 검증 및 반응형 대응 강화.

# 2026-01-23 Homepage Palantir Redesign

## 작업 개요
홈페이지의 디자인을 기존 화이트 톤의 일반적인 레이아웃에서, Palantir 스타일의 프리미엄하고 압도적인 다크 테마 디자인으로 전면 리뉴얼했습니다.

## 주요 변경 사항

### 1. Palantir Style 리브랜딩
- **Full-Screen Video Background**:
  - `intro-video.mp4`를 배경으로 설정하고 화면 전체(`100vh`)를 채우도록 변경.
  - 영상 위에 `rgba(0, 0, 0, 0.65)`의 다크 오버레이를 적용하여 텍스트 가독성 확보 및 무게감 조성.
- **Typography Redesign**:
  - 메인 타이틀을 **"AI-Powered Automation for Every Decision"**으로 변경.
  - 폰트 사이즈를 대폭 키우고(`3.5rem`), 굵기(`700`)를 조정하여 임팩트 강화.
  - 서브텍스트 색상을 밝은 회색(`d1d5db`)으로 변경하여 다크 배경과 조화.
- **Button Styling**:
  - **Primary Button ("Get Started")**: White Background + Black Text + Square Shape (Palantir 특유의 각진 버튼 스타일).
  - **Secondary Button ("Dashboard")**: Transparent Background + White Border + White Text.

### 2. 레이아웃 및 UX 개선
- **Video Player Integration**:
  - 초기에는 단순 비디오 플레이어를 상단/하단에 배치했으나, 최종적으로 배경으로 통합하여 몰입감 극대화.
- **Spacing Optimization**:
  - 헤더 영역의 패딩을 제거하고 콘텐츠를 중앙 정렬하여 시원한 뷰포트 확보.
  - 불필요한 스크롤 없이 핵심 메시지에 집중할 수 있도록 "Above the Fold" 디자인 적용.

## 기술적 세부사항
- **Framework**: React + Vite w/ TypeScript
- **Component**: `frontend/src/pages/home/HomePage.tsx`
- **Styling**: Inline Styles (CSS-in-JS pattern) for rapid prototyping and style isolation.
- **Asset**: `frontend/public/assets/intro-video.mp4`

## 결과물
- **Dark Theme**: 전문적이고 하이테크 기업의 이미지를 주는 유저 인터페이스 구축.
- **Video Interaction**: 정적인 이미지 대신 동적인 영상 배경으로 사용자 경험(UX) 향상.

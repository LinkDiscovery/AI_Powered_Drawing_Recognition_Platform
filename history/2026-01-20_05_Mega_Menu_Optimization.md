# 메가 메뉴 최적화 (Mega Menu Optimization)

**날짜:** 2026-01-20
**작업자:** AI Assistant (Antigravity)

## 1. 개요 (Overview)
기존의 `smallpdfHeader` 설정에 포함되어 있던 불필요한 Smallpdf 전용 링크들(압축, 변환, 서명 등)을 제거하고,
**AiDraw** 서비스에 맞는 핵심 기능 위주로 메뉴 구성을 최적화했습니다.

## 2. 변경 사항 (Changes)

### Config
*   **파일:** `src/config/smallpdfHeader.config.ts`
    *   `toolsMegaMenu.groups` 배열을 전면 수정했습니다.

### 변경 전 (Before)
*   압축하기, 변환하기, AI PDF, 정리, 보기 및 편집 등 10개 이상의 그룹과 수십 개의 외부 링크가 존재했음.

### 변경 후 (After)
AiDraw 서비스의 핵심 3대 카테고리로 재편:

1.  **도면 분석 (Drawing Analysis)**
    *   도면 업로드 (`/upload`)
    *   내 도면 목록 (`/dashboard`)
2.  **분석 도구 (Analysis Tools)**
    *   미리보기 및 편집 (`/preview`)
3.  **계정 (Account)**
    *   마이 페이지 (`/dashboard`)

## 3. 효과 (Impact)
*   사용자가 "도구" 메뉴를 열었을 때, 서비스와 무관한 메뉴에 혼란을 느끼지 않고 **원하는 기능(업로드, 목록, 편집)에 즉시 접근**할 수 있게 되었습니다.

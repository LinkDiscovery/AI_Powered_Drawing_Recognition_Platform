// src/config/smallpdfHeader.config.ts

export type DisplayRule =
  | { kind: 'always' }
  | { kind: 'breakpoint'; showOn: Array<'desktop' | 'tablet' | 'mobile'> };

export type LogoVariant = {
  id: string;
  href: string;              // "/kr"
  title: string;             // "Smallpdf"
  img: { src: string; alt: string; width: number; height: number };
  display: DisplayRule;      // __cond-* (보이기/숨기기) 대응
};

export type NavLink = {
  id: string;
  label: string;
  href: string;
  target?: '_blank';
  rel?: string;
  className?: string; // CSS class for specific styling (e.g. responsive hiding)
};

export type MegaMenuItem = NavLink & {
  // Smallpdf는 우측에 24x24 아이콘(색상 박스 SVG)도 같이 있음
  rightIcon?: { type: 'svg' | 'img'; ariaLabel?: string };
};

export type MegaMenuGroup = {
  id: string;
  title: string;
  items: MegaMenuItem[];
};

export type ToolsMegaMenu = {
  trigger: {
    id: string;
    label: string; // "도구"
    leftIcon: 'grid'; // 9-dot grid 아이콘
    rightIcon: 'chevDown';
  };
  groups: MegaMenuGroup[];
};

export type HeaderAuth = {
  login: { id: string; label: string };
  trial: { id: string; label: string };
  // 로그인 상태에 따라 버튼이 바뀌면 여기에서 분기 가능
};

export type MobileMenu = {
  enabled: boolean;
  button: { id: string; ariaLabel: string }; // "메뉴"
  display: DisplayRule;
};

export type SmallpdfHeaderConfig = {
  // DOM: Header Wrapper (sc-1sjqft3-1 ...)
  brand: {
    logoVariants: LogoVariant[]; // (40x40 아이콘 + wordmark 등)
  };

  // DOM: "도구" + 메가 메뉴 패널
  toolsMegaMenu: ToolsMegaMenu;

  // DOM: 상단 탭(압축/변환하기/병합/편집/서명/AI PDF)
  primaryTabs: NavLink[];

  // DOM: 우측 링크(이용 요금, 팀)
  rightLinks: NavLink[];

  // DOM: 로그인/무료체험 버튼
  auth: HeaderAuth;

  // DOM: 모바일 햄버거(조건부)
  mobileMenu: MobileMenu;
};

/** ✅ 네가 준 DOM(outerHTML) 기반으로 채운 실제 데이터 */
export const smallpdfHeaderConfig: SmallpdfHeaderConfig = {
  brand: {
    logoVariants: [
      {
        id: 'logo-icon',
        href: '/kr',
        title: 'AiDraw',
        img: {
          src: '/assets/images/logo-blueprint.png',
          alt: 'AiDraw logo',
          width: 40,
          height: 40,
        },
        display: { kind: 'always' },
      },
      {
        id: 'logo-wordmark-desktop',
        href: '/kr',
        title: 'AiDraw',
        img: {
          src: '/assets/images/logo-blueprint-alt.png',
          alt: 'AiDraw logo',
          width: 98,
          height: 40,
        },
        // DOM에서 display:flex 로 보이는 조건부 블록( __cond-2743038 )
        display: { kind: 'breakpoint', showOn: ['desktop', 'tablet'] },
      },
    ],
  },

  toolsMegaMenu: {
    trigger: {
      id: 'tools-trigger',
      label: '도구',
      leftIcon: 'grid',
      rightIcon: 'chevDown',
    },
    groups: [
      {
        id: 'g-compress',
        title: '압축하기',
        items: [
          { id: 't-compress-pdf', label: 'PDF 압축', href: '/kr/compress-pdf', rightIcon: { type: 'svg' } },
        ],
      },
      {
        id: 'g-convert',
        title: '변환하기',
        items: [
          { id: 't-pdf-converter', label: 'PDF 변환기', href: '/kr/pdf-converter', rightIcon: { type: 'svg' } },
        ],
      },
      {
        id: 'g-ai-pdf',
        title: 'AI PDF',
        items: [
          { id: 't-chat-pdf', label: 'PDF와 채팅', href: '/kr/chat-pdf', rightIcon: { type: 'svg' } },
          { id: 't-pdf-summarizer', label: 'AI PDF 요약 도구', href: '/kr/pdf-summarizer', rightIcon: { type: 'svg' } },
          { id: 't-translate-pdf', label: 'PDF 번역', href: '/kr/translate-pdf', rightIcon: { type: 'svg' } },
          { id: 't-question-generator', label: 'AI 문제 생성기', href: '/kr/question-generator', rightIcon: { type: 'svg' } },
        ],
      },
      {
        id: 'g-organize',
        title: '정리',
        items: [
          { id: 't-merge-pdf', label: 'PDF 합치기', href: '/kr/merge-pdf', rightIcon: { type: 'svg' } },
          { id: 't-split-pdf', label: 'PDF 분할', href: '/kr/split-pdf', rightIcon: { type: 'svg' } },
          { id: 't-rotate-pdf', label: 'PDF 회전', href: '/kr/rotate-pdf', rightIcon: { type: 'svg' } },
          { id: 't-delete-pages', label: 'PDF 페이지 삭제', href: '/kr/delete-pages-from-pdf', rightIcon: { type: 'svg' } },
          { id: 't-extract-pages', label: 'PDF 페이지 추출', href: '/kr/extract-pdf-pages', rightIcon: { type: 'svg' } },
          { id: 't-organize-pdf', label: 'PDF 정리', href: '/kr/organize-pdf', rightIcon: { type: 'svg' } },
        ],
      },
      {
        id: 'g-view-edit',
        title: '보기 및 편집',
        items: [
          { id: 't-edit-pdf', label: 'PDF 편집', href: '/kr/edit-pdf', rightIcon: { type: 'svg' } },
          { id: 't-annotator', label: 'PDF 주석 도구', href: '/kr/pdf-annotator', rightIcon: { type: 'svg' } },
          { id: 't-reader', label: 'PDF 리더', href: '/kr/pdf-reader', rightIcon: { type: 'svg' } },
          { id: 't-page-numbers', label: '페이지 번호 매기기', href: '/kr/add-page-numbers-to-pdf', rightIcon: { type: 'svg' } },
          { id: 't-crop', label: 'PDF 자르기', href: '/kr/crop-pdf', rightIcon: { type: 'svg' } },
          { id: 't-redact', label: 'PDF 기밀 정보 삭제', href: '/kr/redact-pdf', rightIcon: { type: 'svg' } },
          { id: 't-watermark', label: '워터마크 PDF', href: '/kr/watermark-pdf', rightIcon: { type: 'svg' } },
          { id: 't-form-filler', label: 'PDF 양식 필러', href: '/kr/pdf-form-filler', rightIcon: { type: 'svg' } },
          { id: 't-share', label: 'PDF 공유하기', href: '/kr/share-document', rightIcon: { type: 'svg' } },
        ],
      },
      {
        id: 'g-from-pdf',
        title: 'PDF에서 변환',
        items: [
          { id: 't-pdf-to-word', label: 'PDF 워드 변환', href: '/kr/pdf-to-word', rightIcon: { type: 'svg' } },
          { id: 't-pdf-to-excel', label: 'PDF 엑셀 변환', href: '/kr/pdf-to-excel', rightIcon: { type: 'svg' } },
          { id: 't-pdf-to-ppt', label: 'PDF PPT변환', href: '/kr/pdf-to-ppt', rightIcon: { type: 'svg' } },
          { id: 't-pdf-to-jpg', label: 'PDF JPG 변환', href: '/kr/pdf-to-jpg', rightIcon: { type: 'svg' } },
        ],
      },
      {
        id: 'g-to-pdf',
        title: 'PDF로 변환',
        items: [
          { id: 't-word-to-pdf', label: '워드 PDF 변환', href: '/kr/word-to-pdf', rightIcon: { type: 'svg' } },
          { id: 't-excel-to-pdf', label: '엑셀 PDF 변환', href: '/kr/excel-to-pdf', rightIcon: { type: 'svg' } },
          { id: 't-ppt-to-pdf', label: 'PPT PDF 변환', href: '/kr/ppt-to-pdf', rightIcon: { type: 'svg' } },
          { id: 't-jpg-to-pdf', label: 'JPG PDF 변환', href: '/kr/jpg-to-pdf', rightIcon: { type: 'svg' } },
          { id: 't-pdf-ocr', label: 'PDF OCR 변환', href: '/kr/pdf-ocr', rightIcon: { type: 'svg' } },
        ],
      },
      {
        id: 'g-sign',
        title: '서명',
        items: [
          { id: 't-sign-pdf', label: 'PDF에 서명', href: '/kr/sign-pdf', rightIcon: { type: 'svg' } },
          {
            id: 't-sign-request',
            label: '서명 요청 (Sign.com)',
            href: 'https://sign.com/smallpdf?utm_source=smallpdf&utm_medium=nav&utm_content=tool-list',
            target: '_blank',
            rel: 'noopener noreferrer',
            rightIcon: { type: 'svg' },
          },
        ],
      },
      {
        id: 'g-more',
        title: '더 보기',
        items: [
          { id: 't-unlock', label: 'PDF 잠금해제', href: '/kr/unlock-pdf', rightIcon: { type: 'svg' } },
          { id: 't-protect', label: 'PDF 암호 설정', href: '/kr/protect-pdf', rightIcon: { type: 'svg' } },
          { id: 't-flatten', label: 'PDF 평면화', href: '/kr/flatten-pdf', rightIcon: { type: 'svg' } },
        ],
      },
      {
        id: 'g-scan',
        title: '스캔',
        items: [
          { id: 't-scanner', label: 'PDF 스캐너', href: '/kr/pdf-scanner', rightIcon: { type: 'svg' } },
        ],
      },
    ],
  },

  primaryTabs: [
    { id: 'tab-compress', label: '압축', href: '/kr/compress-pdf', className: 'hide-below-1000' },
    { id: 'tab-convert', label: '변환하기', href: '/kr/pdf-converter', className: 'hide-below-1100' },
    { id: 'tab-merge', label: '병합', href: '/kr/merge-pdf', className: 'hide-below-800' },
    { id: 'tab-edit', label: '편집', href: '/kr/edit-pdf', className: 'hide-below-900' },
    { id: 'tab-sign', label: '서명', href: '/kr/sign-pdf', className: 'hide-below-900' },
    { id: 'tab-ai', label: 'AI PDF', href: '/kr/ai-pdf', className: 'hide-below-800' },
  ],

  rightLinks: [
    { id: 'link-pricing', label: '이용 요금', href: '/kr/pricing' },
    { id: 'link-teams', label: '팀', href: '/kr/teams' },
  ],

  auth: {
    login: { id: 'btn-login', label: '로그인' },
    trial: { id: 'btn-trial', label: '무료 체험' },
  },

  mobileMenu: {
    enabled: true,
    button: { id: 'btn-mobile-menu', ariaLabel: '메뉴' },
    // DOM에서 메뉴 버튼이 display:flex / display:none 조건부였던 부분(__cond-2743049 등) 대응
    display: { kind: 'breakpoint', showOn: ['mobile'] },
  },
};

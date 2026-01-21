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
        href: '/',
        title: 'AiDraw',
        img: {
          src: '/assets/images/그림1.png',
          alt: 'AiDraw logo',
          width: 65,
          height: 60,
        },
        display: { kind: 'always' },
      },
      {
        id: 'logo-wordmark-desktop',
        href: '/',
        title: 'AiDraw',
        img: {
          src: '/assets/images/그림2.png',
          alt: 'AiDraw logo',
          width: 115,
          height: 30,
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
        id: 'g-drawing',
        title: '도면 분석',
        items: [
          { id: 't-upload', label: '도면 업로드', href: '/upload', rightIcon: { type: 'svg' } },
          { id: 't-dashboard', label: '도면 보관함', href: '/dashboard', rightIcon: { type: 'svg' } },
        ],
      },
      {
        id: 'g-tools',
        title: '분석 도구',
        items: [
          { id: 't-preview', label: '미리보기 및 편집', href: '/preview', rightIcon: { type: 'svg' } },
        ],
      },
      {
        id: 'g-account',
        title: '계정',
        items: [
          { id: 't-mypage', label: '도면 보관함', href: '/dashboard', rightIcon: { type: 'svg' } },
        ],
      },
    ],
  },

  primaryTabs: [
    { id: 'tab-upload', label: '파일 업로드', href: '/upload' },
    { id: 'tab-preview', label: '미리보기', href: '/preview' },
    { id: 'tab-dashboard', label: '도면 보관함', href: '/dashboard' },
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

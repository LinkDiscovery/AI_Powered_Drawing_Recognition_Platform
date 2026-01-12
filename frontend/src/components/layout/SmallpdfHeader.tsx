import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  smallpdfHeaderConfig,
  type DisplayRule,
  type NavLink,
} from '../../config/smallpdfHeader.config';
import AuthModal from '../auth/AuthModal';
import { useAuth } from '../../context/AuthContext';
import './smallpdfHeader.css';

function displayClass(rule: DisplayRule) {
  if (rule.kind === 'always') return 'd-always';
  // breakpoint showOn 값에 따라 class 부여
  const s = new Set(rule.showOn);
  return [
    s.has('desktop') ? 'show-desktop' : '',
    s.has('tablet') ? 'show-tablet' : '',
    s.has('mobile') ? 'show-mobile' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function isExternal(href: string) {
  return href.startsWith('http://') || href.startsWith('https://');
}

function TabLink({ item, active }: { item: NavLink; active: boolean }) {
  const cls = active ? 'sp-tab is-active' : 'sp-tab';
  if (isExternal(item.href)) {
    return (
      <a className={cls} href={item.href} target={item.target} rel={item.rel}>
        {item.label}
      </a>
    );
  }
  return (
    <Link className={cls} to={item.href}>
      {item.label}
    </Link>
  );
}

export default function SmallpdfHeader() {
  const { pathname } = useLocation();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false); // Auth Modal State
  const { user, logout, isAuthenticated } = useAuth(); // Auth Context

  // 활성 탭 판정(가장 단순하게: pathname이 href로 시작하면 active)
  const activeTabId = useMemo(() => {
    const found = smallpdfHeaderConfig.primaryTabs.find((t) =>
      pathname.startsWith(t.href)
    );
    return found?.id ?? null;
  }, [pathname]);

  return (
    <header className="sp-header">
      <div className="sp-header__inner">
        {/* LEFT: Brand */}
        <div className="sp-brand">
          <Link className="sp-brand__link" to={smallpdfHeaderConfig.brand.logoVariants[0].href}>
            <div className="sp-brand__logos" aria-label="AiDraw">
              {smallpdfHeaderConfig.brand.logoVariants.map((v) => (
                <img
                  key={v.id}
                  className={`sp-logo ${displayClass(v.display)}`}
                  src={v.img.src}
                  alt={v.img.alt}
                  width={v.img.width}
                  height={v.img.height}
                />
              ))}
            </div>
          </Link>

          {/* Tools dropdown trigger */}
          <div className="sp-tools">
            <button
              className="sp-tools__trigger"
              type="button"
              aria-haspopup="menu"
              aria-expanded={toolsOpen}
              onClick={() => setToolsOpen((p) => !p)}
              onBlur={(e) => {
                // 포커스가 메뉴 밖으로 나가면 닫기
                // (간단 버전: trigger 영역 전체 blur면 닫기)
                const next = e.relatedTarget as HTMLElement | null;
                if (!next || !e.currentTarget.parentElement?.contains(next)) {
                  setToolsOpen(false);
                }
              }}
            >
              <span className="sp-ic sp-ic--grid" aria-hidden="true">
                {/* 9-dot grid 느낌의 단순 SVG */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 5.125C4 4.504 4.504 4 5.125 4h1.75C7.496 4 8 4.504 8 5.125v1.75C8 7.496 7.496 8 6.875 8h-1.75A1.125 1.125 0 0 1 4 6.875v-1.75zM10 5.125C10 4.504 10.504 4 11.125 4h1.75C13.496 4 14 4.504 14 5.125v1.75C14 7.496 13.496 8 12.875 8h-1.75A1.125 1.125 0 0 1 10 6.875v-1.75zM16 5.25C16 4.56 16.56 4 17.25 4h1.5C19.44 4 20 4.56 20 5.25v1.5C20 7.44 19.44 8 18.75 8h-1.5C16.56 8 16 7.44 16 6.75v-1.5zM4 11.125C4 10.504 4.504 10 5.125 10h1.75C7.496 10 8 10.504 8 11.125v1.75C8 13.496 7.496 14 6.875 14h-1.75A1.125 1.125 0 0 1 4 12.875v-1.75zM10 11.125C10 10.504 10.504 10 11.125 10h1.75C13.496 10 14 10.504 14 11.125v1.75C14 13.496 13.496 14 12.875 14h-1.75A1.125 1.125 0 0 1 10 12.875v-1.75zM16 11.125C16 10.504 16.504 10 17.125 10h1.75C19.496 10 20 10.504 20 11.125v1.75C20 13.496 19.496 14 18.875 14h-1.75A1.125 1.125 0 0 1 16 12.875v-1.75zM5.125 16C4.504 16 4 16.504 4 17.125v1.75C4 19.496 4.504 20 5.125 20h1.75C7.496 20 8 19.496 8 18.875v-1.75C8 16.504 7.496 16 6.875 16h-1.75zM11.125 16C10.504 16 10 16.504 10 17.125v1.75C10 19.496 10.504 20 11.125 20h1.75C13.496 20 14 19.496 14 18.875v-1.75C14 16.504 13.496 16 12.875 16h-1.75zM17.125 16C16.504 16 16 16.504 16 17.125v1.75C16 19.496 16.504 20 17.125 20h1.75C19.496 20 20 19.496 20 18.875v-1.75C20 16.504 19.496 16 18.875 16h-1.75z" />
                </svg>
              </span>
              <span className="sp-tools__label">{smallpdfHeaderConfig.toolsMegaMenu.trigger.label}</span>
              <span className="sp-ic sp-ic--chev" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M3 6h10L8 11 3 6z" />
                </svg>
              </span>
            </button>

            {/* Mega menu panel */}
            {toolsOpen ? (
              <div className="sp-tools__panel" role="menu">
                <div className="sp-tools__grid">
                  {smallpdfHeaderConfig.toolsMegaMenu.groups.map((g) => (
                    <div key={g.id} className="sp-tools__group">
                      <div className="sp-tools__title">{g.title}</div>
                      <ul className="sp-tools__list">
                        {g.items.map((it) => (
                          <li key={it.id} className="sp-tools__item">
                            {isExternal(it.href) ? (
                              <a className="sp-tools__link" href={it.href} target={it.target} rel={it.rel}>
                                {it.label}
                              </a>
                            ) : (
                              <Link className="sp-tools__link" to={it.href}>
                                {it.label}
                              </Link>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* CENTER: Primary tabs */}
        <nav className="sp-nav" aria-label="Primary">
          <ul className="sp-nav__list">
            {smallpdfHeaderConfig.primaryTabs.map((t) => (
              <li key={t.id} className={`sp-nav__item ${t.className || ''}`}>
                <TabLink item={t} active={activeTabId === t.id} />
              </li>
            ))}
          </ul>
        </nav>

        {/* RIGHT: links + auth */}
        <div className="sp-right">
          <ul className="sp-right__links">
            {smallpdfHeaderConfig.rightLinks.map((l) => (
              <li key={l.id}>
                {isExternal(l.href) ? (
                  <a className="sp-right__link" href={l.href} target={l.target} rel={l.rel}>
                    {l.label}
                  </a>
                ) : (
                  <Link className="sp-right__link" to={l.href}>
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>

          <div className="sp-auth">
            {isAuthenticated && user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>{user.name}</span>
                <button
                  className="sp-btn sp-btn--ghost"
                  type="button"
                  onClick={logout}
                  style={{ padding: '8px 12px', fontSize: '13px' }}
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <>
                <button
                  className="sp-btn sp-btn--ghost"
                  type="button"
                  onClick={() => setAuthOpen(true)}
                >
                  {smallpdfHeaderConfig.auth.login.label}
                </button>
                <button
                  className="sp-btn sp-btn--primary"
                  type="button"
                  onClick={() => setAuthOpen(true)} // Open modal also for trial/signup
                >
                  {smallpdfHeaderConfig.auth.trial.label}
                </button>
              </>
            )}
          </div>

          {/* Mobile hamburger (나중에 모바일 메뉴 붙일 때 사용) */}
          {smallpdfHeaderConfig.mobileMenu.enabled ? (
            <button className="sp-hamburger" type="button" aria-label={smallpdfHeaderConfig.mobileMenu.button.ariaLabel}>
              <span />
              <span />
              <span />
            </button>
          ) : null}
        </div>
      </div>

      {/* Auth Modal Integration */}
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </header>
  );
}

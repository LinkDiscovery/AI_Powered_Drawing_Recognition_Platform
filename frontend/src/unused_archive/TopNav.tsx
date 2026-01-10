import { useAuthDrawer } from './AuthDrawerProvider';

export default function TopNav() {
  const { openAuth } = useAuthDrawer();

  return (
    <header className="topNav">
      <div className="topNavInner">
        <div className="brand">
          <div className="logoDot" />
          <strong>Drawing OCR</strong>
        </div>

        <nav className="navRight">
          <button className="navBtn" onClick={() => openAuth('login')}>
            로그인
          </button>
          <button className="navBtn primary" onClick={() => openAuth('signup')}>
            무료체험
          </button>
        </nav>
      </div>
    </header>
  );
}
// src/components/common/TopBar.tsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import Modal from './Modal';
import LoginForm from '../../pages/auth/LoginForm';
import SignupForm from '../../pages/auth/SignupForm';

export default function TopBar() {
  const [params, setParams] = useSearchParams();
  const auth = params.get('auth');
  const isAuthOpen = auth === 'login' || auth === 'signup';

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(
    !!localStorage.getItem('access_token')
  );

  useEffect(() => {
    const sync = () => setIsLoggedIn(!!localStorage.getItem('access_token'));

    // 같은 탭에서 로그인/로그아웃 반영용(우리가 직접 발생시키는 이벤트)
    window.addEventListener('auth_changed', sync);

    // 다른 탭에서 바뀌는 경우까지 반영
    window.addEventListener('storage', sync);

    return () => {
      window.removeEventListener('auth_changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  function openLogin() {
    setParams({ auth: 'login' });
  }
  function openSignup() {
    setParams({ auth: 'signup' });
  }
  function closeAuth() {
    const next = new URLSearchParams(params);
    next.delete('auth');
    setParams(next, { replace: true });
  }

  function logout() {
    localStorage.removeItem('access_token');
    setIsLoggedIn(false);
    window.dispatchEvent(new Event('auth_changed'));
  }

  return (
    <>
      <header className="topbarOuter">
        <div className="topbarInner">
          <div className="topbarLeft">AI Drawing Recognition</div>

          <div className="topbarRight">
            {!isLoggedIn ? (
              <>
                <button className="btn" onClick={openLogin}>로그인</button>
                <button className="btn primary" onClick={openSignup}>무료체험</button>
              </>
            ) : (
              <button className="btn" onClick={logout}>로그아웃</button>
            )}
          </div>
        </div>
      </header>

      <Modal
        open={isAuthOpen}
        title={auth === 'signup' ? '회원가입' : '로그인'}
        onClose={closeAuth}
        variant="auth"
      >
        {auth === 'signup' ? <SignupForm /> : <LoginForm />}
      </Modal>
    </>
  );
}

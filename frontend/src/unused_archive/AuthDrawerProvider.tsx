import React, { createContext, useContext, useMemo, useState } from 'react';
import Drawer from './Drawer';

type AuthMode = 'login' | 'signup';

type AuthDrawerCtx = {
  openAuth: (mode: AuthMode) => void;
  closeAuth: () => void;
};

const Ctx = createContext<AuthDrawerCtx | null>(null);

export function useAuthDrawer() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuthDrawer must be used within AuthDrawerProvider');
  return v;
}

export function AuthDrawerProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>('login');

  const api = useMemo<AuthDrawerCtx>(
    () => ({
      openAuth: (m) => {
        setMode(m);
        setOpen(true);
      },
      closeAuth: () => setOpen(false),
    }),
    []
  );

  return (
    <Ctx.Provider value={api}>
      {children}

      {/* ✅ Smallpdf처럼 우측 슬라이드 */}
      <Drawer open={open} onClose={api.closeAuth} title={mode === 'login' ? '로그인' : '회원가입'}>
        {/* 1단계는 “뼈대”만: 나중에 LoginForm/SignupForm 연결 */}
        {mode === 'login' ? (
          <div>
            <p className="muted">여기에 로그인 폼 컴포넌트 붙이면 됨</p>
            <button className="linkBtn" onClick={() => api.openAuth('signup')}>
              계정 만들기 →
            </button>
          </div>
        ) : (
          <div>
            <p className="muted">여기에 회원가입 폼 컴포넌트 붙이면 됨</p>
            <button className="linkBtn" onClick={() => api.openAuth('login')}>
              로그인으로 →
            </button>
          </div>
        )}
      </Drawer>
    </Ctx.Provider>
  );
}

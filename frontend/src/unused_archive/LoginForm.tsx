// src/pages/auth/LoginForm.tsx
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function LoginForm() {
  const nav = useNavigate();
  const [, setParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const canSubmit = useMemo(
    () => email.trim().length > 0 && pw.trim().length > 0 && !loading,
    [email, pw, loading]
  );

  function closeModal() {
    // ✅ 모달 닫기(쿼리스트링 제거)
    setParams({});
  }

  function notifyAuthChanged() {
    // ✅ TopBar가 리렌더 되도록(로그아웃/로그인 버튼 즉시 반영용)
    window.dispatchEvent(new Event('auth_changed'));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setErr('');
      setLoading(true);

      // TODO: 실제 API 붙이면 교체
      localStorage.setItem('access_token', 'demo_token');
      notifyAuthChanged();

      closeModal();
      nav('/upload', { replace: true });
    } catch (e: any) {
      setErr(e?.message ?? '로그인 실패');
    } finally {
      setLoading(false);
    }
  }

  // ✅ 소셜 로그인(지금은 데모)
  async function socialLogin(provider: 'google' | 'kakao' | 'microsoft') {
    try {
      setErr('');
      setLoading(true);

      // TODO: 실제 OAuth 연결 시 교체
      localStorage.setItem('access_token', `demo_${provider}_token`);
      notifyAuthChanged();

      closeModal();
      nav('/upload', { replace: true });
    } catch (e: any) {
      setErr(e?.message ?? `${provider} 로그인 실패`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
      {/* ✅ 소셜 로그인 버튼 3개 */}
      <div className="socialStack">
        <button
          type="button"
          className="socialBtn google"
          onClick={() => socialLogin('google')}
          disabled={loading}
        >
          Google 계정으로 계속하기
        </button>

        <button
          type="button"
          className="socialBtn kakao"
          onClick={() => socialLogin('kakao')}
          disabled={loading}
        >
          Kakao 계정으로 계속하기
        </button>

        <button
          type="button"
          className="socialBtn ms"
          onClick={() => socialLogin('microsoft')}
          disabled={loading}
        >
          Microsoft 계정으로 계속하기
        </button>
      </div>

      <div className="orLine">또는</div>

      {/* ✅ 입력칸 넓게 + placeholder(포커스 시 사라짐은 CSS로 처리) */}
      <input
        className="authInput"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="이메일"
        autoComplete="email"
      />

      <input
        className="authInput"
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder="비밀번호"
        autoComplete="current-password"
      />

      {err && (
        <div style={errorStyle}>
          {err}
        </div>
      )}

      <button type="submit" disabled={!canSubmit} style={btnStyle(canSubmit)}>
        {loading ? 'Signing in…' : '로그인'}
      </button>

      <div style={{ fontSize: 12, textAlign: 'center', color: '#666' }}>
        계정이 없나요?{' '}
        <button type="button" style={linkStyle} onClick={() => setParams({ auth: 'signup' })}>
          회원가입
        </button>
      </div>
    </form>
  );
}

const linkStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontWeight: 800,
  textDecoration: 'underline',
  padding: 0,
};

const errorStyle: React.CSSProperties = {
  border: '1px solid rgba(220, 20, 60, 0.25)',
  background: 'rgba(220, 20, 60, 0.06)',
  color: 'crimson',
  borderRadius: 12,
  padding: '10px 12px',
  fontSize: 12,
};

function btnStyle(enabled: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '11px 12px',
    borderRadius: 12,
    border: '1px solid #111',
    background: enabled ? '#111' : '#eee',
    color: enabled ? 'white' : '#999',
    fontWeight: 900,
    cursor: enabled ? 'pointer' : 'not-allowed',
  };
}

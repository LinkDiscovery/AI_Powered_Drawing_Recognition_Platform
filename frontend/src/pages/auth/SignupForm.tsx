// src/pages/auth/SignupForm.tsx
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function SignupForm() {
  const [, setParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // ✅ 제출 가능 조건
  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && pw.trim().length > 0 && pw2.trim().length > 0 && !loading;
  }, [email, pw, pw2, loading]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setErr('');

    // ✅ 비밀번호 확인
    if (pw !== pw2) {
      setErr('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      setLoading(true);

      // TODO: 실제 API 붙이면 여기 교체
      // 예: await api.signup({ email, password: pw });

      // ✅ 가입 완료 → 로그인 폼으로 전환
      setParams({ auth: 'login' });
    } catch (e: any) {
      setErr(e?.message ?? '회원가입 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
      <label style={f.label}>
        Email
        <input
          style={f.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </label>

      <label style={f.label}>
        Password
        <input
          style={f.input}
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
        />
      </label>

      <label style={f.label}>
        Confirm Password
        <input
          style={f.input}
          type="password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
        />
      </label>

      {err && <div style={f.error}>{err}</div>}

      <button type="submit" disabled={!canSubmit} style={btnStyle(canSubmit)}>
        {loading ? 'Creating…' : '회원가입'}
      </button>

      <div style={{ fontSize: 12, textAlign: 'center', color: '#666' }}>
        이미 계정이 있나요?{' '}
        <button type="button" style={f.link} onClick={() => setParams({ auth: 'login' })}>
          로그인
        </button>
      </div>
    </form>
  );
}

const f: Record<string, React.CSSProperties> = {
  label: { display: 'grid', gap: 6, fontSize: 12, color: '#333' },
  input: {
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid #ddd',
    fontSize: 13,
    outline: 'none',
  },
  link: {
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontWeight: 800,
    textDecoration: 'underline',
    padding: 0,
  },
  error: {
    border: '1px solid rgba(220, 20, 60, 0.25)',
    background: 'rgba(220, 20, 60, 0.06)',
    color: 'crimson',
    borderRadius: 12,
    padding: '10px 12px',
    fontSize: 12,
  },
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

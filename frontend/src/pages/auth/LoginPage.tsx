import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../../services/authService';

export default function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');

    try {
      const res = await login({ email, password: pw });
      localStorage.setItem('access_token', res.accessToken);
      nav('/upload');
    } catch (e: any) {
      setErr(e?.message ?? '로그인 실패');
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '60px auto', padding: 20 }}>
      <h2>로그인</h2>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
        {err && <div style={{ color: 'crimson', fontSize: 12 }}>{err}</div>}
        <button type="submit">로그인</button>
      </form>

      <div style={{ marginTop: 10, fontSize: 14 }}>
        계정이 없나요? <Link to="/signup">회원가입</Link>
      </div>
    </div>
  );
}

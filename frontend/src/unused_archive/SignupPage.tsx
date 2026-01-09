import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signup } from '../../services/authService';

export default function SignupPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [err, setErr] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');

    if (pw !== pw2) {
      setErr('비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      await signup({ email, password: pw });
      nav('/login');
    } catch (e: any) {
      setErr(e?.message ?? '회원가입 실패');
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '60px auto', padding: 20 }}>
      <h2>회원가입</h2>

      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 10 }}>
        <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <input placeholder="Password confirm" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        {err && <div style={{ color: 'crimson', fontSize: 12 }}>{err}</div>}
        <button type="submit">회원가입</button>
      </form>

      <div style={{ marginTop: 10, fontSize: 14 }}>
        이미 계정이 있나요? <Link to="/login">로그인</Link>
      </div>
    </div>
  );
}

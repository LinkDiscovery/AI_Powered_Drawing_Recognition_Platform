import { useSearchParams } from 'react-router-dom';
import Header from './Header';
import Modal from './Modal';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm'; // Assuming these are also here based on file list

export default function LandingPage() {
  const [params, setParams] = useSearchParams();
  const auth = params.get('auth'); // 'login' | 'signup' | null

  const open = auth === 'login' || auth === 'signup';

  function close() {
    setParams({});
  }

  return (
    <div>
      <Header />

      {/* ✅ Smallpdf 느낌 메인 섹션 */}
      <div style={p.wrap}>
        <div style={p.title}>PDF 변환 프로그램</div>

        <div style={p.heroCard}>
          <div style={p.heroIcon}>📄</div>

          <button style={p.pickBtn} onClick={() => alert('여기에 업로드 UI 연결!')}>
            파일 선택 ▾
          </button>

          <div style={p.sub}>또는 파일을 여기로 끌어 놓으세요</div>
        </div>

        <div style={p.bottom}>
          <div style={p.desc}>
            Word, Excel, PowerPoint, 이미지 등 다양한 파일을 PDF로 변환하거나,
            PDF를 다시 원하는 형식으로 손쉽게 바꿔보세요.
          </div>

          <div style={p.checks}>
            <div>✅ 전 세계 사용자 신뢰</div>
            <div>✅ 다양한 변환 지원</div>
            <div>✅ Mac/Windows/iOS/Android 지원</div>
          </div>
        </div>
      </div>

      {/* ✅ 로그인/회원가입 모달 */}
      <Modal
        open={open}
        title={auth === 'signup' ? '무료체험(회원가입)' : '로그인'}
        onClose={close}
      >
        {auth === 'signup' ? <SignupForm /> : <LoginForm />}
      </Modal>
    </div>
  );
}

const p: Record<string, React.CSSProperties> = {
  wrap: { width: 'min(1040px, 100%)', margin: '0 auto', padding: '36px 18px 60px' },
  title: { fontSize: 44, fontWeight: 900, textAlign: 'center', letterSpacing: -0.4 },

  heroCard: {
    marginTop: 26,
    borderRadius: 16,
    background: '#e2262a',
    padding: 40,
    minHeight: 240,
    display: 'grid',
    placeItems: 'center',
    gap: 14,
  },
  heroIcon: { fontSize: 44, color: 'white' },
  pickBtn: {
    borderRadius: 12,
    border: 'none',
    padding: '12px 20px',
    fontWeight: 900,
    cursor: 'pointer',
  },
  sub: { color: 'rgba(255,255,255,0.9)', fontWeight: 700 },

  bottom: {
    marginTop: 22,
    display: 'grid',
    gridTemplateColumns: '1.2fr 0.8fr',
    gap: 18,
    alignItems: 'start',
  },
  desc: { color: '#333', lineHeight: 1.7 },
  checks: { display: 'grid', gap: 10, color: '#111', fontWeight: 700 },
};

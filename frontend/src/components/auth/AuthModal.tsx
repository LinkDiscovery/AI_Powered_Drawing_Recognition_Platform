import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';
import './authModal.css';

/* Icons */
const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18"><path fill="currentColor" d="M17.64 9.2c0-.637-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" /><path fill="currentColor" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.715H.957v2.332A8.997 8.997 0 0 0 9 18z" /><path fill="currentColor" d="M3.964 10.706a5.41 5.41 0 0 1-.282-1.706c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" /><path fill="currentColor" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962l3.007 2.332C4.672 5.163 6.656 3.58 9 3.58z" /></svg>
);
const FacebookIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.791-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
);
const MicrosoftIcon = () => (
    <svg width="18" height="18" viewBox="0 0 23 23" fill="currentColor"><path d="M0 0h10.864v10.702H0V0zm0 11.968h10.864V22.67H0V11.968zm12.13 0H23V22.67H12.13V11.968zm0-11.968H23v10.702H12.13V0z" /></svg>
);
const CheckIcon = () => (
    <div className="checkIcon">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
    </div>
);
const MailIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
        <polyline points="22,6 12,13 2,6"></polyline>
    </svg>
);
const LockIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
);
const EyeIcon = ({ visible }: { visible: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {visible ? (
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        ) : (
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07-2.3 2.3" />
        )}
        {visible && <circle cx="12" cy="12" r="3" />}
        {!visible && <line x1="1" y1="1" x2="23" y2="23" />}
    </svg>
);

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}


export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
    // State to toggle between Login and Sign Up
    const [view, setView] = useState<'login' | 'signup'>('login');
    const { login, signup, googleAuth } = useAuth();

    const handleGoogleLoginSuccess = async (tokenResponse: any) => {
        try {
            await googleAuth(tokenResponse.access_token);
            onClose();
        } catch (error) {
            console.error("Failed to authenticate with Google", error);
            // alert("로그인 처리 중 오류가 발생했습니다.");
        }
    };

    const googleLogin = useGoogleLogin({
        onSuccess: handleGoogleLoginSuccess,
        onError: () => console.log('Google Login Failed'),
        onNonOAuthError: (err) => {
            // Check if client ID is missing/default
            const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
            if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
                console.warn("Google Client ID가 설정되지 않았습니다. backend/.env 파일을 확인해주세요.");
            }
            console.log("Non-OAuth Error:", err);
        }
    });

    const handleGoogleClick = async () => {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        const isConfigured = clientId && clientId !== 'YOUR_GOOGLE_CLIENT_ID_HERE';

        if (!isConfigured) {
            // Mock Login Flow for Development/Testing without Google Cloud Setup
            if (confirm("Google Client ID가 설정되지 않았습니다.\n\n[테스트 모드]\nGoogle 로그인 동작을 시뮬레이션 하시겠습니까?\n(실제 Google 인증은 건너뜁니다)")) {
                const mockToken = "mock_google_token_" + Date.now();
                await handleGoogleLoginSuccess({ access_token: mockToken, isMock: true });
            }
            return;
        }
        googleLogin();
    };

    // Form states
    // Form states
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [rememberId, setRememberId] = useState(false);

    // Load saved email on mount
    useEffect(() => {
        if (isOpen) {
            const savedEmail = localStorage.getItem('savedEmail');
            if (savedEmail) {
                setEmail(savedEmail);
                setRememberId(true);
            }
        }
    }, [isOpen]);

    // Password UI states
    const [showPassword, setShowPassword] = useState(false);
    const [strength, setStrength] = useState(0);
    const [authError, setAuthError] = useState(false);

    // Calculate strength on password change
    useEffect(() => {
        if (!password) {
            setStrength(0);
            return;
        }
        let score = 0;
        if (password.length > 4) score += 1; // Basic length
        if (password.length >= 8) score += 1; // Good length
        if (password.length >= 10 && /[A-Z0-9]/.test(password)) score += 1; // Strong
        setStrength(Math.min(score, 3));
    }, [password]);

    // Reset view to login when modal closes
    useEffect(() => {
        if (!isOpen) {
            setView('login');
            setEmail('');
            setPassword('');
            setName('');
            setAuthError(false);
        }
    }, [isOpen]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError(false); // Reset error
        try {
            if (view === 'login') {
                if (rememberId) {
                    localStorage.setItem('savedEmail', email);
                } else {
                    localStorage.removeItem('savedEmail');
                }
                await login(email, password);
            } else {
                await signup(email, name, password);
            }
            onClose(); // Close modal on success
        } catch (error) {
            // showToast("인증 오류가 발생했습니다.", "error"); // Use local error state instead for modal
            setAuthError(true); // Set error state
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="modalOverlay" onClick={onClose}>
            {/* Stop click prop to prevent closing when clicking inside modal */}
            <div className="authModalShell" onClick={(e) => e.stopPropagation()}>

                {/* Close Button */}
                <button className="authModalClose" onClick={onClose} aria-label="Close">
                    &times;
                </button>

                {/* LEFT PANEL: Form */}
                <div className="authModalLeft">
                    <div className="authFormContainer">
                        <div className="authBrand">
                            {/* Using the text "Smallpdf Pro" to match style since we don't have the exact logo asset handy right now, or reuse existing */}
                            <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: 0 }}>AiDraw Pro</h2>
                        </div>

                        {view === 'login' ? (
                            <>
                                <h1 className="authTitle">AiDraw로 로그인</h1>
                                <p className="authSubtitle">
                                    계정이 없으신가요?{' '}
                                    <a href="#" onClick={(e) => { e.preventDefault(); setView('signup'); }}>
                                        계정 만들기
                                    </a>
                                </p>
                            </>
                        ) : (
                            <>
                                <h1 className="authTitle">계정 만들기</h1>
                                <p className="authSubtitle">
                                    이미 계정이 있으신가요?{' '}
                                    <a href="#" onClick={(e) => { e.preventDefault(); setView('login'); }}>
                                        로그인
                                    </a>
                                </p>
                            </>
                        )}

                        <button className="socialBtn google" onClick={handleGoogleClick}>
                            <span className="icon"><GoogleIcon /></span>
                            Google 계정으로 {view === 'login' ? '계속하기' : '등록'}
                        </button>
                        <button className="socialBtn facebook">
                            <span className="icon"><FacebookIcon /></span>
                            Facebook 계정으로 {view === 'login' ? '계속하기' : '등록'}
                        </button>
                        <button className="socialBtn microsoft">
                            <span className="icon"><MicrosoftIcon /></span>
                            Microsoft 계정으로 {view === 'login' ? '계속하기' : '등록'}
                        </button>

                        <div className="authDivider"><span>또는</span></div>

                        <form onSubmit={handleSubmit}>
                            {view === 'signup' && (
                                <div className="inputGroup">
                                    <label className="inputLabel">이름</label>
                                    <div className="inputWrapper">
                                        <input
                                            type="text"
                                            className="inputField"
                                            placeholder="이름"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required={view === 'signup'}
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="inputGroup">
                                <label className={`inputLabel ${authError ? 'error' : ''}`}>이메일</label>
                                <div className={`inputWrapper ${authError ? 'error' : ''}`}>
                                    <span className="inputIcon"><MailIcon /></span>
                                    <input
                                        type="email"
                                        className="inputField"
                                        placeholder="이메일을 입력하세요"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); if (authError) setAuthError(false); }}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="inputGroup">
                                <label className={`inputLabel ${authError ? 'error' : ''}`}>비밀번호</label>
                                <div className={`inputWrapper passwordWrapper ${authError ? 'error' : ''}`}>
                                    <span className="inputIcon"><LockIcon /></span>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="inputField passwordInput"
                                        placeholder="비밀번호"
                                        value={password}
                                        onChange={(e) => { setPassword(e.target.value); if (authError) setAuthError(false); }}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="passwordToggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                    >
                                        <EyeIcon visible={showPassword} />
                                    </button>
                                </div>
                                {view === 'login' && (
                                    <div className="rememberIdContainer" style={{ marginTop: '8px', display: 'flex', alignItems: 'center' }}>
                                        <input
                                            type="checkbox"
                                            id="rememberId"
                                            checked={rememberId}
                                            onChange={(e) => setRememberId(e.target.checked)}
                                            style={{ marginRight: '6px' }}
                                        />
                                        <label htmlFor="rememberId" style={{ fontSize: '14px', color: '#666', cursor: 'pointer', userSelect: 'none' }}>아이디 저장</label>
                                    </div>
                                )}
                                {view === 'signup' && password.length > 0 && (
                                    <div className="strengthMeter">
                                        <div className={`strengthBar ${strength >= 1 ? 'filled level-' + strength : ''}`} />
                                        <div className={`strengthBar ${strength >= 2 ? 'filled level-' + strength : ''}`} />
                                        <div className={`strengthBar ${strength >= 3 ? 'filled level-' + strength : ''}`} />
                                    </div>
                                )}
                            </div>

                            {authError && (
                                <div className="authErrorMsg">
                                    잘못된 이메일 또는 암호
                                </div>
                            )}

                            <button type="submit" className="submitBtn">
                                {view === 'login' ? '로그인' : '계정 만들기'}
                            </button>
                        </form>

                        {view === 'login' && (
                            <a href="#" className="forgotPass">암호를 잊었나요?</a>
                        )}
                    </div>
                </div>

                {/* RIGHT PANEL: Benefits */}
                <div className="authModalRight">
                    <div className="proBadge">
                        <span role="img" aria-label="crown">👑</span> Pro
                    </div>
                    <h2 className="featureTitle">
                        AiDraw Pro를 사용하면 다음과 같은<br />
                        혜택을 누릴 수 있습니다.
                    </h2>

                    <ul className="featureList">
                        <li className="featureItem"><CheckIcon /> 무제한 다운로드</li>
                        <li className="featureItem"><CheckIcon /> PDF에서 텍스트 편집 및 삭제</li>
                        <li className="featureItem"><CheckIcon /> 강력한 압축</li>
                        <li className="featureItem"><CheckIcon /> OCR로 텍스트 인식</li>
                        <li className="featureItem"><CheckIcon /> 일괄 처리</li>
                        <li className="featureItem"><CheckIcon /> 문서 공유</li>
                        <li className="featureItem"><CheckIcon /> 클라우드 스토리지</li>
                        <li className="featureItem"><CheckIcon /> 디지털 서명</li>
                        <li className="featureItem"><CheckIcon /> AI 도구</li>
                        <li className="featureItem"><CheckIcon /> 기타 다양한 혜택</li>
                    </ul>
                </div>

            </div>
        </div>,
        document.body
    );
}

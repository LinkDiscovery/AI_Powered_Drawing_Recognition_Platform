import { useEffect } from 'react';
import { createPortal } from 'react-dom';
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

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
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

    if (!isOpen) return null;

    return createPortal(
        <div className="modalOverlay" onClick={onClose}>
            {/* Stop click prop to prevent closing when clicking inside modal */}
            <div className="authModalShell" onClick={(e) => e.stopPropagation()}>

                {/* Close Button */}
                <button className="authModalClose" onClick={onClose} aria-label="Close">
                    &times;
                </button>

                {/* LEFT PANEL: Login Form */}
                <div className="authModalLeft">
                    <div className="authFormContainer">
                        <div className="authBrand">
                            {/* Using the text "Smallpdf Pro" to match style since we don't have the exact logo asset handy right now, or reuse existing */}
                            <h2 style={{ fontSize: '24px', fontWeight: 900, marginBottom: 0 }}>Smallpdf Pro</h2>
                        </div>

                        <h1 className="authTitle">Smallpdf로 로그인</h1>
                        <p className="authSubtitle">
                            계정이 없으신가요? <a href="#">계정 만들기</a>
                        </p>

                        <button className="socialBtn google">
                            <span className="icon"><GoogleIcon /></span>
                            Google 계정으로 계속하기
                        </button>
                        <button className="socialBtn facebook">
                            <span className="icon"><FacebookIcon /></span>
                            Facebook 계정으로 계속하기
                        </button>
                        <button className="socialBtn microsoft">
                            <span className="icon"><MicrosoftIcon /></span>
                            Microsoft 계정으로 계속하기
                        </button>

                        <div className="authDivider"><span>또는</span></div>

                        <form onSubmit={(e) => e.preventDefault()}>
                            <div className="inputGroup">
                                <input type="email" className="inputField" placeholder="이메일" />
                            </div>
                            <div className="inputGroup">
                                <input type="password" className="inputField" placeholder="비밀번호" />
                            </div>
                            <button type="submit" className="submitBtn">로그인</button>
                        </form>

                        <a href="#" className="forgotPass">암호를 잊었나요?</a>
                    </div>
                </div>

                {/* RIGHT PANEL: Benefits */}
                <div className="authModalRight">
                    <div className="proBadge">
                        <span role="img" aria-label="crown">👑</span> Pro
                    </div>
                    <h2 className="featureTitle">
                        Smallpdf Pro를 사용하면 다음과 같은<br />
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

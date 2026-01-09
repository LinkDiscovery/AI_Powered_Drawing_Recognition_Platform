// src/components/common/Modal.tsx
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

type ModalVariant = 'center' | 'auth';

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;

  variant?: ModalVariant;

  sideTitle?: string;
  sideItems?: string[];
};

const DEFAULT_SIDE_ITEMS = [
  '무제한 다운로드',
  'PDF에서 텍스트 편집 및 삭제',
  '강력한 압축',
  'OCR로 텍스트 인식',
  '일괄 처리',
  '문서 공유',
  '클라우드 스토리지',
  '디지털 서명',
  'AI 도구',
  '기타 다양한 혜택',
];

export default function Modal({
  open,
  title,
  onClose,
  children,
  variant = 'auth',
  sideTitle = 'Pro를 사용하면 다음과 같은 혜택을 누릴 수 있습니다.',
  sideItems = DEFAULT_SIDE_ITEMS,
}: Props) {
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const overlay = (
    <div className="modalOverlay" onMouseDown={onClose}>
      {variant === 'auth' ? (
        <div
          className="authModalShell authModalEnter"
          onMouseDown={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <button className="authModalClose" onClick={onClose} aria-label="Close">
            ✕
          </button>

          {/* 좌측(폼) */}
          <div className="authModalLeft">
            {/* ✅ 브랜드는 좌측 정렬 */}
            <div className="authModalBrand">AI Drawing Recognition</div>

            {title && <div className="authModalTitle">{title}</div>}

            <div className="authModalBody">{children}</div>
          </div>

          {/* 우측(혜택) */}
          <aside className="authModalRight">
            <div className="authSideBadge">Pro</div>
            <div className="authSideTitle">{sideTitle}</div>

            <ul className="authSideList">
              {sideItems.map((t) => (
                <li key={t} className="authSideItem">
                  <span className="authCheck">✓</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      ) : (
        <div className="centerModal" onMouseDown={(e) => e.stopPropagation()}>
          <div className="centerModalHeader">
            <div className="centerModalTitle">{title}</div>
            <button className="centerModalClose" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
          <div className="centerModalBody">{children}</div>
        </div>
      )}
    </div>
  );

  return createPortal(overlay, document.body);
}

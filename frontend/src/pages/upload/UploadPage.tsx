import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFiles } from '../../context/FileContext';
import './UploadPage.css';

import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function UploadPage() {
  const navigate = useNavigate();
  const { items, addFiles, removeItem, hasItems, selectedId, setSelectedId, claimFile } = useFiles();
  const { isAuthenticated, openLoginModal } = useAuth();
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedDbIds, setSavedDbIds] = useState<Set<number>>(new Set());

  function openFilePicker() {
    inputRef.current?.click();
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function onDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
  }

  async function handleSaveToMyPage(item: any) {
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    if (!item.dbId) {
      showToast("파일이 아직 업로드되지 않았습니다.", 'error');
      return;
    }

    try {
      setSavingIds(prev => new Set(prev).add(item.id));
      await claimFile(item.dbId);
      setSavedDbIds(prev => new Set(prev).add(item.dbId));
      showToast("My Page에 저장되었습니다.", 'success');
    } catch (e) {
      console.error(e);
      showToast("저장 실패", 'error');
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  return (
    <main className="tool-page">
      {/* ... (breadcrumb/header/banner/droplist) ... */}
      {/* Note: I need to target the BUTTON rendering in the map loop. */}
      {/* Since replace_file_content works on contiguous blocks, I have to target the function first then the button separately or together if close. */}
      {/* They are far apart. I will do function first. */}


      {/* 0. Breadcrumb */}
      <div className="tool-breadcrumb">
        <a href="/" className="tool-breadcrumb__home">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        </a>
        <span className="tool-breadcrumb__separator">&gt;</span>
        <span className="tool-breadcrumb__current">AI 도면 분석</span>
      </div>

      <div className="tool-main-content">
        {/* 1. Header (Title) */}
        <section className="tool-header">
          <p className="tool-header__subtitle" style={{ marginTop: 0 }}>
            건축, 건설 도면(PDF, 이미지)을 업로드하여<br />
            텍스트, 심볼, 테이블 정보를 AI로 자동 추출하고 데이터로 변환하세요.
          </p>
        </section>

        {/* 2. Hero Banner (Red Dropzone) */}
        <div className="tool-hero-banner">
          {hasItems ? (
            /* File List Card (White card inside the banner) */
            <div className="uploader-list-card" onClick={(e) => e.stopPropagation()}>
              <div className="uploader-list-header">
                <h3 className="uploader-list-title">분석할 도면 목록 ({items.length})</h3>
              </div>
              <ul className="uploader-items">
                {items.map(it => (
                  <li key={it.id} className="uploader-item">
                    <span className="uploader-item__icon">{it.mime.includes('pdf') ? '📄' : '🖼️'}</span>
                    <span
                      className="uploader-item__name"
                      onClick={() => {
                        setSelectedId(it.id);
                        navigate('/preview');
                      }}
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {it.name}
                    </span>

                    <button
                      className="btn-save-mypage"
                      onClick={() => {
                        if (it.dbId && savedDbIds.has(it.dbId)) {
                          navigate('/dashboard');
                        } else {
                          handleSaveToMyPage(it);
                        }
                      }}
                      disabled={savingIds.has(it.id)}
                      style={{
                        marginRight: '12px',
                        padding: '4px 12px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        background: (it.dbId && savedDbIds.has(it.dbId)) ? '#e6fffa' : '#fff',
                        cursor: 'pointer',
                        color: (it.dbId && savedDbIds.has(it.dbId)) ? '#00796b' : '#333'
                      }}
                    >
                      {savingIds.has(it.id) ? '저장 중...' :
                        (it.dbId && savedDbIds.has(it.dbId)) ? 'My Page에서 보기' :
                          'My Page에 저장하기'}
                    </button>

                    <button className="uploader-item__delete" onClick={() => removeItem(it.id)}>×</button>
                  </li>
                ))}
              </ul>
              <div className="uploader-actions">
                <button className="btn-secondary" onClick={openFilePicker}>+ 도면 추가</button>
                <button
                  className="btn-primary"
                  disabled={items.length === 0}
                  onClick={() => {
                    if (items.length > 0) {
                      if (!selectedId) setSelectedId(items[0].id);
                      navigate('/preview');
                    }
                  }}
                >
                  AI 분석 시작하기 ➔
                </button>
              </div>
            </div>
          ) : (
            /* Dropzone (Dashed Border inside Red Banner) */
            <div
              className={`uploader-dropzone ${isDragOver ? 'uploader-dropzone--active' : ''}`}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={openFilePicker}
            >
              <div className="uploader-icon">
                {/* Blueprint/Scan Icon */}
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>

              <button className="uploader-btn">
                <span>도면 파일 선택</span>
                <span style={{ fontSize: 10, opacity: 0.6 }}>▼</span>
              </button>

              <p className="uploader-text">또는 도면 파일을 여기로 끌어 놓으세요</p>
            </div>
          )}
        </div>

        {/* 3. Features Section */}
        <section className="tool-features">
          <div className="features-grid">
            <div className="feature-card">
              <h3 className="feature-card__title">
                <span className="check-icon">✔</span> AI 기반 자동 객체 인식
              </h3>
              <p className="feature-card__desc">최신 딥러닝 모델이 도면 내의 범례, 심볼, 텍스트를 자동으로 식별합니다.</p>
            </div>
            <div className="feature-card">
              <h3 className="feature-card__title">
                <span className="check-icon">✔</span> 다양한 도면 포맷 지원
              </h3>
              <p className="feature-card__desc">PDF, JPG, PNG 등 다양한 형식의 스캔 도면을 지원합니다.</p>
            </div>
            <div className="feature-card">
              <h3 className="feature-card__title">
                <span className="check-icon">✔</span> 엑셀 데이터 추출
              </h3>
              <p className="feature-card__desc">인식된 데이터를 정리된 엑셀(XLSX) 형태로 즉시 다운로드할 수 있습니다.</p>
            </div>
          </div>
        </section>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        multiple
        onChange={onInputChange}
        style={{ display: 'none' }}
      />
    </main>
  );
}

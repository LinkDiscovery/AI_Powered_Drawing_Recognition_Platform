// src/pages/upload/UploadPage.tsx
import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import PdfViewer from '../../components/PdfViewer';
import Modal from '../../components/common/Modal';
import LoginForm from '../auth/LoginForm';
import SignupForm from '../auth/SignupForm';

import '../../index.css';

type Step = 'upload' | 'preview';
type Status = 'uploading' | 'processing' | 'ready' | 'error';

type UploadItem = {
  id: string;
  name: string;
  sizeText: string;
  progress: number; // 0~100
  status: Status;
  message?: string;
  mime: string;
};

function formatSize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

function isSupported(file: File) {
  const okPdf = file.type === 'application/pdf';
  const okImg = file.type.startsWith('image/');
  return okPdf || okImg;
}

export default function UploadPage() {
  // -----------------------------
  // ✅ Auth modal (쿼리스트링으로 제어)
  // -----------------------------
  const [params, setParams] = useSearchParams();
  const auth = params.get('auth'); // 'login' | 'signup' | null
  const isAuthOpen = auth === 'login' || auth === 'signup';

  function openLogin() {
    setParams({ auth: 'login' });
  }
  function openSignup() {
    setParams({ auth: 'signup' });
  }
  function closeAuth() {
    const next = new URLSearchParams(params);
    next.delete('auth');
    setParams(next, { replace: true });
  }

  // (선택) 로그인 여부: token 있으면 로그인 상태로 간주
  const isLoggedIn = !!localStorage.getItem('access_token');
  function logout() {
    localStorage.removeItem('access_token');
  }

  // -----------------------------
  // ✅ 기존 Upload UI 상태들
  // -----------------------------
  const [step, setStep] = useState<Step>('upload');
  const [projectType, setProjectType] = useState<string>('');
  const [items, setItems] = useState<UploadItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 실제 File 저장(무거운 객체는 state 대신 ref)
  const fileMapRef = useRef<Map<string, File>>(new Map());
  // progress 시뮬레이션 interval 저장
  const intervalMapRef = useRef<Map<string, number>>(new Map());

  const activeItem = useMemo(
    () => (selectedId ? items.find((x) => x.id === selectedId) ?? null : null),
    [items, selectedId]
  );

  const activeFile = useMemo(() => {
    if (!selectedId) return null;
    return fileMapRef.current.get(selectedId) ?? null;
  }, [selectedId]);

  function clearIntervalById(id: string) {
    const t = intervalMapRef.current.get(id);
    if (t) {
      window.clearInterval(t);
      intervalMapRef.current.delete(id);
    }
  }

  function removeItem(id: string) {
    clearIntervalById(id);
    fileMapRef.current.delete(id);
    setItems((prev) => prev.filter((x) => x.id !== id));

    setSelectedId((prevSelected) => {
      if (prevSelected !== id) return prevSelected;

      const remain = items.filter((x) => x.id !== id);
      const ready = remain.find((x) => x.status === 'ready')?.id;
      return ready ?? (remain[0]?.id ?? null);
    });
  }

  function resetAll() {
    for (const id of intervalMapRef.current.keys()) clearIntervalById(id);
    intervalMapRef.current.clear();
    fileMapRef.current.clear();

    setItems([]);
    setSelectedId(null);
    setStep('upload');
  }

  function simulatePipeline(id: string) {
    clearIntervalById(id);

    const intervalId = window.setInterval(() => {
      setItems((prev) => {
        const cur = prev.find((x) => x.id === id);
        if (!cur) return prev;
        if (cur.status !== 'uploading') return prev;

        const next = Math.min(100, cur.progress + 7);

        if (next < 100) {
          return prev.map((x) =>
            x.id === id ? { ...x, progress: next, message: 'Uploading...' } : x
          );
        }

        window.setTimeout(() => clearIntervalById(id), 0);

        window.setTimeout(() => {
          setItems((p) =>
            p.map((x) =>
              x.id === id && x.status === 'processing'
                ? { ...x, status: 'ready', message: 'Ready to preview.' }
                : x
            )
          );
          setSelectedId((prevSelected) => prevSelected ?? id);
        }, 900);

        return prev.map((x) =>
          x.id === id
            ? {
                ...x,
                progress: 100,
                status: 'processing',
                message: 'Rendering pages in background...',
              }
            : x
        );
      });
    }, 120);

    intervalMapRef.current.set(id, intervalId);
  }

  function addFiles(fileList: File[]) {
    if (fileList.length === 0) return;

    const newItems: UploadItem[] = [];

    for (const f of fileList) {
      const id = crypto.randomUUID();
      fileMapRef.current.set(id, f);

      const base: UploadItem = {
        id,
        name: f.name,
        sizeText: formatSize(f.size),
        progress: 0,
        status: 'uploading',
        message: 'Uploading...',
        mime: f.type,
      };

      if (!isSupported(f)) {
        newItems.push({ ...base, status: 'error', message: 'Error: Unsupported file format.' });
      } else {
        newItems.push(base);
      }
    }

    setItems((prev) => [...prev, ...newItems]);
    setSelectedId((prev) => prev ?? (newItems[0]?.id ?? null));

    for (const it of newItems) {
      if (it.status !== 'error') simulatePipeline(it.id);
    }
  }

  function onPickFiles(files: FileList | null) {
    if (!files) return;
    addFiles(Array.from(files));
  }

  function onDropFiles(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    addFiles(Array.from(files));
  }

  function retry(id: string) {
    const f = fileMapRef.current.get(id);
    if (!f) return;

    if (!isSupported(f)) {
      setItems((prev) =>
        prev.map((x) =>
          x.id === id ? { ...x, status: 'error', message: 'Error: Unsupported file format.' } : x
        )
      );
      return;
    }

    setItems((prev) =>
      prev.map((x) =>
        x.id === id ? { ...x, progress: 0, status: 'uploading', message: 'Uploading...' } : x
      )
    );

    simulatePipeline(id);
  }

  const canNext =
    !!activeItem && activeItem.status === 'ready' && !!activeFile && isSupported(activeFile);

  const imageUrl = useMemo(() => {
    if (!activeFile) return '';
    if (!activeFile.type.startsWith('image/')) return '';
    return URL.createObjectURL(activeFile);
  }, [activeFile]);

  return (
    <div className="page">
      {/* ✅ 로그인/회원가입 모달 */}
      <Modal
        open={isAuthOpen}
        title={auth === 'signup' ? '무료체험 시작(회원가입)' : '로그인'}
        onClose={closeAuth}
      >
        {auth === 'signup' ? <SignupForm /> : <LoginForm />}
      </Modal>

      {/* (옵션) 헤더를 UploadPage에서 완전히 없애면, 로그인 버튼이 사라지니까
          헤더는 App/Layout에서 넣고, 여기서는 auth modal만 유지해도 됨.
          단, modal을 열 버튼은 헤더 쪽에서 openLogin/openSignup를 호출할 수 없으니
          "URL로 auth=login/signup" 방식으로 열도록 헤더에서 링크를 걸면 됨.
      */}
      {/* 예: 헤더 버튼이 "/?auth=login" "/?auth=signup" 로 이동하게 만들면 끝 */}

      <div className="pageTitle">File Input Screen</div>

      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Upload New Document</div>
            <div className="cardSub">Upload PDF or images to start processing.</div>
          </div>

          <div className="rightTools">
            <select className="select" value={projectType} onChange={(e) => setProjectType(e.target.value)}>
              <option value="">Select Project/Doc Type (Optional)</option>
              <option value="invoice">Invoice</option>
              <option value="report">Report</option>
              <option value="drawing">Drawing</option>
              <option value="etc">ETC</option>
            </select>
          </div>
        </div>

        {step === 'upload' && (
          <>
            <div className="dropzone" onDragOver={(e) => e.preventDefault()} onDrop={onDropFiles}>
              <div className="cloud">☁</div>
              <div className="dzText">Drag and drop files here or click to browse</div>
              <div className="dzSub">Supported: PDF, JPG, PNG. Max size 50MB.</div>

              <label className="browseBtn">
                Browse
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  multiple
                  onChange={(e) => onPickFiles(e.target.files)}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {items.length > 0 && (
              <div className="fileList">
                {items.map((it) => (
                  <div
                    key={it.id}
                    className="fileRow"
                    style={{
                      marginBottom: 10,
                      outline: it.id === selectedId ? '2px solid #0800ff61' : 'none',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedId(it.id)}
                    title="클릭하면 Preview 대상으로 선택됩니다."
                  >
                    <div className="fileIcon">{it.mime === 'application/pdf' ? '📄' : '🖼️'}</div>

                    <div className="fileMeta">
                      <div className="fileName">{it.name}</div>

                      <div className="fileSub">
                        {it.sizeText}
                        <span className="dot">·</span>
                        <span className={`badge ${it.status}`}>
                          {it.status === 'uploading' && 'Uploading'}
                          {it.status === 'processing' && 'Processing'}
                          {it.status === 'ready' && 'Ready'}
                          {it.status === 'error' && 'Error'}
                        </span>

                        {it.message && (
                          <>
                            <span className="dot">·</span>
                            <span className="muted">{it.message}</span>
                          </>
                        )}
                      </div>

                      <div className="progressWrap">
                        <div className="progressBar">
                          <div className="progressFill" style={{ width: `${it.progress}%` }} />
                        </div>
                        <div className="progressText">{it.progress}%</div>
                      </div>
                    </div>

                    <div className="fileActions" onClick={(e) => e.stopPropagation()}>
                      <button className="btn" onClick={() => retry(it.id)}>
                        Retry
                      </button>
                      <button className="btn" onClick={() => removeItem(it.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bottomBar">
              <button className="btn" disabled>
                Previous
              </button>

              <div className="bottomRight">
                <button className="btn" onClick={resetAll} disabled={items.length === 0}>
                  Clear All
                </button>

                <button
                  className="btn primary"
                  onClick={() => setStep('preview')}
                  disabled={!canNext}
                  title={!canNext ? 'Ready 상태의 파일을 선택해야 미리보기 가능합니다.' : ''}
                >
                  Next (Preview)
                </button>
              </div>
            </div>
          </>
        )}

        {step === 'preview' && (
          <>
            <div className="previewHeader">
              <button className="btn" onClick={() => setStep('upload')}>
                ◀ Back
              </button>

              <div className="previewTitle">Preview</div>
              <div className="spacer" />

              <button className="btn" onClick={resetAll}>
                New Document
              </button>
            </div>

            <div className="previewBody">
              {!activeFile && <div style={{ fontSize: 12, color: '#666' }}>선택된 파일이 없습니다.</div>}

              {activeFile?.type === 'application/pdf' && <PdfViewer file={activeFile} />}

              {activeFile && activeFile.type.startsWith('image/') && (
                <div className="imagePreview">
                  <img src={imageUrl} alt="preview" style={{ maxWidth: '100%', borderRadius: 10 }} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

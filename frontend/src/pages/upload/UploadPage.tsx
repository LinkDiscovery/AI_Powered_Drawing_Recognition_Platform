import { useMemo, useRef, useState } from 'react';

type Step = 'upload' | 'preview';
type Status = 'idle' | 'uploading' | 'processing' | 'ready' | 'error';

type UploadItem = {
  id: string;
  name: string;
  sizeText: string;
  progress: number; // 0~100
  status: Status;
  message?: string;
  mime: string;
  file?: File;
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

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function UploadPage() {
  const [step, setStep] = useState<Step>('upload');
  const [items, setItems] = useState<UploadItem[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const hasItems = items.length > 0;

  const canGoPreview = useMemo(() => {
    return items.some((it) => it.status === 'ready' || it.status === 'processing' || it.status === 'uploading');
  }, [items]);

  function openFilePicker() {
    inputRef.current?.click();
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const next: UploadItem[] = [];
    for (const file of Array.from(fileList)) {
      if (!isSupported(file)) {
        next.push({
          id: uid(),
          name: file.name,
          sizeText: formatSize(file.size),
          progress: 0,
          status: 'error',
          message: '지원하지 않는 파일 형식입니다. (PDF/이미지만 가능)',
          mime: file.type,
          file,
        });
        continue;
      }

      next.push({
        id: uid(),
        name: file.name,
        sizeText: formatSize(file.size),
        progress: 0,
        status: 'uploading',
        message: '업로드 준비 중...',
        mime: file.type,
        file,
      });
    }

    setItems((prev) => [...next, ...prev]);

    // ✅ 지금은 더미 업로드/처리 진행률 시뮬레이션
    // (나중에 API 붙일 때 이 부분 교체)
    next.forEach((it) => {
      if (it.status === 'error') return;

      const id = it.id;

      // uploading → processing → ready
      let p = 0;
      const timer = window.setInterval(() => {
        p += 8;
        setItems((prev) =>
          prev.map((x) => {
            if (x.id !== id) return x;
            const nextP = Math.min(100, p);

            if (nextP < 60) {
              return { ...x, progress: nextP, status: 'uploading', message: '업로드 중...' };
            }
            if (nextP < 95) {
              return { ...x, progress: nextP, status: 'processing', message: '변환 준비 중...' };
            }
            if (nextP >= 100) {
              return { ...x, progress: 100, status: 'ready', message: 'Ready' };
            }
            return { ...x, progress: nextP, status: 'processing', message: '처리 중...' };
          })
        );

        if (p >= 100) window.clearInterval(timer);
      }, 120);
    });
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(e.target.files);
    // 같은 파일 다시 선택 가능하도록 value 초기화
    e.target.value = '';
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        {/* ✅ 상단 제목/설명(노란 헤더 아래 흰 영역) */}
        <div style={styles.hero}>
          <h1 style={styles.h1}>AiDraw</h1>
          <p style={styles.p}>
            AI 도면 분석 및 변환 플랫폼 - 도면을 업로드하고 분석을 시작하세요.
          </p>
        </div>

        {/* ✅ 업로드 드롭존 */}
        {step === 'upload' ? (
          <>
            <div
              style={styles.dropzone}
              onDrop={onDrop}
              onDragOver={onDragOver}
              role="button"
              tabIndex={0}
              onClick={openFilePicker}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,image/*"
                multiple
                onChange={onInputChange}
                style={{ display: 'none' }}
              />

              <div style={styles.dropInner}>
                <div style={styles.dropIcon}>📄</div>
                <div style={styles.dropText}>
                  <div style={styles.dropTitle}>파일을 여기에 끌어다 놓으세요</div>
                  <div style={styles.dropSub}>또는 클릭해서 파일을 선택하세요 (PDF/이미지)</div>
                </div>

                <button type="button" style={styles.primaryBtn} onClick={(e) => { e.stopPropagation(); openFilePicker(); }}>
                  파일 선택
                </button>
              </div>
            </div>

            {/* ✅ 업로드 리스트 */}
            {hasItems ? (
              <section style={styles.list}>
                <div style={styles.listHeader}>
                  <div style={styles.listTitle}>업로드 목록</div>

                  <button
                    type="button"
                    style={{ ...styles.primaryBtn, opacity: canGoPreview ? 1 : 0.5, cursor: canGoPreview ? 'pointer' : 'not-allowed' }}
                    disabled={!canGoPreview}
                    onClick={() => setStep('preview')}
                  >
                    미리보기로
                  </button>
                </div>

                <ul style={styles.ul}>
                  {items.map((it) => (
                    <li key={it.id} style={styles.row}>
                      <div style={styles.rowLeft}>
                        <div style={styles.fileIcon}>{it.mime === 'application/pdf' ? '📄' : '🖼️'}</div>
                        <div>
                          <div style={styles.fileName}>{it.name}</div>
                          <div style={styles.fileMeta}>
                            {it.sizeText} <span style={styles.dot}>·</span> <b>{it.status}</b>
                            {it.message ? (
                              <>
                                <span style={styles.dot}>·</span> <span style={styles.muted}>{it.message}</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div style={styles.rowRight}>
                        <div style={styles.progressWrap}>
                          <div style={{ ...styles.progressBar, width: `${it.progress}%` }} />
                        </div>
                        <button type="button" style={styles.ghostBtn} onClick={() => removeItem(it.id)}>
                          삭제
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : (
          /* ✅ preview step(지금은 더미 화면) */
          <section style={styles.preview}>
            <div style={styles.previewHeader}>
              <div>
                <div style={styles.listTitle}>미리보기</div>
                <div style={styles.muted}>여기에 PDF 뷰어/변환 옵션 UI를 붙일 예정</div>
              </div>

              <button type="button" style={styles.ghostBtn} onClick={() => setStep('upload')}>
                업로드로 돌아가기
              </button>
            </div>

            <div style={styles.previewBody}>
              <div style={styles.previewBox}>[PDF/이미지 미리보기 영역]</div>
              <div style={styles.previewBox}>[변환 옵션/출력 포맷 선택 영역]</div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

/** ✅ 임시 인라인 스타일 (나중에 css/tailwind로 교체하면 됨) */
const styles: Record<string, React.CSSProperties> = {
  page: {
    background: '#f6f7f9',
    minHeight: 'calc(100vh - 60px)',
    padding: '24px 12px',
  },
  container: {
    maxWidth: 980,
    margin: '0 auto',
  },
  hero: {
    marginBottom: 16,
  },
  h1: {
    margin: 0,
    fontSize: 28,
    fontWeight: 900,
  },
  p: {
    margin: '8px 0 0',
    color: '#444',
  },

  dropzone: {
    border: '2px dashed #cbd5e1',
    borderRadius: 16,
    background: '#fff',
    padding: 18,
    cursor: 'pointer',
  },
  dropInner: {
    display: 'flex',
    gap: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  dropIcon: {
    fontSize: 28,
  },
  dropText: {
    flex: 1,
    minWidth: 240,
  },
  dropTitle: {
    fontWeight: 900,
    fontSize: 16,
  },
  dropSub: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 13,
  },

  primaryBtn: {
    border: 0,
    borderRadius: 12,
    padding: '10px 14px',
    fontWeight: 800,
    background: '#111827',
    color: '#fff',
  },
  ghostBtn: {
    border: '1px solid #cbd5e1',
    borderRadius: 12,
    padding: '8px 12px',
    background: '#fff',
    fontWeight: 800,
  },

  list: {
    marginTop: 16,
    background: '#fff',
    borderRadius: 16,
    padding: 14,
    border: '1px solid #e5e7eb',
  },
  listHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  listTitle: {
    fontWeight: 900,
    fontSize: 16,
  },
  ul: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'grid',
    gap: 10,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
    border: '1px solid #eef2f7',
    borderRadius: 14,
  },
  rowLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  fileIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    display: 'grid',
    placeItems: 'center',
    background: '#f1f5f9',
    flex: '0 0 auto',
  },
  fileName: {
    fontWeight: 900,
    maxWidth: 520,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fileMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#475569',
  },
  dot: {
    margin: '0 6px',
    color: '#94a3b8',
  },
  muted: {
    color: '#64748b',
  },
  rowRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flex: '0 0 auto',
  },
  progressWrap: {
    width: 160,
    height: 10,
    background: '#eef2f7',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    background: '#22c55e',
    width: '0%',
  },

  preview: {
    background: '#fff',
    borderRadius: 16,
    padding: 14,
    border: '1px solid #e5e7eb',
  },
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  previewBody: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: 12,
  },
  previewBox: {
    border: '1px solid #eef2f7',
    borderRadius: 16,
    minHeight: 360,
    display: 'grid',
    placeItems: 'center',
    color: '#64748b',
  },
};

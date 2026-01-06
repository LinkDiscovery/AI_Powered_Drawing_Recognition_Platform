import { useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

type PdfViewerProps = {
  file: File | null;
};

export default function PdfViewer({ file }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [pdf, setPdf] = useState<any>(null);
  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);

  const [scale, setScale] = useState(1.2);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);

  const [loadingDoc, setLoadingDoc] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState('');

  const fileName = file?.name ?? '';
  const fileSize = useMemo(() => {
    if (!file) return '';
    const mb = file.size / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  }, [file]);

  // 1) 파일이 바뀌면 PDF 문서를 "한 번만" 로드해서 캐싱
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError('');
      setPdf(null);
      setPageCount(0);
      setPage(1);

      if (!file) return;

      try {
        setLoadingDoc(true);
        const arrayBuffer = await file.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (cancelled) return;

        setPdf(doc);
        setPageCount(doc.numPages);
      } catch (e: any) {
        setError(e?.message ?? 'PDF 로딩 중 오류가 발생했습니다.');
      } finally {
        if (!cancelled) setLoadingDoc(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [file]);

  // 2) 페이지/스케일/회전이 바뀌면 렌더
  useEffect(() => {
    let cancelled = false;
    let renderTask: any = null;

    async function render() {
      setError('');
      if (!pdf) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        setRendering(true);

        const safePage = Math.min(Math.max(1, page), pageCount || 1);
        if (safePage !== page) {
          setPage(safePage);
          return;
        }

        const pdfPage = await pdf.getPage(safePage);
        const viewport = pdfPage.getViewport({ scale, rotation });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        // 취소 가능한 렌더 태스크(페이지 빨리 넘길 때 잔상/충돌 방지)
        renderTask = pdfPage.render({ canvas, viewport });
        await renderTask.promise;

        if (cancelled) return;
      } catch (e: any) {
        // 렌더 취소는 정상 케이스라 조용히 무시
        const msg = e?.message ?? '';
        if (!msg.toLowerCase().includes('cancel')) {
          setError(msg || 'PDF 렌더링 중 오류가 발생했습니다.');
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    }

    render();

    return () => {
      cancelled = true;
      try {
        renderTask?.cancel?.();
      } catch {}
    };
  }, [pdf, page, pageCount, scale, rotation]);

  const canPrev = !!pdf && page > 1;
  const canNext = !!pdf && pageCount > 0 && page < pageCount;

  function zoomIn() {
    setScale((s) => Math.min(4, Math.round((s + 0.1) * 10) / 10));
  }
  function zoomOut() {
    setScale((s) => Math.max(0.4, Math.round((s - 0.1) * 10) / 10));
  }

  // 컨테이너 폭에 맞춤(대충 900px 기준 → 실제 UI 폭에 맞춰도 됨)
  function fitWidth() {
    // 현재는 간단히 "보기 좋은 고정값"으로 맞춤
    // 다음 단계에서 실제 컨테이너 width 계산해서 정확히 맞출 수도 있음
    setScale(1.5);
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {/* 상단 정보/컨트롤 바 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          border: '1px solid #e5e5e5',
          borderRadius: 10,
          background: '#fafafa',
        }}
      >
        <div style={{ fontWeight: 600, marginRight: 8 }}>PDF 미리보기</div>

        {file ? (
          <div style={{ fontSize: 12, color: '#555' }}>
            {fileName} · {fileSize}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: '#777' }}>파일을 업로드하면 표시됩니다.</div>
        )}

        <div style={{ flex: 1 }} />

        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!canPrev}>
          ◀
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            value={page}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (Number.isFinite(v)) setPage(v);
            }}
            disabled={!pdf}
            style={{ width: 64, padding: '6px 8px', borderRadius: 8, border: '1px solid #ddd' }}
          />
          <span style={{ fontSize: 12, color: '#555' }}>/ {pageCount || '-'}</span>
        </div>

        <button onClick={() => setPage((p) => Math.min(pageCount || 1, p + 1))} disabled={!canNext}>
          ▶
        </button>

        <span style={{ width: 10 }} />

        <button onClick={zoomOut} disabled={!pdf}>
          -
        </button>
        <div style={{ fontSize: 12, minWidth: 54, textAlign: 'center' }}>
          {Math.round(scale * 100)}%
        </div>
        <button onClick={zoomIn} disabled={!pdf}>
          +
        </button>

        <button onClick={fitWidth} disabled={!pdf}>
          폭 맞춤
        </button>

        <button
          onClick={() =>
            setRotation((r) => ((r + 90) % 360) as 0 | 90 | 180 | 270)
          }
          disabled={!pdf}
        >
          회전
        </button>
      </div>

      {/* 상태 표시 */}
      {(loadingDoc || rendering) && (
        <div style={{ fontSize: 12, color: '#555' }}>
          {loadingDoc ? 'PDF 로딩 중…' : '페이지 렌더링 중…'}
        </div>
      )}
      {error && <div style={{ color: 'crimson', fontSize: 12 }}>{error}</div>}

      {/* 캔버스 영역 */}
      <div
        style={{
          border: '1px solid #ddd',
          borderRadius: 12,
          padding: 10,
          background: 'white',
          overflow: 'auto',
          maxHeight: 720,
        }}
      >
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

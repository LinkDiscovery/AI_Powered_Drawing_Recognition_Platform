import { useEffect, useMemo, useRef, useState } from 'react';
import SelectionOverlay, { type BBox } from './SelectionOverlay';

import * as pdfjsLib from 'pdfjs-dist';

// Worker Setup
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export type ToolType = 'none' | 'title' | 'front' | 'side' | 'plan';

type PdfViewerProps = {
  file: File | null;
  onSaveSelection?: (bboxes: BBox[]) => void;
  initialSelection?: { x: number, y: number, width: number, height: number } | null;
  initialBBoxes?: BBox[]; // Support for multiple boxes
  activeTool: ToolType; // New Prop
  onToolChange: (tool: ToolType) => void; // New Prop (though mainly controlled by parent)
};

// Button Styles
const iconBtnStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  padding: '6px',
  borderRadius: 6,
  display: 'grid',
  placeItems: 'center',
  color: '#444',
  transition: 'background 0.2s',
};

export default function PdfViewer({ file, onSaveSelection, initialSelection, initialBBoxes, activeTool, onToolChange }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [pdf, setPdf] = useState<any>(null);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  const [pageCount, setPageCount] = useState(0);
  const [page, setPage] = useState(1);

  const [scale, setScale] = useState(1.2);
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);

  const [loadingDoc, setLoadingDoc] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState('');


  // Multi-Category BBox State
  const [bboxes, setBBoxes] = useState<BBox[]>([]);

  // Banner Drag State
  const [bannerPos, setBannerPos] = useState({ x: 0, y: 60 });
  const isDraggingBanner = useRef(false);
  const bannerDragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingBanner.current) return;
      e.preventDefault();
      const dx = e.clientX - bannerDragStart.current.x;
      const dy = e.clientY - bannerDragStart.current.y;
      bannerDragStart.current = { x: e.clientX, y: e.clientY };
      setBannerPos(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    };
    const handleMouseUp = () => { isDraggingBanner.current = false; };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onToolChange('none');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToolChange]);

  // Load Initial Selection
  useEffect(() => {
    if (file && initialBBoxes && initialBBoxes.length > 0) {
      setBBoxes(initialBBoxes);
    } else if (file && initialSelection) {
      setBBoxes([{
        id: 'initial-title',
        type: 'title',
        rect: initialSelection
      }]);
    } else {
      setBBoxes([]);
    }
  }, [initialSelection, initialBBoxes, file]); // Reset on file change

  const fileName = file?.name ?? '';
  const fileSize = useMemo(() => {
    if (!file) return '';
    return `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
  }, [file]);

  // Document Loading (same as before)
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError(''); setPdf(null); setImageObj(null); setPageCount(0); setPage(1);
      if (!file) return;
      try {
        setLoadingDoc(true);
        if (file.type.startsWith('image/')) {
          const img = new Image();
          img.src = URL.createObjectURL(file);
          await img.decode();
          if (cancelled) return;
          setImageObj(img);
          setPageCount(1);
        } else {
          const ab = await file.arrayBuffer();
          const doc = await pdfjsLib.getDocument({ data: ab }).promise;
          if (cancelled) return;
          setPdf(doc);
          setPageCount(doc.numPages);
        }
      } catch (e: any) {
        setError(e?.message ?? '오류 발생');
      } finally {
        if (!cancelled) setLoadingDoc(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [file]);

  // Rendering (same as before)
  useEffect(() => {
    let cancelled = false;
    let renderTask: any = null;
    async function render() {
      setError('');
      if ((!pdf && !imageObj) || !canvasRef.current) return;
      try {
        setRendering(true);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (imageObj) {
          const { naturalWidth: w, naturalHeight: h } = imageObj;
          const isVert = rotation === 90 || rotation === 270;
          canvas.width = Math.floor((isVert ? h : w) * scale);
          canvas.height = Math.floor((isVert ? w : h) * scale);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.scale(scale, scale);
          ctx.drawImage(imageObj, -w / 2, -h / 2);
          ctx.restore();
        } else if (pdf) {
          const safePage = Math.min(Math.max(1, page), pageCount || 1);
          if (safePage !== page) { setPage(safePage); return; }
          const p = await pdf.getPage(safePage);
          const vp = p.getViewport({ scale, rotation });
          canvas.width = Math.floor(vp.width);
          canvas.height = Math.floor(vp.height);
          renderTask = p.render({ canvas, viewport: vp });
          await renderTask.promise;
        }
      } catch (e: any) {
        if (!e?.message?.toLowerCase().includes('cancel')) setError(e.message);
      } finally {
        if (!cancelled) setRendering(false);
      }
    }
    render();
    return () => { cancelled = true; renderTask?.cancel?.(); };
  }, [pdf, imageObj, page, pageCount, scale, rotation]);


  // Auto Fit Logic
  const [isAutoFit, setIsAutoFit] = useState(true);
  const fitWidth = async (force = false) => {
    if ((!force && !isAutoFit) || (!pdf && !imageObj)) return;
    try {
      let w = 0;
      if (imageObj) w = imageObj.naturalWidth;
      else if (pdf) {
        const p = await pdf.getPage(page);
        w = p.getViewport({ scale: 1.0 }).width;
      }
      const container = canvasRef.current?.parentElement?.parentElement;
      if (container && w > 0) {
        // 여백(padding) 등 고려하여 약간 작게 잡음
        let calculatedScale = (container.clientWidth - 40) / w;

        // ✅ Smart Fit: 
        // 1. 화면보다 크면 화면에 맞춤 (calculatedScale < 1)
        // 2. 화면보다 작으면 굳이 늘리지 않고 100% 유지 (calculatedScale > 1 -> 1.0)
        // 단, force=true(버튼 클릭 등)인 경우는 꽉 차게 늘림
        const targetScale = force ? calculatedScale : Math.min(calculatedScale, 1.0);

        // ✅ 0이 되거나 무한히 작아지는 것 방지 (최소 0.1, 최대 4.0)
        const activeScale = Math.floor(Math.min(Math.max(targetScale, 0.1), 4.0) * 100) / 100;

        setScale(prev => {
          if (Math.abs(prev - activeScale) < 0.02) return prev;
          return activeScale;
        });
      }
    } catch { }
  };

  // ✅ 높이 맞춤 (Page Fit)
  const fitHeight = async () => {
    if (!pdf && !imageObj) return;
    setIsAutoFit(false); // 높이 맞춤은 '자동 폭 맞춤' 해제
    try {
      let h = 0;
      if (imageObj) h = imageObj.naturalHeight;
      else if (pdf) {
        const p = await pdf.getPage(page);
        h = p.getViewport({ scale: 1.0 }).height;
      }
      const scrollContainer = canvasRef.current?.parentElement?.parentElement;
      if (scrollContainer && h > 0) {
        // 상하 여백 40px
        const newScale = (scrollContainer.clientHeight - 40) / h;
        const safeScale = Math.min(5.0, Math.max(0.1, Math.floor(newScale * 100) / 100));
        setScale(safeScale);
      }
    } catch { }
  };

  useEffect(() => { if (pdf || imageObj) setIsAutoFit(true); }, [pdf, imageObj]);
  useEffect(() => {
    fitWidth();
    const t = setTimeout(() => fitWidth(), 100);
    const container = canvasRef.current?.parentElement?.parentElement;
    let obs: ResizeObserver | null = null;
    if (container) {
      obs = new ResizeObserver(() => fitWidth());
      obs.observe(container);
    }
    return () => { clearTimeout(t); obs?.disconnect(); };
  }, [pdf, imageObj, page, isAutoFit]);


  // Zoom / Pan / Input Logic (Simplified for brevity as it was correct)
  const isDraggingZoom = useRef(false);
  const lastMouseY = useRef(0);
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.ctrlKey) {
      isDraggingZoom.current = true;
      lastMouseY.current = e.clientY;
      e.preventDefault();
      document.body.style.cursor = 'ns-resize';
    }
  };
  useEffect(() => {
    const mm = (e: MouseEvent) => {
      if (!isDraggingZoom.current) return;
      const dy = lastMouseY.current - e.clientY;
      lastMouseY.current = e.clientY;
      if (dy !== 0) {
        setIsAutoFit(false);
        setScale(s => Math.min(5.0, Math.max(0.1, s + dy * 0.01)));
      }
    };
    const mu = () => { isDraggingZoom.current = false; document.body.style.cursor = ''; };
    window.addEventListener('mousemove', mm);
    window.addEventListener('mouseup', mu);
    return () => { window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); };
  }, []);

  const [zoomStep, setZoomStep] = useState<1 | 10>(10);
  const zoomIn = () => { setIsAutoFit(false); setScale(s => Math.min(5, Math.round((s + zoomStep / 100) * 100) / 100)); };
  const zoomOut = () => { setIsAutoFit(false); setScale(s => Math.max(0.1, Math.round((s - zoomStep / 100) * 100) / 100)); };
  const [zoomInput, setZoomInput] = useState('');
  useEffect(() => setZoomInput(Math.round(scale * 100).toString()), [scale]);
  const handleZoomCommit = () => {
    let v = parseFloat(zoomInput);
    if (Number.isNaN(v)) { setZoomInput(Math.round(scale * 100).toString()); return; }
    v = Math.max(10, Math.min(500, v));
    setIsAutoFit(false); setScale(v / 100); setZoomInput(v.toString());
  };

  const [isMaximized, setIsMaximized] = useState(false);
  const handleFitWidth = () => { setIsAutoFit(true); fitWidth(true); };
  const handleFitHeight = () => { fitHeight(); };

  const containerStyle: React.CSSProperties = isMaximized ? {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: '#f0f0f0', padding: 20, display: 'flex', flexDirection: 'column', gap: 12
  } : { display: 'grid', gap: 12, width: '100%' };

  const canvasContainerStyle: React.CSSProperties = {
    border: '1px solid #ddd', borderRadius: 12, padding: 10, background: 'white', overflow: 'auto',
    ...(isMaximized ? { flex: 1, maxHeight: 'none' } : { maxHeight: 900, minHeight: 500 })
  };

  // STYLES
  const controlBarStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
    border: '1px solid #ebecf0', borderRadius: 16, background: '#fff',
    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
    marginBottom: 16,
    flexWrap: 'wrap'
  };

  const pillStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center',
    background: '#f7f9fc', borderRadius: 20, padding: '4px 6px',
    border: '1px solid #e1e5ea'
  };

  const separatorStyle: React.CSSProperties = {
    width: 1, height: 24, background: '#e1e5ea', margin: '0 8px'
  };

  const actionBtnStyle: React.CSSProperties = {
    ...iconBtnStyle,
    width: 32, height: 32, borderRadius: 12,
    background: 'transparent',
    color: '#5f6368',
    transition: 'all 0.2s',
  };

  return (
    <div style={containerStyle}>
      {/* Control Bar */}
      <div style={controlBarStyle}>
        {/* Title Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 'auto' }}>
          <span style={{ fontSize: 18 }}>📄</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#172b4d' }}>PDF 미리보기</span>
            {file && <span style={{ fontSize: 11, color: '#6b778c' }}>{fileName} · {fileSize}</span>}
          </div>
        </div>

        {/* Center Controls: Page & Zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>

          {/* Page Nav */}
          <div style={pillStyle}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={!pdf && page <= 1}
              style={{ ...actionBtnStyle, width: 28, height: 28 }}
              onMouseEnter={e => e.currentTarget.style.background = '#ebecf0'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              ◀
            </button>
            <div style={{ padding: '0 12px', display: 'flex', alignItems: 'center', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#172b4d' }}>{page}</span>
              <span style={{ fontSize: 14, color: '#97a0af', margin: '0 4px' }}>/</span>
              <span style={{ fontSize: 14, color: '#6b778c' }}>{pageCount || '-'}</span>
            </div>
            <button
              onClick={() => setPage(p => Math.min(pageCount, p + 1))}
              disabled={!pdf && page >= pageCount}
              style={{ ...actionBtnStyle, width: 28, height: 28 }}
              onMouseEnter={e => e.currentTarget.style.background = '#ebecf0'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              ▶
            </button>
          </div>

          <div style={separatorStyle} />

          <div style={pillStyle}>
            <button
              onClick={() => setZoomStep(s => s === 1 ? 10 : 1)}
              style={{ ...actionBtnStyle, width: 'auto', padding: '0 8px', fontSize: 11, background: zoomStep === 10 ? '#ebecf0' : 'transparent', fontWeight: 600, color: zoomStep === 10 ? '#0052cc' : '#5e6c84', marginRight: 4 }}
              title={zoomStep === 1 ? "현재: 1% 단위" : "현재: 10% 단위"}
            >
              {zoomStep}%
            </button>
            <div style={{ padding: '0 8px', color: '#5e6c84', display: 'flex', alignItems: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>

            <button
              onClick={zoomOut}
              disabled={!pdf && !imageObj}
              style={{ ...actionBtnStyle, width: 28, height: 28 }}
              onMouseEnter={e => e.currentTarget.style.background = '#ebecf0'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              -
            </button>

            <input
              value={zoomInput}
              onChange={e => setZoomInput(e.target.value)}
              onBlur={handleZoomCommit}
              onKeyDown={e => e.key === 'Enter' && handleZoomCommit()}
              disabled={!pdf && !imageObj}
              style={{
                width: 44, textAlign: 'center', border: 'none', background: 'transparent',
                fontSize: 14, fontWeight: 600, color: '#172b4d', outline: 'none'
              }}
            />
            <span style={{ fontSize: 13, color: '#6b778c', marginRight: 4 }}>%</span>

            <button
              onClick={zoomIn}
              disabled={!pdf && !imageObj}
              style={{ ...actionBtnStyle, width: 28, height: 28 }}
              onMouseEnter={e => e.currentTarget.style.background = '#ebecf0'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              +
            </button>
          </div>

        </div>

        <div style={{ marginRight: 'auto' }} />

        {/* Right Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleFitWidth}
            style={actionBtnStyle}
            title="폭 맞춤"
            onMouseEnter={e => e.currentTarget.style.background = '#ebecf0'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </button>
          <button
            onClick={handleFitHeight}
            style={actionBtnStyle}
            title="전체 보기 (높이 맞춤)"
            onMouseEnter={e => e.currentTarget.style.background = '#ebecf0'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
            </svg>
          </button>
          <button
            onClick={() => setRotation(r => ((r + 90) % 360) as any)}
            style={actionBtnStyle}
            title="회전"
            onMouseEnter={e => e.currentTarget.style.background = '#ebecf0'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            ↻
          </button>
          <button
            onClick={() => setIsMaximized(!isMaximized)}
            style={{
              ...actionBtnStyle,
              width: 'auto', padding: '0 12px', fontSize: 13, fontWeight: 600
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#ebecf0'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {isMaximized ? '축소' : '최대화'}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ ...canvasContainerStyle, position: 'relative' }} onMouseDown={handleMouseDown}>
        {activeTool !== 'none' && (
          <div
            onMouseDown={(e) => {
              if ((e.target as HTMLElement).tagName.toLowerCase() === 'button') return;
              isDraggingBanner.current = true;
              bannerDragStart.current = { x: e.clientX, y: e.clientY };
            }}
            style={{
              position: 'fixed',
              top: 20, left: '50%',
              transform: `translate(calc(-50% + ${bannerPos.x}px), ${bannerPos.y}px)`,
              zIndex: 9999,
              background: 'rgba(23, 43, 77, 0.95)', // Darker navy
              backdropFilter: 'blur(8px)',
              color: 'white',
              padding: '10px 20px',
              borderRadius: 30,
              display: 'flex', alignItems: 'center', gap: 16,
              boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
              fontSize: 14, fontWeight: 500,
              cursor: 'move', userSelect: 'none',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✨</span> 마우스로 영역을 드래그하세요
            </span>
            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.2)' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => onSaveSelection?.(bboxes)}
                style={{ background: '#0052cc', color: 'white', border: 'none', borderRadius: 16, padding: '6px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#0747a6'}
                onMouseLeave={e => e.currentTarget.style.background = '#0052cc'}
              >
                전체 저장 ({bboxes.length})
              </button>
              <button
                onClick={() => setBBoxes([])}
                style={{ background: 'rgba(255, 86, 48, 0.1)', color: '#ff5630', border: '1px solid rgba(255, 86, 48, 0.3)', borderRadius: 16, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 86, 48, 0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 86, 48, 0.1)'}
              >
                전체 삭제
              </button>
              <button onClick={() => onToolChange('none')} style={{ background: 'transparent', color: '#c1c7d0', border: '1px solid #c1c7d0', borderRadius: 16, padding: '6px 14px', fontSize: 12, cursor: 'pointer' }}>닫기(ESC)</button>
            </div>
          </div>
        )}

        <div style={{ position: 'relative', width: 'fit-content', margin: '0 auto' }}>
          <canvas ref={canvasRef} style={{ display: 'block' }} />
          <SelectionOverlay
            isActive={activeTool !== 'none'}
            activeTool={activeTool}
            scale={scale}
            bboxes={bboxes}
            onChange={setBBoxes}
          />
        </div>
      </div>
      {error && <div style={{ color: 'red', padding: 20, textAlign: 'center' }}>⚠️ {error}</div>}
      {(loadingDoc || rendering) && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div className="spinner" style={{ width: 32, height: 32, border: '3px solid #ebecf0', borderTopColor: '#0052cc', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 14, color: '#5e6c84', fontWeight: 500 }}>불러오는 중...</span>
        </div>
      )}
      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

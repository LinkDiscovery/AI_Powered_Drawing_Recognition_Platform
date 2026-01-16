// React 훅들 import: useEffect(사이드이펙트), useMemo(메모이제이션), useRef(DOM 참조), useState(상태)
import { useEffect, useMemo, useRef, useState } from 'react';
import SelectionOverlay from './SelectionOverlay';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
// pdf.js 라이브러리 import (PDF 로드/페이지 렌더링)
import * as pdfjsLib from 'pdfjs-dist';

// ✅ pdf.js는 별도의 Web Worker에서 PDF 파싱/렌더링을 수행함
// worker 파일 경로를 지정하지 않으면 로딩 실패하는 경우가 많아 명시적으로 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  // pdf.js 워커 번들 경로(ESM)
  'pdfjs-dist/build/pdf.worker.min.mjs',
  // 현재 모듈 기준 상대 경로 해결에 사용(Vite 환경)
  import.meta.url
).toString(); // URL 객체를 문자열로 변환하여 workerSrc로 넣어줌

// 이 컴포넌트가 받을 props 타입 정의
type PdfViewerProps = {
  // 외부에서 전달받는 파일(없으면 null)
  file: File | null;
  // 선택 영역 저장 콜백
  onSaveSelection?: (rect: { x: number, y: number, width: number, height: number } | null) => void;
  // 초기 선택 영역 (저장된 값)
  initialSelection?: { x: number, y: number, width: number, height: number } | null;
};

// Button style constant
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

// PdfViewer 컴포넌트 export (PDF 미리보기 담당)
export default function PdfViewer({ file, onSaveSelection, initialSelection }: PdfViewerProps) {
  // ... existing code ...


  // ✅ canvas DOM을 직접 조작해야 하므로 ref로 캔버스 요소를 잡아둠
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ✅ pdf 문서 객체(= pdfjsLib.getDocument(...) 결과) 상태로 저장
  const [pdf, setPdf] = useState<any>(null);
  // ✅ 이미지 객체 상태 저장 (PDF가 아닐 경우)
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  // ✅ 전체 페이지 수(numPages)를 저장
  const [pageCount, setPageCount] = useState(0);
  // ✅ 현재 보고 있는 페이지 번호(1부터 시작)
  const [page, setPage] = useState(1);

  // ✅ 확대/축소 비율(기본 1.2)
  const [scale, setScale] = useState(1.2);
  // ✅ 회전 각도(0/90/180/270만 허용)
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0);

  // ✅ 문서 로딩 중인지 표시하는 플래그
  const [loadingDoc, setLoadingDoc] = useState(false);
  // ✅ 페이지 렌더링 중인지 표시하는 플래그
  const [rendering, setRendering] = useState(false);
  // ✅ 에러 메시지(있으면 화면에 표시)
  const [error, setError] = useState('');
  const { showToast } = useToast();
  // ✅ 로그인 상태 확인
  const { isAuthenticated, openLoginModal } = useAuth();

  // ✅ 표제란 선택 모드
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedRect, setSelectedRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null);

  // ✅ ESC key listener to exit selection mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSelectionMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ✅ 초기 선택 영역이 있으면 상태 초기화
  useEffect(() => {
    if (initialSelection) {
      setSelectedRect(initialSelection);
    } else {
      setSelectedRect(null);
    }
  }, [initialSelection, file]);

  // ✅ 파일명 문자열(파일이 없으면 빈 문자열)
  const fileName = file?.name ?? '';
  // ✅ 파일 크기 계산은 매 렌더마다 하지 않도록 useMemo로 캐싱
  const fileSize = useMemo(() => {
    // file이 없으면 크기도 없음
    if (!file) return '';
    // bytes -> MB 변환
    const mb = file.size / (1024 * 1024);
    // 소수점 2자리로 표시
    return `${mb.toFixed(2)} MB`;
  }, [file]); // file이 바뀔 때만 다시 계산

  // 1) 파일이 바뀌면 PDF/이미지 문서를 "한 번만" 로드해서 캐싱
  useEffect(() => {
    // ✅ 비동기 작업 중 컴포넌트가 언마운트되거나 file이 바뀌면
    // setState를 막기 위한 플래그(레이스컨디션 방지)
    let cancelled = false;

    // 실제 로딩 로직(비동기)
    async function load() {
      // 이전 에러 메시지 제거
      setError('');
      // 이전 객체들 제거
      setPdf(null);
      setImageObj(null);
      // 페이지 수 초기화
      setPageCount(0);
      // 현재 페이지도 1로 초기화
      setPage(1);

      // 파일이 없으면 아무 것도 안 함
      if (!file) return;

      try {
        // 로딩 시작 플래그 ON
        setLoadingDoc(true);

        // 파일 타입 확인
        const isImage = file.type.startsWith('image/');

        if (isImage) {
          // 이미지 로딩
          const url = URL.createObjectURL(file);
          const img = new Image();
          img.src = url;
          await img.decode(); // 이미지 디코딩 대기

          if (cancelled) return;
          setImageObj(img);
          setPageCount(1); // 이미지는 1페이지
        } else {
          // PDF 로딩
          // File -> ArrayBuffer로 읽기(pdf.js는 data(ArrayBuffer)로 받는게 안정적)
          const arrayBuffer = await file.arrayBuffer();
          // pdf 문서 로드
          const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

          if (cancelled) return;
          setPdf(doc);
          setPageCount(doc.numPages);
        }

      } catch (e: any) {
        // 에러 메시지 저장(없으면 기본 문구)
        setError(e?.message ?? '문서 로딩 중 오류가 발생했습니다.');
      } finally {
        // 취소되지 않았을 때만 로딩 플래그 OFF
        if (!cancelled) setLoadingDoc(false);
      }
    }

    // load 실행
    load();
    // cleanup: 다음 effect 실행 전/언마운트 시 취소 플래그를 true로
    return () => {
      cancelled = true;
    };
  }, [file]); // file이 바뀔 때만 문서를 다시 로드

  // 2) 페이지/스케일/회전이 바뀌면 렌더
  useEffect(() => {
    // ✅ 렌더링 작업 도중 언마운트/파라미터 변경 시 상태 업데이트 방지용 플래그
    let cancelled = false;
    // ✅ pdfPage.render(...)가 반환하는 renderTask(취소 가능)를 저장
    let renderTask: any = null;

    // 실제 렌더 함수(비동기)
    async function render() {
      // 이전 에러 메시지 제거
      setError('');
      // 문서가 없으면 렌더할 수 없음
      if (!pdf && !imageObj) return;

      // canvas DOM 가져오기
      const canvas = canvasRef.current;
      // canvas가 아직 없으면 렌더 불가
      if (!canvas) return;

      try {
        // 렌더링 시작 플래그 ON
        setRendering(true);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 이미지 렌더링
        if (imageObj) {
          let width = imageObj.naturalWidth;
          let height = imageObj.naturalHeight;

          // 회전에 따른 캔버스 크기 계산
          const isVertical = rotation === 90 || rotation === 270;
          const canvasWidth = (isVertical ? height : width) * scale;
          const canvasHeight = (isVertical ? width : height) * scale;

          canvas.width = Math.floor(canvasWidth);
          canvas.height = Math.floor(canvasHeight);

          // 캔버스 초기화
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.save();

          // 회전 및 스케일 처리
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.scale(scale, scale);
          ctx.drawImage(imageObj, -width / 2, -height / 2);

          ctx.restore();

          if (cancelled) return;

        } else if (pdf) {
          // PDF 렌더링
          // ✅ page가 범위 밖이면 1~pageCount 사이로 보정
          const safePage = Math.min(Math.max(1, page), pageCount || 1);
          // 보정 값이 기존 page와 다르면 page를 바꾸고 이번 렌더는 종료(다음 effect에서 렌더)
          if (safePage !== page) {
            setPage(safePage);
            return;
          }

          // pdf에서 해당 페이지 객체를 가져옴(1-based)
          const pdfPage = await pdf.getPage(safePage);
          // 현재 scale/rotation 기준으로 viewport(픽셀 크기 포함) 계산
          const viewport = pdfPage.getViewport({ scale, rotation });

          // 캔버스 크기를 viewport에 맞게 설정(정수로)
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);

          // ✅ 취소 가능한 렌더 태스크 생성
          renderTask = pdfPage.render({ canvas, viewport });
          // 렌더 완료까지 대기
          await renderTask.promise;
        }

        // 렌더 완료 후 취소 상태면 상태 업데이트 하지 않음
        if (cancelled) return;
      } catch (e: any) {
        // ✅ 렌더 취소(cancel)는 정상 케이스라 조용히 무시
        const msg = e?.message ?? '';
        // cancel 관련 에러가 아니면 사용자에게 표시
        if (!msg.toLowerCase().includes('cancel')) {
          setError(msg || '렌더링 중 오류가 발생했습니다.');
        }
      } finally {
        // 취소되지 않았다면 렌더링 플래그 OFF
        if (!cancelled) setRendering(false);
      }
    }

    // 렌더 실행
    render();

    // cleanup: 다음 렌더 조건 변경/언마운트 시 취소 처리 + 렌더태스크 취소 시도
    return () => {
      cancelled = true; // 이후 state 업데이트 방지
      try {
        // pdf.js renderTask가 cancel을 지원하면 취소(빠른 페이지 전환 시 충돌/잔상 방지)
        renderTask?.cancel?.();
      } catch { }
    };
  }, [pdf, imageObj, page, pageCount, scale, rotation]); // 이 값들 중 하나라도 바뀌면 다시 렌더

  // 이전 페이지로 갈 수 있는지(문서가 있고 page>1)
  const canPrev = !!pdf && page > 1;
  // 다음 페이지로 갈 수 있는지(문서가 있고 page<pageCount)
  const canNext = !!pdf && pageCount > 0 && page < pageCount;

  // ✅ 자동 맞춤 모드 상태 (기본값 true)
  const [isAutoFit, setIsAutoFit] = useState(true);

  // 컨테이너 폭에 맞춤 (ResizeObserver 등에서 호출됨)
  const fitWidth = async (force = false) => {
    // force가 false이고 자동 맞춤 모드가 아니면 실행 안 함 (사용자가 조정한 비율 유지)
    if (!force && !isAutoFit) return;

    if (!pdf && !imageObj) return;
    try {
      let contentWidth = 0;
      if (imageObj) {
        contentWidth = imageObj.naturalWidth;
      } else if (pdf) {
        const pageObj = await pdf.getPage(page);
        const viewport = pageObj.getViewport({ scale: 1.0 });
        contentWidth = viewport.width;
      }

      // canvasRef.current -> wrapper -> scrollContainer
      const scrollContainer = canvasRef.current?.parentElement?.parentElement;
      if (!scrollContainer) return;

      const containerWidth = scrollContainer.clientWidth;

      if (containerWidth > 0 && contentWidth > 0) {
        // 여백(padding) 등 고려하여 약간 작게 잡음
        const newScale = (containerWidth - 40) / contentWidth;
        // ✅ 0이 되거나 무한히 작아지는 것 방지 (최소 0.1, 최대 4.0)
        const safeScale = Math.min(Math.max(newScale, 0.1), 4.0);

        setScale(Math.floor(safeScale * 100) / 100);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ✅ 문서가 새로 로드되면 자동 맞춤 모드를 켜고 크기 조절
  useEffect(() => {
    if (pdf || imageObj) {
      setIsAutoFit(true);
      // 상태 업데이트 반영을 위해 약간의 지연 후 실행하거나, 여기서 직접 호출할 때 force=true 사용
      // 하지만 isAutoFit state update는 비동기일 수 있으므로, 
      // 아래의 effect에서 isAutoFit이 true로 바뀐 건지 확인하기보다는
      // 그냥 로직 분리: "문서 변경 시 무조건 Fit"

      // 여기서는 state만 true로 만들고, 실제 사이징은 별도 effect나 함수 직접 호출로 처리
      // 다만 fitWidth 내부에서 isAutoFit을 참조하므로(closure), useEffect 의존성 관리 필요.
      // 간단하게는: 문서 로드 시점에는 무조건 한 번 맞춤 계산 수행
    }
  }, [pdf, imageObj]);

  // ✅ 문서 로드 및 리사이즈 시 자동으로 너비 맞춤 실행
  useEffect(() => {
    if (!pdf && !imageObj) return;

    // 문서가 바뀌었거나(page 변경 포함), 리사이즈 발생 시 수행
    // 단, fitWidth 내부에서 isAutoFit 체크함.

    // 1. 즉시 실행 시도 (문서 로드 직후라면 isAutoFit을 true로 간주하고 싶지만 state closure 문제)
    // -> 해결: 문서 로드 시점(위 useEffect)에서 실행하지 말고, 여기서 통합 관리하되
    //    page/pdf/imageObj가 바뀌면 "초기화" 개념으로 봐야할지 결정.
    //    사용자가 "페이지 넘김"을 했을 때도 fitWidth가 유지되어야 하면 isAutoFit 체크가 맞음.
    //    만약 새 파일이 열리면? -> 위 useEffect에서 setIsAutoFit(true) 했으므로 OK.

    fitWidth();

    // 2. 약간의 지연
    const timer = setTimeout(() => fitWidth(), 100);

    // 3. ResizeObserver
    const scrollContainer = canvasRef.current?.parentElement?.parentElement;
    let observer: ResizeObserver | null = null;

    if (scrollContainer) {
      observer = new ResizeObserver(() => {
        fitWidth();
      });
      observer.observe(scrollContainer);
    }

    return () => {
      clearTimeout(timer);
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdf, imageObj, page, isAutoFit]); // isAutoFit이 바뀌면(true가 되면) 재계산 시도

  // ✅ Scrubby Zoom (Ctrl + Mouse Drag)
  const isDraggingZoom = useRef(false);
  const lastMouseY = useRef(0);

  // 캔버스 컨테이너에서 마우스 다운 시 시작
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.ctrlKey) {
      isDraggingZoom.current = true;
      lastMouseY.current = e.clientY;
      e.preventDefault();
      document.body.style.cursor = 'ns-resize';
    }
  };

  // 전역 마우스 이벤트로 드래그 처리
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingZoom.current) return;

      const deltaY = lastMouseY.current - e.clientY;
      lastMouseY.current = e.clientY;

      // Drag up = Zoom In, Drag down = Zoom Out
      // 감도 조절
      const factor = 0.01;

      if (deltaY !== 0) {
        setIsAutoFit(false);
        // setScale functional update
        setScale(prev => {
          const next = prev + (deltaY * factor);
          // 10% ~ 500%
          return Math.min(5.0, Math.max(0.1, next));
        });
      }
    };

    const handleMouseUp = () => {
      if (isDraggingZoom.current) {
        isDraggingZoom.current = false;
        document.body.style.cursor = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // ✅ Zoom Step State (1% or 10%)
  const [zoomStep, setZoomStep] = useState<1 | 10>(10);

  // 확대: 사용자가 개입했으므로 자동 맞춤 끔
  function zoomIn() {
    setIsAutoFit(false);
    setScale((s) => Math.min(5.0, Math.round((s + (zoomStep / 100)) * 100) / 100));
  }
  // 축소: 사용자가 개입했으므로 자동 맞춤 끔
  function zoomOut() {
    setIsAutoFit(false);
    setScale((s) => Math.max(0.1, Math.round((s - (zoomStep / 100)) * 100) / 100));
  }

  // ✅ 줌 입력 관리 상태
  const [zoomInput, setZoomInput] = useState('');

  // scale이 변경되면 입력창 값도 동기화 (단, 포커스 상태가 아닐 때만 업데이트하면 좋겠지만, 
  // 여기서는 간단히 scale 변경 시마다 업데이트하되, 사용자가 타이핑 중에는 영향 없도록 처리 필요.
  // -> onBlur/Enter로만 커밋하는 '비제어/반제어' 방식 사용)

  // scale이 외부(버튼 등)에서 바뀌었을 때 input 업데이트
  useEffect(() => {
    setZoomInput(Math.round(scale * 100).toString());
  }, [scale]);

  const handleZoomInputCommit = () => {
    let val = parseFloat(zoomInput);
    if (Number.isNaN(val)) {
      // 잘못된 값이면 현재 scale로 복구
      setZoomInput(Math.round(scale * 100).toString());
      return;
    }
    // 범위 제한 (10% ~ 500%)
    val = Math.max(10, Math.min(500, val));

    setIsAutoFit(false);
    setScale(val / 100);
    setZoomInput(val.toString());
  };

  // ✅ 전체 화면(최대화) 모드 상태
  const [isMaximized, setIsMaximized] = useState(false);

  // 자동 맞춤 클릭 시 강제로 실행
  const handleFitWidth = () => {
    setIsAutoFit(true);
    fitWidth(true);
  };

  // JSX 반환(렌더링)
  // 최대화 모드일 때와 아닐 때의 스타일 분기
  const containerStyle: React.CSSProperties = isMaximized
    ? {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      background: '#f0f0f0',
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
    : { display: 'grid', gap: 12 };

  const canvasContainerStyle: React.CSSProperties = {
    border: '1px solid #ddd',
    borderRadius: 12,
    padding: 10,
    background: 'white',
    overflow: 'auto',
    // 최대화 모드면 남는 공간 꽉 채우기 (flex: 1), 아니면 높이 제한
    ...(isMaximized ? { flex: 1, maxHeight: 'none' } : { maxHeight: 900, minHeight: 500 })
  };

  return (
    <div style={containerStyle}>
      {/* 상단 정보/컨트롤 바 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
          padding: '12px',
          border: '1px solid #eaeaea',
          borderRadius: 12,
          background: '#fff',
          boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ fontWeight: 600, marginRight: 8, fontSize: 14, whiteSpace: 'nowrap' }}>PDF 미리보기</div>

        {file ? (
          <div style={{ fontSize: 13, color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isMaximized ? 'none' : 200 }}>
            {fileName} · {fileSize}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#888' }}>파일을 업로드하면 표시됩니다.</div>
        )}

        <div style={{ flex: 1 }} />

        {/* Page Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f5f5f5', borderRadius: 8, padding: '2px 4px' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!canPrev}
            style={iconBtnStyle}
            title="이전 페이지"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 4px' }}>
            <input
              value={page}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) setPage(v);
              }}
              disabled={!pdf}
              style={{
                width: 32,
                padding: '2px 0',
                borderRadius: 4,
                border: 'none',
                background: 'transparent',
                textAlign: 'right',
                fontWeight: 600,
                fontSize: 13
              }}
            />
            <span style={{ fontSize: 13, color: '#666', whiteSpace: 'nowrap' }}>/ {pageCount || '-'}</span>
          </div>

          <button
            onClick={() => setPage((p) => Math.min(pageCount || 1, p + 1))}
            disabled={!canNext}
            style={iconBtnStyle}
            title="다음 페이지"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </button>
        </div>

        <div style={{ width: 1, height: 20, background: '#eee', margin: '0 4px' }} />

        {/* Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Zoom Step Toggle */}
          <button
            onClick={() => setZoomStep(prev => prev === 1 ? 10 : 1)}
            style={{
              ...iconBtnStyle,
              width: 'auto',
              fontSize: 11,
              padding: '2px 6px',
              marginRight: 4,
              color: '#2563eb',
              background: '#eff6ff',
              border: '1px solid #bfdbfe'
            }}
            title="클릭하여 줌 단위 변경"
          >
            {zoomStep}%단위
          </button>

          <button onClick={zoomOut} disabled={!pdf && !imageObj} style={iconBtnStyle} title="축소">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
          </button>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              value={zoomInput}
              onChange={(e) => setZoomInput(e.target.value)}
              onBlur={handleZoomInputCommit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleZoomInputCommit();
                  (e.target as HTMLInputElement).blur();
                }
              }}
              disabled={!pdf && !imageObj}
              style={{
                width: 46,
                textAlign: 'right',
                border: '1px solid #ddd',
                borderRadius: 4,
                background: '#f9f9f9',
                fontWeight: 500,
                fontSize: 13,
                outline: 'none',
                padding: '2px 4px',
                marginRight: 2,
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
              }}
            />
            <span style={{ fontSize: 13, fontWeight: 500, marginRight: 2, color: '#666' }}>%</span>
          </div>

          <button onClick={zoomIn} disabled={!pdf && !imageObj} style={iconBtnStyle} title="확대">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
          </button>
        </div>

        <div style={{ flexBasis: '100%', height: 1, background: '#f5f5f5', margin: '4px 0' }} />

        <div style={{ flex: 1 }} />

        {/* Action Buttons: Fit Width, Rotate, Maximize */}
        <div style={{ display: 'flex', gap: 2 }}>
          <button
            onClick={handleFitWidth}
            disabled={!pdf && !imageObj}
            style={{
              ...iconBtnStyle,
              width: 'auto',
              padding: '6px 12px',
              gap: 4,
              flexDirection: 'column',
              height: 'auto',
              color: isAutoFit ? '#2563eb' : '#444'
            }}
            title="폭 맞춤"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
            <span style={{ fontSize: 11, fontWeight: 500 }}>폭 맞춤</span>
          </button>

          <button
            onClick={() => setRotation((r) => ((r + 90) % 360) as 0 | 90 | 180 | 270)}
            disabled={!pdf && !imageObj}
            style={{
              ...iconBtnStyle,
              width: 'auto',
              padding: '6px 12px',
              gap: 4,
              flexDirection: 'column',
              height: 'auto'
            }}
            title="시계 방향 회전"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" /></svg>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#666' }}>회전</span>
          </button>

          <button
            onClick={() => setIsMaximized(!isMaximized)}
            style={{
              ...iconBtnStyle,
              color: isMaximized ? '#2563eb' : '#444',
              width: 'auto',
              padding: '6px 12px',
              gap: 4,
              flexDirection: 'column',
              height: 'auto'
            }}
            title={isMaximized ? "원래 크기로" : "전체 화면으로 보기"}
          >
            {isMaximized ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
            )}
            <span style={{ fontSize: 11, fontWeight: 500, color: '#666' }}>{isMaximized ? "축소" : "전체화면"}</span>
          </button>
        </div>

        <div style={{ width: 1, height: 20, background: '#eee', margin: '0 4px' }} />

        {/* Title Block Selection Toggle */}
        <button
          onClick={() => {
            if (!isAuthenticated) {
              showToast('로그인 후 이용할 수 있는 기능입니다.', 'error');
              openLoginModal();
              return;
            }
            setIsSelectionMode(!isSelectionMode);
          }}
          style={{
            ...iconBtnStyle,
            color: isSelectionMode ? '#d93025' : '#444',
            width: 'auto',
            padding: '6px 12px',
            gap: 4,
            background: isSelectionMode ? '#fff0f0' : 'transparent',
            border: isSelectionMode ? '1px solid #ffcccc' : '1px solid transparent',
            flexDirection: 'column',
            height: 'auto'
          }}
          title="표제란 영역 설정"
          disabled={!pdf && !imageObj}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <path d="M9 3v18" />
            <path d="M3 9h18" />
          </svg>
          <span style={{ fontSize: 11, fontWeight: 500, marginTop: 2 }}>표제란 설정</span>
        </button>
      </div>

      {/* 상태 표시 */}
      {
        (loadingDoc || rendering) && (
          <div style={{ fontSize: 12, color: '#555', paddingLeft: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
            {loadingDoc ? 'PDF 로딩 중…' : '페이지 렌더링 중…'}
          </div>
        )
      }
      {error && <div style={{ color: 'crimson', fontSize: 12, paddingLeft: 4 }}>{error}</div>}

      {/* 캔버스 영역 */}
      <div
        style={{ ...canvasContainerStyle, position: 'relative' }}
        onMouseDown={handleMouseDown}
      >
        {/* Instructional Banner for Selection Mode */}
        {isSelectionMode && (
          <div style={{
            position: 'sticky',
            top: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            background: 'rgba(33, 33, 33, 0.9)',
            backdropFilter: 'blur(4px)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: 30,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontSize: 13,
            width: 'fit-content',
            maxWidth: '90%'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><path d="M9 3v18" /><path d="M3 9h18" /></svg>
              <span>마우스로 표제란 영역을 드래그하여 지정하세요.</span>
            </div>

            <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.2)' }} />

            <div style={{ display: 'flex', gap: 8 }}>
              {selectedRect ? (
                <>
                  <button
                    onClick={() => {
                      if (onSaveSelection && selectedRect) {
                        onSaveSelection(selectedRect);
                      } else {
                        showToast(`저장되었습니다!(좌표: ${selectedRect.x.toFixed(0)}, ${selectedRect.y.toFixed(0)})`, 'success');
                      }
                    }}
                    style={{
                      background: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: 16,
                      padding: '4px 12px',
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    저장
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('설정된 표제란 영역을 삭제하시겠습니까?')) {
                        setSelectedRect(null);
                        if (onSaveSelection) onSaveSelection(null);
                      }
                    }}
                    style={{
                      background: '#fee2e2',
                      color: '#ef4444',
                      border: '1px solid #fecaca',
                      borderRadius: 16,
                      padding: '4px 10px',
                      fontSize: 12,
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                    title="영역 삭제"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                    삭제
                  </button>
                </>
              ) : (
                <span style={{ color: '#aaa', fontSize: 12 }}>선택 영역 없음</span>
              )}

              <button
                onClick={() => {
                  setIsSelectionMode(false);
                }}
                style={{
                  background: 'transparent',
                  color: '#ccc',
                  border: '1px solid #666',
                  borderRadius: 16,
                  padding: '4px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                닫기(ESC)
              </button>
            </div>
          </div>
        )}

        <div style={{ position: 'relative', width: 'fit-content', margin: '0 auto' }}>
          <canvas
            ref={canvasRef}
            style={{ display: 'block' }}
          />
          <SelectionOverlay
            isActive={isSelectionMode}
            scale={scale}
            rect={selectedRect}
            onChange={(rect) => setSelectedRect(rect)}
          />
        </div>
      </div>
    </div >
  );
}

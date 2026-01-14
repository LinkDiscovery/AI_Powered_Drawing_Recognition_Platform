// React 훅들 import: useEffect(사이드이펙트), useMemo(메모이제이션), useRef(DOM 참조), useState(상태)
import { useEffect, useMemo, useRef, useState } from 'react';
import SelectionOverlay from './SelectionOverlay';
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
export default function PdfViewer({ file }: PdfViewerProps) {
  // ✅ canvas DOM을 직접 조작해야 하므로 ref로 캔버스 요소를 잡아둠
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ✅ pdf 문서 객체(= pdfjsLib.getDocument(...) 결과) 상태로 저장
  const [pdf, setPdf] = useState<any>(null);
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

  // ✅ 표제란 선택 모드
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedRect, setSelectedRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null);

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

  // 1) 파일이 바뀌면 PDF 문서를 "한 번만" 로드해서 캐싱
  useEffect(() => {
    // ✅ 비동기 작업 중 컴포넌트가 언마운트되거나 file이 바뀌면
    // setState를 막기 위한 플래그(레이스컨디션 방지)
    let cancelled = false;

    // 실제 로딩 로직(비동기)
    async function load() {
      // 이전 에러 메시지 제거
      setError('');
      // 이전 pdf 객체 제거
      setPdf(null);
      // 페이지 수 초기화
      setPageCount(0);
      // 현재 페이지도 1로 초기화
      setPage(1);

      // 파일이 없으면 아무 것도 안 함
      if (!file) return;

      try {
        // 로딩 시작 플래그 ON
        setLoadingDoc(true);
        // File -> ArrayBuffer로 읽기(pdf.js는 data(ArrayBuffer)로 받는게 안정적)
        const arrayBuffer = await file.arrayBuffer();
        // pdf 문서 로드(getDocument는 로딩 태스크를 리턴하고, promise로 완료를 받음)
        const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        // 중간에 취소되었다면 결과 반영하지 않음
        if (cancelled) return;

        // pdf 문서 객체 상태 저장(캐싱)
        setPdf(doc);
        // 전체 페이지 수 상태 저장
        setPageCount(doc.numPages);
      } catch (e: any) {
        // 에러 메시지 저장(없으면 기본 문구)
        setError(e?.message ?? 'PDF 로딩 중 오류가 발생했습니다.');
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
      // pdf 문서가 없으면 렌더할 수 없음
      if (!pdf) return;

      // canvas DOM 가져오기
      const canvas = canvasRef.current;
      // canvas가 아직 없으면 렌더 불가
      if (!canvas) return;

      try {
        // 렌더링 시작 플래그 ON
        setRendering(true);

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

        // ✅ 취소 가능한 렌더 태스크 생성(페이지 빠르게 넘기면 이전 렌더 취소 필요)
        // pdf.js render는 일반적으로 canvasContext를 받기도 하는데,
        // 이 코드에서는 canvas를 직접 넘기는 형태를 사용(환경에 따라 wrapper가 처리)
        renderTask = pdfPage.render({ canvas, viewport });
        // 렌더 완료까지 대기
        await renderTask.promise;

        // 렌더 완료 후 취소 상태면 상태 업데이트 하지 않음
        if (cancelled) return;
      } catch (e: any) {
        // ✅ 렌더 취소(cancel)는 정상 케이스라 조용히 무시
        const msg = e?.message ?? '';
        // cancel 관련 에러가 아니면 사용자에게 표시
        if (!msg.toLowerCase().includes('cancel')) {
          setError(msg || 'PDF 렌더링 중 오류가 발생했습니다.');
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
  }, [pdf, page, pageCount, scale, rotation]); // 이 값들 중 하나라도 바뀌면 다시 렌더

  // 이전 페이지로 갈 수 있는지(문서가 있고 page>1)
  const canPrev = !!pdf && page > 1;
  // 다음 페이지로 갈 수 있는지(문서가 있고 page<pageCount)
  const canNext = !!pdf && pageCount > 0 && page < pageCount;

  // 확대: scale을 0.1 단위로 올리되 최대 4배 제한(소수점 한자리로 정리)
  function zoomIn() {
    setScale((s) => Math.min(4, Math.round((s + 0.1) * 10) / 10));
  }
  // 축소: scale을 0.1 단위로 내리되 최소 0.4배 제한(소수점 한자리로 정리)
  function zoomOut() {
    setScale((s) => Math.max(0.4, Math.round((s - 0.1) * 10) / 10));
  }

  // ✅ 전체 화면(최대화) 모드 상태
  const [isMaximized, setIsMaximized] = useState(false);

  // 컨테이너 폭에 맞춤
  async function fitWidth() {
    if (!pdf) return;
    try {
      const pageObj = await pdf.getPage(page);
      const viewport = pageObj.getViewport({ scale: 1.0 });
      const containerWidth = canvasRef.current?.parentElement?.clientWidth || 0;
      if (containerWidth > 0) {
        // 여백(padding) 등 고려하여 약간 작게 잡음
        const newScale = (containerWidth - 40) / viewport.width;
        setScale(Math.floor(newScale * 10) / 10);
      }
    } catch (e) {
      console.error(e);
    }
  }

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
          <button onClick={zoomOut} disabled={!pdf} style={iconBtnStyle} title="축소">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
          </button>
          <div style={{ fontSize: 13, minWidth: 44, textAlign: 'center', fontWeight: 500 }}>
            {Math.round(scale * 100)}%
          </div>
          <button onClick={zoomIn} disabled={!pdf} style={iconBtnStyle} title="확대">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
          </button>
        </div>

        <div style={{ flexBasis: '100%', height: 1, background: '#f5f5f5', margin: '4px 0' }} />

        <div style={{ flex: 1 }} />

        {/* Action Buttons: Fit Width, Rotate, Maximize */}
        <div style={{ display: 'flex', gap: 2 }}>
          <button
            onClick={fitWidth}
            disabled={!pdf}
            style={{
              ...iconBtnStyle,
              width: 'auto',
              padding: '6px 12px',
              gap: 4,
              flexDirection: 'column',
              height: 'auto'
            }}
            title="폭 맞춤"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#666' }}>폭 맞춤</span>
          </button>

          <button
            onClick={() => setRotation((r) => ((r + 90) % 360) as 0 | 90 | 180 | 270)}
            disabled={!pdf}
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
            setIsSelectionMode(!isSelectionMode);
            setSelectedRect(null); // Reset selection when toggling
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
          disabled={!pdf}
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
      {(loadingDoc || rendering) && (
        <div style={{ fontSize: 12, color: '#555', paddingLeft: 4 }}>
          {loadingDoc ? 'PDF 로딩 중…' : '페이지 렌더링 중…'}
        </div>
      )}
      {error && <div style={{ color: 'crimson', fontSize: 12, paddingLeft: 4 }}>{error}</div>}

      {/* Selected Rect Info and Save Button */}
      {selectedRect && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 4, marginTop: -4, marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: '#2563eb' }}>
            선택됨: x={selectedRect.x.toFixed(0)}, y={selectedRect.y.toFixed(0)}, w={selectedRect.width.toFixed(0)}, h={selectedRect.height.toFixed(0)}
          </div>
          <button
            onClick={() => {
              alert(`저장되었습니다!\n\n좌표:\n${JSON.stringify(selectedRect, null, 2)}\n\n(이미지는 서버 전송 시 함께 처리됩니다)`);
              // Here is where actual save logic will go (API call)
              console.log("Saving selection coordinates:", selectedRect);
            }}
            style={{
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              padding: '4px 8px',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            선택 영역 저장
          </button>
        </div>
      )}

      {/* 캔버스 영역 */}
      <div style={{ ...canvasContainerStyle, position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{ display: 'block', margin: '0 auto' }}
        />
        <SelectionOverlay
          isActive={isSelectionMode}
          scale={scale}
          rect={selectedRect}
          onChange={(rect) => setSelectedRect(rect)}
        />
      </div>
    </div>
  );
}

// React 훅들 import: useEffect(사이드이펙트), useMemo(메모이제이션), useRef(DOM 참조), useState(상태)
import { useEffect, useMemo, useRef, useState } from 'react';
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

  // 컨테이너 폭에 맞춤(대충 900px 기준 → 실제 UI 폭에 맞춰도 됨)
  function fitWidth() {
    // 현재는 간단히 "보기 좋은 고정값"으로 맞춤
    // 다음 단계에서 실제 컨테이너 width 계산해서 정확히 맞출 수도 있음
    setScale(1.5); // 폭 맞춤을 임시로 1.5배로 설정
  }

  // JSX 반환(렌더링)
  return (
    // 전체 레이아웃: grid로 위아래 섹션 간격 12px
    <div style={{ display: 'grid', gap: 12 }}>
      {/* 상단 정보/컨트롤 바 */}
      <div
        style={{
          display: 'flex', // 가로 정렬
          flexWrap: 'wrap', // 좁아지면 줄바꿈
          alignItems: 'center', // 수직 가운데 정렬
          gap: 8, // 요소 사이 간격
          padding: '10px 12px', // 내부 여백
          border: '1px solid #e5e5e5', // 테두리
          borderRadius: 10, // 모서리 둥글게
          background: '#fafafa', // 배경색
        }}
      >
        {/* 왼쪽 타이틀 */}
        <div style={{ fontWeight: 600, marginRight: 8 }}>PDF 미리보기</div>

        {/* 파일이 있을 때는 파일명/용량 표시 */}
        {file ? (
          <div style={{ fontSize: 12, color: '#555' }}>
            {fileName} · {fileSize}
          </div>
        ) : (
          // 파일이 없을 때 안내 문구
          <div style={{ fontSize: 12, color: '#777' }}>파일을 업로드하면 표시됩니다.</div>
        )}

        {/* 가운데 남는 공간 채우기(오른쪽 컨트롤을 밀어냄) */}
        <div style={{ flex: 1 }} />

        {/* 이전 페이지 버튼(가능할 때만 활성화) */}
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={!canPrev}>
          ◀
        </button>

        {/* 페이지 입력 + 전체 페이지 표시 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            value={page} // 현재 page 상태 표시
            onChange={(e) => {
              // 입력값을 숫자로 변환
              const v = Number(e.target.value);
              // 유효한 숫자면 page 상태 업데이트(범위 보정은 렌더 effect에서 수행)
              if (Number.isFinite(v)) setPage(v);
            }}
            disabled={!pdf} // pdf가 없으면 입력 막기
            style={{ width: 64, padding: '6px 8px', borderRadius: 8, border: '1px solid #ddd' }} // input 스타일
          />
          {/* / pageCount 표시 (아직 모르면 '-') */}
          <span style={{ fontSize: 12, color: '#555' }}>/ {pageCount || '-'}</span>
        </div>

        {/* 다음 페이지 버튼(가능할 때만 활성화) */}
        <button onClick={() => setPage((p) => Math.min(pageCount || 1, p + 1))} disabled={!canNext}>
          ▶
        </button>

        {/* 버튼 그룹 구분용 여백 */}
        <span style={{ width: 10 }} />

        {/* 축소 버튼 */}
        <button onClick={zoomOut} disabled={!pdf}>
          -
        </button>
        {/* 현재 확대율 표시 */}
        <div style={{ fontSize: 12, minWidth: 54, textAlign: 'center' }}>
          {Math.round(scale * 100)}%
        </div>
        {/* 확대 버튼 */}
        <button onClick={zoomIn} disabled={!pdf}>
          +
        </button>

        {/* 폭 맞춤 버튼 */}
        <button onClick={fitWidth} disabled={!pdf}>
          폭 맞춤
        </button>

        {/* 회전 버튼: 90도씩 회전(0→90→180→270→0) */}
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
          {/* 로딩 중이면 문서 로딩, 아니면 페이지 렌더링 문구 */}
          {loadingDoc ? 'PDF 로딩 중…' : '페이지 렌더링 중…'}
        </div>
      )}
      {/* 에러 메시지가 있으면 붉은색으로 표시 */}
      {error && <div style={{ color: 'crimson', fontSize: 12 }}>{error}</div>}

      {/* 캔버스 영역 */}
      <div
        style={{
          border: '1px solid #ddd', // 테두리
          borderRadius: 12, // 둥근 모서리
          padding: 10, // 안쪽 여백
          background: 'white', // 배경
          overflow: 'auto', // 캔버스가 크면 스크롤
          maxHeight: 720, // 최대 높이 제한(스크롤 유도)
        }}
      >
        {/* PDF 페이지를 그릴 캔버스. ref로 접근해서 pdf.js가 직접 그린다 */}
        <canvas
          ref={canvasRef}
          style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto' }}
        />
      </div>
    </div>
  );
}

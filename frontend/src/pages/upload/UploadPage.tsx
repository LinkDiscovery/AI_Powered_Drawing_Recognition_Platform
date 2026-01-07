// React 훅들(useMemo, useRef, useState)을 import (상태/메모/참조 저장에 사용)
import { useMemo, useRef, useState } from 'react';
// PDF 미리보기용 컴포넌트 import (PDF일 때 렌더링에 사용)
import PdfViewer from '../../components/PdfViewer';
// 전역/앱 스타일 CSS import
import '../../index.css';

/**
 * ✅ Step: 화면 흐름(간단한 상태 머신이라고 보면 됨)
 * - upload  : 파일을 업로드/목록을 보여주는 화면
 * - preview : 선택된 파일을 미리보기 하는 화면
 *
 * 상태값(step)을 바꾸는 것만으로, 아래 JSX에서 화면이 조건부 렌더링됨
 */
// Step 타입 정의: 화면 상태를 'upload' 또는 'preview' 둘 중 하나로 제한
type Step = 'upload' | 'preview';

/**
 * ✅ Status: 각 파일(UploadItem)이 현재 어떤 단계인지 표현
 * - uploading  : 업로드 진행 중 (progress가 계속 증가)
 * - processing : 업로드가 끝났고 "처리 중" (PDF 렌더링 같은 후처리라고 가정)
 * - ready      : 미리보기 가능 상태
 * - error      : 지원하지 않는 파일 포맷 등 오류 상태
 */
// Status 타입 정의: 파일의 진행 상태를 4가지 값으로 제한
type Status = 'uploading' | 'processing' | 'ready' | 'error';

/**
 * ✅ UploadItem: "화면에 표시할 파일 행 1개"에 대한 UI 데이터
 *
 * 핵심 포인트:
 * - 여기에는 File 자체를 넣지 않음.
 *   File은 용량이 크고, state로 들고 있으면 리렌더/메모리 부담이 커질 수 있어
 *   실제 File은 useRef(Map)에 별도로 저장함.
 *
 * - 여기에는 UI에 필요한 정보만(이름, 사이즈 텍스트, 진행률, 상태, 메시지 등) 들어있음.
 */
// UploadItem 타입 정의: UI 리스트 한 줄(행)에 필요한 정보만 모아둔 구조
type UploadItem = {
  id: string; // UI에서 파일을 구분하기 위한 고유 ID
  name: string; // 파일명
  sizeText: string; // 사람이 읽기 쉬운 크기 문자열("x MB"/"y KB")
  progress: number; // 진행률(0~100)
  status: Status; // 현재 상태(uploading/processing/ready/error)
  message?: string; // 상태 메시지(있을 수도, 없을 수도)
  mime: string; // 파일 MIME 타입(file.type)
};

/**
 * ✅ formatSize: 파일 크기(bytes)를 사람이 읽기 쉬운 문자열로 변환
 * - 1MB 이상이면 "xx.xx MB"
 * - 1MB 미만이면 "xxx KB"
 *
 * UI에서 파일 사이즈 표시용.
 */
// bytes 단위를 사람이 읽기 쉬운 KB/MB 문자열로 바꾸는 함수
function formatSize(bytes: number) {
  // MB 단위로 환산
  const mb = bytes / (1024 * 1024);
  // 1MB 이상이면 소수점 2자리 MB로 반환
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  // 1MB 미만이면 KB 단위로 환산
  const kb = bytes / 1024;
  // KB는 정수로 표시
  return `${kb.toFixed(0)} KB`;
}

/**
 * ✅ isSupported: 업로드 가능한 포맷인지 검사
 * - PDF는 MIME이 application/pdf
 * - 이미지는 image/*로 시작 (jpg/png/webp 등)
 *
 * 이 함수를 기준으로 error 처리를 하거나, 파이프라인(simulatePipeline)을 돌릴지 결정함.
 */
// 파일이 지원 포맷인지 검사하는 함수
function isSupported(file: File) {
  // PDF인지 여부 체크 (정확히 application/pdf)
  const okPdf = file.type === 'application/pdf';
  // 이미지인지 여부 체크 (image/ 로 시작하면 이미지)
  const okImg = file.type.startsWith('image/');
  // PDF 또는 이미지면 true 반환
  return okPdf || okImg;
}

// App 컴포넌트(기본 export): 업로드/리스트/미리보기 전체 화면을 담당
export default function App() {
  /**
   * ✅ step: 현재 화면 단계
   * - upload 화면에서 preview로 넘어갈 때 setStep('preview')
   * - preview에서 back 누르면 setStep('upload')
   */
  // 현재 단계 상태 (초기값: upload 화면)
  const [step, setStep] = useState<Step>('upload');

  /**
   * ✅ projectType: 사용자 선택 옵션(문서 타입)
   * 현재는 UI에서 선택만 저장하고 실제 처리 로직에는 연결되어 있지 않음.
   * 나중에 "invoice면 OCR 파이프라인", "drawing이면 도면 파서" 같은 분기를 넣을 수 있음.
   */
  // 사용자 선택 문서 타입(옵션) 상태 (초기값: 빈 문자열)
  const [projectType, setProjectType] = useState<string>('');

  /**
   * ✅ items: 업로드 목록(여러 파일 행)을 UI로 그리기 위한 state
   * - progress/status/message 등이 바뀌면 화면에 즉시 반영되어야 하므로 state로 관리
   */
  // 업로드 리스트(UI에 그릴 행들) 상태
  const [items, setItems] = useState<UploadItem[]>([]);

  /**
   * ✅ selectedId: 현재 사용자가 선택한 파일의 id
   * - fileRow 클릭하면 setSelectedId(it.id)
   * - preview 화면에서는 selectedId에 해당하는 File을 찾아서 렌더링
   */
  // 현재 선택된 파일의 id 상태(없으면 null)
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /**
   * ✅ fileMapRef: 실제 File 객체를 저장하는 곳
   * - key: UploadItem.id
   * - value: File
   *
   * 왜 state가 아니라 ref인가?
   * - File 객체는 무겁고, state에 넣으면 업데이트 시 리렌더 비용 증가 가능
   * - "File 자체"는 화면에 직접 표시되는 게 아니고,
   *   preview에서만 필요하므로 ref(Map)에 저장해두고 필요할 때만 꺼내 쓰는 전략
   */
  // 실제 File 객체를 id로 매핑해 저장하는 ref(Map)
  const fileMapRef = useRef<Map<string, File>>(new Map());

  /**
   * ✅ intervalMapRef: 업로드 진행률 시뮬레이션에 쓰는 setInterval id 저장
   * - 파일마다 interval을 개별로 돌리므로 id별로 intervalId를 기억해야 함
   * - 삭제/리셋 시 interval을 종료하지 않으면 메모리 누수 + 계속 setItems 호출 문제 발생
   */
  // 파일별 setInterval id를 저장하는 ref(Map) (progress 시뮬레이션용)
  const intervalMapRef = useRef<Map<string, number>>(new Map());

  /**
   * ✅ activeItem: 선택된 파일의 UploadItem(= UI 행 정보)
   *
   * useMemo를 쓰는 이유(성능 + 안정):
   * - items가 바뀔 때마다 find로 탐색하는데, 큰 리스트에서는 비용이 될 수 있음
   * - selectedId 또는 items가 바뀔 때만 다시 계산하도록 함
   */
  // 선택된 파일의 UI 행(UploadItem)을 계산해서 메모이제이션
  const activeItem = useMemo(
    // selectedId가 있으면 items에서 해당 id를 찾아오고, 없으면 null
    () => (selectedId ? items.find((x) => x.id === selectedId) ?? null : null),
    // items 또는 selectedId가 바뀔 때만 재계산
    [items, selectedId]
  );

  /**
   * ✅ activeFile: 선택된 파일의 실제 File 객체
   * - fileMapRef에서 selectedId로 꺼내옴
   * - selectedId가 없으면 null
   */
  // 선택된 파일의 실제 File 객체를 ref(Map)에서 꺼내오는 메모이제이션
  const activeFile = useMemo(() => {
    // 선택된 id가 없으면 파일도 없음(null)
    if (!selectedId) return null;
    // 선택된 id로 Map에서 File 꺼내기(없으면 null)
    return fileMapRef.current.get(selectedId) ?? null;
  }, [selectedId]); // selectedId가 바뀔 때만 재계산

  /**
   * ✅ clearIntervalById: 특정 파일 id의 업로드 타이머(진행률 증가)를 종료하고 Map에서 제거
   *
   * 왜 필요?
   * - 업로드가 끝났는데 interval이 계속 살아있으면 progress 업데이트가 계속 일어날 수 있음
   * - 파일 삭제했는데 interval이 살아있으면 없는 파일을 찾으려고 setItems를 계속 호출하게 됨
   */
  // 특정 파일 id의 interval을 종료하고 Map에서 제거하는 함수
  function clearIntervalById(id: string) {
    // id로 intervalMap에서 interval id를 가져옴
    const t = intervalMapRef.current.get(id);
    // interval id가 존재하면
    if (t) {
      // 해당 interval 종료
      window.clearInterval(t);
      // Map에서 제거
      intervalMapRef.current.delete(id);
    }
  }

  /**
   * ✅ removeItem: 파일 1개 삭제(목록에서 제거)
   *
   * 동작 순서:
   * 1) 해당 파일의 interval 종료
   * 2) fileMapRef에서 실제 File 제거(메모리 정리)
   * 3) items에서 UI 행 제거
   * 4) 만약 삭제한 파일이 현재 선택된 파일이면, 다른 파일로 선택을 자동 이동
   */
  // 특정 파일 id를 삭제하는 함수(타이머/파일/목록/선택 처리)
  function removeItem(id: string) {
    // 1) 업로드 타이머 끄기
    clearIntervalById(id);

    // 2) 실제 File도 제거 (메모리 정리)
    fileMapRef.current.delete(id);

    // 3) UI 목록에서 해당 id 행 제거
    setItems((prev) => prev.filter((x) => x.id !== id));

    /**
     * 4) 선택 자동 이동 로직:
     * - 삭제 대상이 선택된 파일이 아니면, 선택 유지
     * - 삭제 대상이 선택된 파일이면:
     *   (남은 목록에서) ready 상태 파일이 있으면 그걸 선택
     *   아니면 남은 목록의 첫 번째를 선택
     *   아무 것도 없으면 null
     */
    // 선택된 id도 필요하면 조정
    setSelectedId((prevSelected) => {
      // 삭제하려는 id가 현재 선택이 아니면 그대로 둠
      if (prevSelected !== id) return prevSelected;

      // ⚠️ 여기서 items는 현재 렌더 시점의 값(최신 setItems 결과와 시차 가능)
      // 삭제한 걸 제외한 남은 목록 계산
      const remain = items.filter((x) => x.id !== id);
      // 남은 것 중 ready 상태 파일이 있으면 우선 선택
      const ready = remain.find((x) => x.status === 'ready')?.id;
      // ready가 없으면 첫 번째, 그것도 없으면 null
      return ready ?? (remain[0]?.id ?? null);
    });
  }

  /**
   * ✅ resetAll: 전체 초기화(새 문서 시작)
   *
   * 동작 순서:
   * - 모든 interval 종료(업로드 시뮬레이션 완전 중지)
   * - intervalMap, fileMapRef 비우기(메모리 정리)
   * - items, selectedId, step 초기화
   */
  // 모든 상태/참조를 초기화해서 처음 상태로 돌리는 함수
  function resetAll() {
    // 현재 살아있는 interval들을 모두 끈다 (Map의 key들 순회)
    for (const id of intervalMapRef.current.keys()) clearIntervalById(id);

    // intervalMapRef 내용 비우기
    intervalMapRef.current.clear();
    // fileMapRef 내용 비우기
    fileMapRef.current.clear();

    // UI 목록 비우기
    setItems([]);
    // 선택 해제
    setSelectedId(null);
    // 화면 단계도 upload로 되돌리기
    setStep('upload');
  }

  /**
   * ✅ simulatePipeline: 업로드/처리 상태 변화 "시뮬레이션"
   *
   * 목적:
   * - 실제 서버 업로드/처리를 붙이기 전에 UI 흐름을 만들기 위해,
   *   progress를 올라가게 하고(uploading),
   *   100%가 되면 processing으로 바꾸고,
   *   잠시 후 ready로 바꾼다.
   *
   * 핵심 포인트:
   * - setInterval로 progress를 일정 주기(120ms)마다 증가
   * - progress가 100이 되면 interval 중지 + processing/ready 전환 타이머(setTimeout) 실행
   */
  // 업로드/처리 상태를 가짜로 진행시키는 함수(진행률 증가 + 상태 전환)
  function simulatePipeline(id: string) {
    // 재시도 등으로 이미 interval이 있으면 먼저 종료
    clearIntervalById(id);

    // 일정 주기로 progress를 올리기 위한 interval 생성
    const intervalId = window.setInterval(() => {
      /**
       * setItems(prev => ...) 패턴:
       * - "이전 상태(prev)"를 기준으로 다음 상태를 만들기 때문에
       *   비동기/동시 업데이트에서도 안전하게 업데이트 가능
       */
      // items를 이전 상태 기반으로 안전하게 업데이트
      setItems((prev): UploadItem[] => {
        // 현재 id에 해당하는 아이템을 찾음
        const cur = prev.find((x) => x.id === id);
        // 아이템이 이미 없으면(prev에서 삭제되었으면) 그대로 반환
        if (!cur) return prev;

        // uploading 상태가 아니면 진행률을 더 올리지 않음
        if (cur.status !== 'uploading') return prev;

        // 다음 진행률 계산(현재 +7, 최대 100)
        const next = Math.min(100, cur.progress + 7);

        // 100 미만이면 계속 uploading으로 진행률만 갱신
        if (next < 100) {
          return prev.map((x) =>
            x.id === id ? { ...x, progress: next, message: 'Uploading...' } : x
          );
        }

        /**
         * ✅ next가 100이 되는 순간 = 업로드 완료 시점
         *
         * 처리 순서:
         * 1) 지금 상태를 processing으로 전환(= UI에 "Processing" 뱃지 표시)
         * 2) interval은 종료(더 이상 progress를 올릴 필요 없음)
         * 3) 0.9초 뒤 ready로 전환
         */

        // 2) interval 종료를 0ms timeout으로 예약(현재 setItems 흐름 꼬임 방지용)
        window.setTimeout(() => clearIntervalById(id), 0);

        // 3) processing -> ready 전환을 900ms 뒤에 수행
        window.setTimeout(() => {
          // items를 다시 업데이트: processing인 것만 ready로 변경
          setItems((p): UploadItem[] =>
            p.map((x) =>
              // 아직 processing인 경우에만 ready로 전환(중간에 삭제/재시도 방어)
              x.id === id && x.status === 'processing'
                ? { ...x, status: 'ready', message: 'Ready to preview.' }
                : x
            )
          );

          // 아직 선택된 파일이 없다면 현재 파일을 자동 선택
          setSelectedId((prevSelected) => prevSelected ?? id);
        }, 900);

        // 1) 이번 tick에서 progress=100 + status=processing으로 즉시 반영
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
    }, 120); // 120ms마다 한 번씩 tick

    // intervalId를 Map에 저장(나중에 종료하기 위해)
    intervalMapRef.current.set(id, intervalId);
  }

  /**
   * ✅ addFiles: 여러 파일을 업로드 목록(items)에 추가하는 함수
   *
   * 처리 흐름:
   * 1) FileList -> 배열로 받은 fileList를 순회
   * 2) 각 파일마다 id 발급
   * 3) 실제 File은 fileMapRef에 저장
   * 4) UI용 UploadItem을 만들어 newItems에 쌓음
   * 5) 지원 포맷이 아니면 error로 표시
   * 6) items state에 누적(기존 + 새로 추가)
   * 7) 지원 포맷인 파일에 대해서만 simulatePipeline 시작
   */
  // 여러 파일을 받아 UI 목록에 추가하고(필요 시) 시뮬레이션을 시작하는 함수
  function addFiles(fileList: File[]) {
    // 빈 배열이면 아무 것도 하지 않음
    if (fileList.length === 0) return;

    // 이번에 추가할 신규 아이템들(UploadItem)을 담을 배열
    const newItems: UploadItem[] = [];

    // 선택된 파일들 순회
    for (const f of fileList) {
      // 파일을 구분하기 위한 고유 id 생성
      const id = crypto.randomUUID();

      // 실제 File 객체를 ref(Map)에 저장
      fileMapRef.current.set(id, f);

      // UI 표시용 기본 UploadItem 구성
      const base: UploadItem = {
        id, // 고유 id
        name: f.name, // 파일명
        sizeText: formatSize(f.size), // 파일 크기 문자열
        progress: 0, // 진행률 초기값
        status: 'uploading', // 초기 상태는 uploading
        message: 'Uploading...', // 초기 메시지
        mime: f.type, // MIME 타입
      };

      // 지원 포맷이 아니면 error로 표시해서 추가
      if (!isSupported(f)) {
        newItems.push({
          ...base,
          status: 'error',
          message: 'Error: Unsupported file format.',
        });
      } else {
        // 지원 포맷이면 base 그대로 추가
        newItems.push(base);
      }
    }

    // 기존 items에 newItems를 합쳐서 상태 업데이트
    setItems((prev) => {
      // 이전 목록 + 신규 목록 합치기
      const merged = [...prev, ...newItems];

      /**
       * 선택된 파일이 아직 없다면 자동 선택
       * - merged 중 ready가 있으면 ready를 선택(사용자 경험적으로 바로 preview 가능)
       * - 아니면 첫 번째 파일 선택
       */
      // 아직 선택된 파일이 없으면
      if (!selectedId) {
        // merged 중 ready 상태가 있으면 그 파일을 우선 선택
        const firstReady = merged.find((x) => x.status === 'ready')?.id;
        // ready가 없으면 첫 번째 파일 선택(없으면 null)
        const first = firstReady ?? merged[0]?.id ?? null;
        // 선택 상태 업데이트
        setSelectedId(first);
      }

      // 합쳐진 목록 반환
      return merged;
    });

    // 이번에 추가한 것 중 error가 아닌 것만 파이프라인 시뮬레이션 시작
    for (const it of newItems) {
      if (it.status !== 'error') simulatePipeline(it.id);
    }
  }

  /**
   * ✅ onPickFiles: 파일 input에서 선택한 FileList 처리
   * - FileList는 배열이 아니라 유사 배열이므로 Array.from으로 배열 변환
   */
  // input[type=file]에서 선택된 파일들을 처리하는 함수
  function onPickFiles(files: FileList | null) {
    // null이면 아무 것도 하지 않음
    if (!files) return;
    // FileList를 배열로 변환해서 addFiles로 전달
    addFiles(Array.from(files));
  }

  /**
   * ✅ onDropFiles: 드래그&드롭으로 떨어진 파일 처리
   * - e.preventDefault()를 안 하면 브라우저가 파일을 열어버리는 기본 동작이 발생할 수 있음
   */
  // 드래그&드롭으로 떨어진 파일들을 처리하는 함수
  function onDropFiles(e: React.DragEvent<HTMLDivElement>) {
    // 브라우저 기본 동작(파일 열기 등) 방지
    e.preventDefault();
    // 드롭된 파일 목록 가져오기
    const files = e.dataTransfer.files;
    // 파일이 없거나 비어있으면 종료
    if (!files || files.length === 0) return;
    // FileList를 배열로 변환해서 addFiles로 전달
    addFiles(Array.from(files));
  }

  /**
   * ✅ retry: 특정 파일을 재시도
   *
   * - fileMapRef에서 File을 찾아옴(없으면 종료)
   * - 지원 포맷이 아니면 error 유지
   * - 지원 포맷이면 progress/status/message를 초기화하고 simulatePipeline 다시 시작
   */
  // 특정 파일(id)의 업로드/처리 시뮬레이션을 다시 시작하는 함수
  function retry(id: string) {
    // 실제 File 객체를 Map에서 가져옴
    const f = fileMapRef.current.get(id);
    // 파일이 없으면 종료
    if (!f) return;

    // 지원 포맷이 아니면 재시도 의미 없으므로 error로 유지
    if (!isSupported(f)) {
      setItems((prev) =>
        prev.map((x) =>
          x.id === id ? { ...x, status: 'error', message: 'Error: Unsupported file format.' } : x
        )
      );
      return;
    }

    // UI 상태를 업로드 시작 상태로 초기화
    setItems((prev) =>
      prev.map((x) =>
        x.id === id ? { ...x, progress: 0, status: 'uploading', message: 'Uploading...' } : x
      )
    );

    // 업로드/처리 시뮬레이션 재시작
    simulatePipeline(id);
  }

  /**
   * ✅ canNext: Next(Preview) 버튼 활성화 조건
   *
   * 요구 조건:
   * - 선택된 업로드 아이템이 존재해야 함
   * - 그 아이템의 status가 ready여야 함
   * - 선택된 실제 File이 존재해야 함
   * - File이 지원 포맷이어야 함
   */
  // Next(Preview) 버튼을 눌러도 되는지 판단하는 boolean
  const canNext =
    // activeItem 존재 + ready 상태 + activeFile 존재 + 지원 포맷이면 true
    !!activeItem && activeItem.status === 'ready' && !!activeFile && isSupported(activeFile);

  // 화면 렌더링 시작(JSX 반환)
  return (
    // 전체 페이지 래퍼
    <div className="page">
      {/* 페이지 제목 영역 */}
      <div className="pageTitle">File Input Screen</div>

      {/* 카드 레이아웃(전체 UI를 감싸는 박스) */}
      <div className="card">
        {/* 카드 상단 헤더(타이틀 + 오른쪽 도구영역) */}
        <div className="cardHeader">
          {/* 왼쪽 타이틀/설명 영역 */}
          <div>
            {/* 카드 제목 */}
            <div className="cardTitle">Upload New Document</div>
            {/* 카드 부제 */}
            <div className="cardSub">Upload PDF or images to start processing.</div>
          </div>

          {/* 오른쪽 도구 영역(드롭다운 등) */}
          <div className="rightTools">
            {/* 문서 타입 선택 드롭다운(현재는 저장만 함) */}
            <select
              className="select" // select 스타일 클래스
              value={projectType} // 현재 선택값(상태) 바인딩
              onChange={(e) => setProjectType(e.target.value)} // 변경 시 상태 업데이트
            >
              {/* 기본 옵션(선택 안 함) */}
              <option value="">Select Project/Doc Type (Optional)</option>
              {/* invoice 선택 */}
              <option value="invoice">Invoice</option>
              {/* report 선택 */}
              <option value="report">Report</option>
              {/* drawing 선택 */}
              <option value="drawing">Drawing</option>
              {/* 기타 */}
              <option value="etc">ETC</option>
            </select>
          </div>
        </div>

        {/* ================================ */}
        {/* 1) 업로드 화면 (step === 'upload') */}
        {/* ================================ */}
        {step === 'upload' && (
          <>
            {/* ✅ Dropzone 영역:
                - 드래그&드롭(onDropFiles) 또는 Browse로 파일 선택(onPickFiles) */}
            <div
              className="dropzone" // 드롭존 스타일
              onDragOver={(e) => e.preventDefault()} // 드래그 오버 기본 동작 방지(드롭 가능하게)
              onDrop={onDropFiles} // 드롭 시 파일 처리
            >
              {/* 구름 아이콘(텍스트) */}
              <div className="cloud">☁</div>
              {/* 드롭존 안내 문구 */}
              <div className="dzText">Drag and drop files here or click to browse</div>
              {/* 지원 포맷/크기 안내 */}
              <div className="dzSub">Supported: PDF, JPG, PNG. Max size 50MB.</div>

              {/* ✅ Browse 버튼:
                  label 클릭 -> 숨겨진 input[type=file] 클릭 */}
              <label className="browseBtn">
                {/* 버튼 라벨 텍스트 */}
                Browse
                {/* 실제 파일 선택 input(숨김) */}
                <input
                  type="file" // 파일 선택 input
                  accept="application/pdf,image/*" // PDF 또는 이미지 허용
                  multiple // 다중 선택 허용
                  onChange={(e) => onPickFiles(e.target.files)} // 선택 완료 시 처리
                  style={{ display: 'none' }} // UI에서 숨김
                />
              </label>
            </div>

            {/* ✅ 파일 리스트:
                items가 있으면 여러 행(fileRow)을 렌더링 */}
            {items.length > 0 && (
              // 파일 리스트 컨테이너
              <div className="fileList">
                {/* items 배열을 돌며 행 렌더링 */}
                {items.map((it) => (
                  // 파일 1행(클릭 가능)
                  <div
                    key={it.id} // React key(리스트 렌더링 안정성)
                    className="fileRow" // 행 스타일 클래스
                    style={{
                      marginBottom: 10, // 행 간격
                      // 선택된 행은 outline으로 강조 표시
                      outline: it.id === selectedId ? '2px solid #0800ff61' : 'none',
                      cursor: 'pointer', // 클릭 가능 커서
                    }}
                    // 행 클릭 시 해당 파일을 Preview 대상으로 선택
                    onClick={() => setSelectedId(it.id)}
                    title="클릭하면 Preview 대상으로 선택됩니다." // 마우스오버 툴팁
                  >
                    {/* MIME 타입에 따라 아이콘 표시 */}
                    <div className="fileIcon">{it.mime === 'application/pdf' ? '📄' : '🖼️'}</div>

                    {/* 파일 메타(이름/상태/프로그레스) 영역 */}
                    <div className="fileMeta">
                      {/* 파일명 표시 */}
                      <div className="fileName">{it.name}</div>

                      {/* 파일 크기, 상태 배지, 상태 메시지 표시 */}
                      <div className="fileSub">
                        {/* 파일 크기 텍스트 */}
                        {it.sizeText}
                        {/* 구분 점 */}
                        <span className="dot">·</span>

                        {/* status를 CSS class로 주어 색상/스타일 분기 가능 */}
                        <span className={`badge ${it.status}`}>
                          {/* uploading일 때 라벨 */}
                          {it.status === 'uploading' && 'Uploading'}
                          {/* processing일 때 라벨 */}
                          {it.status === 'processing' && 'Processing'}
                          {/* ready일 때 라벨 */}
                          {it.status === 'ready' && 'Ready'}
                          {/* error일 때 라벨 */}
                          {it.status === 'error' && 'Error'}
                        </span>

                        {/* 상태 메시지가 있을 때만 표시 */}
                        {it.message && (
                          <>
                            {/* 구분 점 */}
                            <span className="dot">·</span>
                            {/* 메시지 텍스트(회색) */}
                            <span className="muted">{it.message}</span>
                          </>
                        )}
                      </div>

                      {/* 진행률 표시 영역 */}
                      <div className="progressWrap">
                        {/* 바(외곽) */}
                        <div className="progressBar">
                          {/* 바(채움) - width를 progress%로 설정 */}
                          <div className="progressFill" style={{ width: `${it.progress}%` }} />
                        </div>
                        {/* 진행률 숫자 표시 */}
                        <div className="progressText">{it.progress}%</div>
                      </div>
                    </div>

                    {/* ✅ Retry/Delete 버튼 영역
                        - 이 버튼을 누를 때 행 클릭(onClick)이 같이 실행되면 안 되므로
                          stopPropagation으로 이벤트 전파 차단 */}
                    <div className="fileActions" onClick={(e) => e.stopPropagation()}>
                      {/* 재시도 버튼 */}
                      <button className="btn" onClick={() => retry(it.id)}>
                        Retry
                      </button>
                      {/* 삭제 버튼 */}
                      <button className="btn" onClick={() => removeItem(it.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 하단 버튼 바 */}
            <div className="bottomBar">
              {/* 현재 이전 단계가 없어서 비활성화 */}
              <button className="btn" disabled>
                Previous
              </button>

              {/* 오른쪽 하단 버튼 그룹 */}
              <div className="bottomRight">
                {/* 전체 초기화 버튼(파일 없으면 비활성) */}
                <button className="btn" onClick={resetAll} disabled={items.length === 0}>
                  Clear All
                </button>

                {/* Preview로 이동(단, canNext 조건 만족해야 활성화) */}
                <button
                  className="btn primary" // 강조 버튼 스타일
                  onClick={() => setStep('preview')} // preview 화면으로 전환
                  disabled={!canNext} // 조건 미충족이면 비활성화
                  title={!canNext ? 'Ready 상태의 파일을 선택해야 미리보기 가능합니다.' : ''} // 비활성 시 안내
                >
                  Next (Preview)
                </button>
              </div>
            </div>
          </>
        )}

        {/* ================================ */}
        {/* 2) 미리보기 화면 (step === 'preview') */}
        {/* ================================ */}
        {step === 'preview' && (
          <>
            {/* 미리보기 상단 헤더(Back/Title/New) */}
            <div className="previewHeader">
              {/* 업로드 화면으로 돌아가기 */}
              <button className="btn" onClick={() => setStep('upload')}>
                ◀ Back
              </button>

              {/* 미리보기 제목 */}
              <div className="previewTitle">Preview</div>
              {/* 레이아웃 여백(좌우 밀기용) */}
              <div className="spacer" />

              {/* 전체 리셋하고 처음부터 새로 */}
              <button className="btn" onClick={resetAll}>
                New Document
              </button>
            </div>

            {/* 미리보기 본문 영역 */}
            <div className="previewBody">
              {/* 선택된 파일이 없을 때 안내 */}
              {!activeFile && <div style={{ fontSize: 12, color: '#666' }}>선택된 파일이 없습니다.</div>}

              {/* PDF 파일이면 PdfViewer 컴포넌트로 렌더링 */}
              {activeFile?.type === 'application/pdf' && <PdfViewer file={activeFile} />}

              {/* 이미지 파일이면 img 태그로 렌더링
                  URL.createObjectURL(file):
                  - 로컬 File 객체를 브라우저에서 사용할 수 있는 임시 URL로 만들어줌 */}
              {activeFile && activeFile.type.startsWith('image/') && (
                // 이미지 미리보기 컨테이너
                <div className="imagePreview">
                  {/* 실제 이미지 태그 */}
                  <img
                    src={URL.createObjectURL(activeFile)} // 로컬 File -> 임시 URL로 변환하여 표시
                    alt="preview" // 접근성 대체 텍스트
                    style={{ maxWidth: '100%', borderRadius: 10 }} // 최대 너비 + 둥근 모서리
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

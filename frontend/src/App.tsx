import { useMemo, useRef, useState } from 'react';
import PdfViewer from './components/PdfViewer';
import './index.css';

/**
 * ✅ Step: 화면 흐름(간단한 상태 머신이라고 보면 됨)
 * - upload  : 파일을 업로드/목록을 보여주는 화면
 * - preview : 선택된 파일을 미리보기 하는 화면
 *
 * 상태값(step)을 바꾸는 것만으로, 아래 JSX에서 화면이 조건부 렌더링됨.
 */
type Step = 'upload' | 'preview';

/**
 * ✅ Status: 각 파일(UploadItem)이 현재 어떤 단계인지 표현
 * - uploading  : 업로드 진행 중 (progress가 계속 증가)
 * - processing : 업로드가 끝났고 "처리 중" (PDF 렌더링 같은 후처리라고 가정)
 * - ready      : 미리보기 가능 상태
 * - error      : 지원하지 않는 파일 포맷 등 오류 상태
 */
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
type UploadItem = {
  id: string;
  name: string;
  sizeText: string;
  progress: number; // 0~100
  status: Status;
  message?: string;
  mime: string; // file.type
};

/**
 * ✅ formatSize: 파일 크기(bytes)를 사람이 읽기 쉬운 문자열로 변환
 * - 1MB 이상이면 "xx.xx MB"
 * - 1MB 미만이면 "xxx KB"
 *
 * UI에서 파일 사이즈 표시용.
 */
function formatSize(bytes: number) {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

/**
 * ✅ isSupported: 업로드 가능한 포맷인지 검사
 * - PDF는 MIME이 application/pdf
 * - 이미지는 image/*로 시작 (jpg/png/webp 등)
 *
 * 이 함수를 기준으로 error 처리를 하거나, 파이프라인(simulatePipeline)을 돌릴지 결정함.
 */
function isSupported(file: File) {
  const okPdf = file.type === 'application/pdf';
  const okImg = file.type.startsWith('image/');
  return okPdf || okImg;
}

export default function App() {
  /**
   * ✅ step: 현재 화면 단계
   * - upload 화면에서 preview로 넘어갈 때 setStep('preview')
   * - preview에서 back 누르면 setStep('upload')
   */
  const [step, setStep] = useState<Step>('upload');

  /**
   * ✅ projectType: 사용자 선택 옵션(문서 타입)
   * 현재는 UI에서 선택만 저장하고 실제 처리 로직에는 연결되어 있지 않음.
   * 나중에 "invoice면 OCR 파이프라인", "drawing이면 도면 파서" 같은 분기를 넣을 수 있음.
   */
  const [projectType, setProjectType] = useState<string>('');

  /**
   * ✅ items: 업로드 목록(여러 파일 행)을 UI로 그리기 위한 state
   * - progress/status/message 등이 바뀌면 화면에 즉시 반영되어야 하므로 state로 관리
   */
  const [items, setItems] = useState<UploadItem[]>([]);

  /**
   * ✅ selectedId: 현재 사용자가 선택한 파일의 id
   * - fileRow 클릭하면 setSelectedId(it.id)
   * - preview 화면에서는 selectedId에 해당하는 File을 찾아서 렌더링
   */
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
  const fileMapRef = useRef<Map<string, File>>(new Map());

  /**
   * ✅ intervalMapRef: 업로드 진행률 시뮬레이션에 쓰는 setInterval id 저장
   * - 파일마다 interval을 개별로 돌리므로 id별로 intervalId를 기억해야 함
   * - 삭제/리셋 시 interval을 종료하지 않으면 메모리 누수 + 계속 setItems 호출 문제 발생
   */
  const intervalMapRef = useRef<Map<string, number>>(new Map());

  /**
   * ✅ activeItem: 선택된 파일의 UploadItem(= UI 행 정보)
   *
   * useMemo를 쓰는 이유(성능 + 안정):
   * - items가 바뀔 때마다 find로 탐색하는데, 큰 리스트에서는 비용이 될 수 있음
   * - selectedId 또는 items가 바뀔 때만 다시 계산하도록 함
   */
  const activeItem = useMemo(
    () => (selectedId ? items.find((x) => x.id === selectedId) ?? null : null),
    [items, selectedId]
  );

  /**
   * ✅ activeFile: 선택된 파일의 실제 File 객체
   * - fileMapRef에서 selectedId로 꺼내옴
   * - selectedId가 없으면 null
   */
  const activeFile = useMemo(() => {
    if (!selectedId) return null;
    return fileMapRef.current.get(selectedId) ?? null;
  }, [selectedId]);

  /**
   * ✅ clearIntervalById: 특정 파일 id의 업로드 타이머(진행률 증가)를 종료하고 Map에서 제거
   *
   * 왜 필요?
   * - 업로드가 끝났는데 interval이 계속 살아있으면 progress 업데이트가 계속 일어날 수 있음
   * - 파일 삭제했는데 interval이 살아있으면 없는 파일을 찾으려고 setItems를 계속 호출하게 됨
   */
  function clearIntervalById(id: string) {
    const t = intervalMapRef.current.get(id);
    if (t) {
      window.clearInterval(t);
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
  function removeItem(id: string) {
    // 1) 업로드 타이머 끄기
    clearIntervalById(id);

    // 2) 실제 File도 제거
    fileMapRef.current.delete(id);

    // 3) UI 목록에서 제거
    setItems((prev) => prev.filter((x) => x.id !== id));

    /**
     * 4) 선택 자동 이동 로직:
     * - 삭제 대상이 선택된 파일이 아니면, 선택 유지
     * - 삭제 대상이 선택된 파일이면:
     *   (남은 목록에서) ready 상태 파일이 있으면 그걸 선택
     *   아니면 남은 목록의 첫 번째를 선택
     *   아무 것도 없으면 null
     */
    setSelectedId((prevSelected) => {
      if (prevSelected !== id) return prevSelected;

      // ⚠️ 참고: 여기서 items는 "이 함수가 호출된 시점의 렌더 상태"를 참조
      // 실서비스라면 setItems 콜백(prev) 기반으로 remain을 계산하는 방식이 더 안전함.
      const remain = items.filter((x) => x.id !== id);
      const ready = remain.find((x) => x.status === 'ready')?.id;
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
  function resetAll() {
    // 현재 살아있는 interval들을 모두 끈다
    for (const id of intervalMapRef.current.keys()) clearIntervalById(id);

    intervalMapRef.current.clear();
    fileMapRef.current.clear();

    setItems([]);
    setSelectedId(null);
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
  function simulatePipeline(id: string) {
    // 이미 이 파일의 interval이 돌고 있었다면(재시도 등), 먼저 종료 후 재시작
    clearIntervalById(id);

    const intervalId = window.setInterval(() => {
      /**
       * setItems(prev => ...) 패턴:
       * - "이전 상태(prev)"를 기준으로 다음 상태를 만들기 때문에
       *   비동기/동시 업데이트에서도 안전하게 업데이트 가능
       */
      setItems((prev): UploadItem[] => {
        const cur = prev.find((x) => x.id === id);
        if (!cur) return prev; // 이미 삭제되었거나 없으면 아무 것도 안 함

        // uploading 상태가 아니면(이미 processing/ready/error) progress를 더 건드리지 않음
        if (cur.status !== 'uploading') return prev;

        // 진행률 증가(한 번 tick마다 +7)
        const next = Math.min(100, cur.progress + 7);

        // 100% 미만이면 계속 uploading
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

        // 2) interval 종료 (setInterval 내부에서 바로 clear해도 되지만,
        //    상태 업데이트 흐름이 꼬일 수 있어 다음 tick 전에 끊도록 0ms timeout 사용)
        window.setTimeout(() => clearIntervalById(id), 0);

        // 3) processing -> ready 전환 타이머
        window.setTimeout(() => {
          setItems((p): UploadItem[] =>
            p.map((x) =>
              // 여전히 processing일 때만 ready로 바꿈(중간에 삭제/재시도 같은 예외를 방어)
              x.id === id && x.status === 'processing'
                ? { ...x, status: 'ready', message: 'Ready to preview.' }
                : x
            )
          );

          // 아직 선택된 파일이 없으면 이 파일을 자동 선택
          setSelectedId((prevSelected) => prevSelected ?? id);
        }, 900);

        // 1) 현재 tick에서 processing 상태로 바꾸어 UI 반영
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

    // intervalId 저장(나중에 삭제/리셋/재시도 시 종료하기 위해)
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
  function addFiles(fileList: File[]) {
    if (fileList.length === 0) return;

    const newItems: UploadItem[] = [];

    for (const f of fileList) {
      // 파일을 UI에서 식별하기 위한 고유 id
      const id = crypto.randomUUID();

      // 실제 파일 객체 저장(리렌더와 무관하게 보관)
      fileMapRef.current.set(id, f);

      // UI에 표시할 기본 정보
      const base: UploadItem = {
        id,
        name: f.name,
        sizeText: formatSize(f.size),
        progress: 0,
        status: 'uploading',
        message: 'Uploading...',
        mime: f.type,
      };

      // 지원 포맷 아니면 error 처리
      if (!isSupported(f)) {
        newItems.push({
          ...base,
          status: 'error',
          message: 'Error: Unsupported file format.',
        });
      } else {
        newItems.push(base);
      }
    }

    // 기존 목록에 누적 + 선택 상태 처리
    setItems((prev) => {
      const merged = [...prev, ...newItems];

      /**
       * 선택된 파일이 아직 없다면 자동 선택
       * - merged 중 ready가 있으면 ready를 선택(사용자 경험적으로 바로 preview 가능)
       * - 아니면 첫 번째 파일 선택
       */
      if (!selectedId) {
        const firstReady = merged.find((x) => x.status === 'ready')?.id;
        const first = firstReady ?? merged[0]?.id ?? null;
        setSelectedId(first);
      }

      return merged;
    });

    // error가 아닌 것들만 업로드/처리 시뮬레이션 시작
    for (const it of newItems) {
      if (it.status !== 'error') simulatePipeline(it.id);
    }
  }

  /**
   * ✅ onPickFiles: 파일 input에서 선택한 FileList 처리
   * - FileList는 배열이 아니라 유사 배열이므로 Array.from으로 배열 변환
   */
  function onPickFiles(files: FileList | null) {
    if (!files) return;
    addFiles(Array.from(files));
  }

  /**
   * ✅ onDropFiles: 드래그&드롭으로 떨어진 파일 처리
   * - e.preventDefault()를 안 하면 브라우저가 파일을 열어버리는 기본 동작이 발생할 수 있음
   */
  function onDropFiles(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    addFiles(Array.from(files));
  }

  /**
   * ✅ retry: 특정 파일을 재시도
   *
   * - fileMapRef에서 File을 찾아옴(없으면 종료)
   * - 지원 포맷이 아니면 error 유지
   * - 지원 포맷이면 progress/status/message를 초기화하고 simulatePipeline 다시 시작
   */
  function retry(id: string) {
    const f = fileMapRef.current.get(id);
    if (!f) return;

    // 애초에 지원 포맷이 아니면 재시도해도 의미 없음
    if (!isSupported(f)) {
      setItems((prev) =>
        prev.map((x) =>
          x.id === id ? { ...x, status: 'error', message: 'Error: Unsupported file format.' } : x
        )
      );
      return;
    }

    // UI 상태 초기화
    setItems((prev) =>
      prev.map((x) =>
        x.id === id ? { ...x, progress: 0, status: 'uploading', message: 'Uploading...' } : x
      )
    );

    // 업로드/처리 흐름 재시작
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
  const canNext =
    !!activeItem && activeItem.status === 'ready' && !!activeFile && isSupported(activeFile);

  return (
    <div className="page">
      <div className="pageTitle">File Input Screen</div>

      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Upload New Document</div>
            <div className="cardSub">Upload PDF or images to start processing.</div>
          </div>

          <div className="rightTools">
            {/* 문서 타입 선택 드롭다운(현재는 저장만 함) */}
            <select
              className="select"
              value={projectType}
              onChange={(e) => setProjectType(e.target.value)}
            >
              <option value="">Select Project/Doc Type (Optional)</option>
              <option value="invoice">Invoice</option>
              <option value="report">Report</option>
              <option value="drawing">Drawing</option>
              <option value="etc">ETC</option>
            </select>
          </div>
        </div>

        {/* ================================
            1) 업로드 화면 (step === 'upload')
           ================================ */}
        {step === 'upload' && (
          <>
            {/* ✅ Dropzone 영역:
                - 드래그&드롭(onDropFiles) 또는 Browse로 파일 선택(onPickFiles) */}
            <div className="dropzone" onDragOver={(e) => e.preventDefault()} onDrop={onDropFiles}>
              <div className="cloud">☁</div>
              <div className="dzText">Drag and drop files here or click to browse</div>
              <div className="dzSub">Supported: PDF, JPG, PNG. Max size 50MB.</div>

              {/* ✅ Browse 버튼:
                  label 클릭 -> 숨겨진 input[type=file] 클릭 */}
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

            {/* ✅ 파일 리스트:
                items가 있으면 여러 행(fileRow)을 렌더링 */}
            {items.length > 0 && (
              <div className="fileList">
                {items.map((it) => (
                  <div
                    key={it.id}
                    className="fileRow"
                    style={{
                      marginBottom: 10,
                      // 선택된 행은 outline으로 강조 표시
                      outline: it.id === selectedId ? '2px solid #0800ff61' : 'none',
                      cursor: 'pointer',
                    }}
                    // 행 클릭 시 해당 파일을 Preview 대상으로 선택
                    onClick={() => setSelectedId(it.id)}
                    title="클릭하면 Preview 대상으로 선택됩니다."
                  >
                    {/* MIME 타입에 따라 아이콘 표시 */}
                    <div className="fileIcon">{it.mime === 'application/pdf' ? '📄' : '🖼️'}</div>

                    <div className="fileMeta">
                      <div className="fileName">{it.name}</div>

                      {/* 파일 크기, 상태 배지, 상태 메시지 표시 */}
                      <div className="fileSub">
                        {it.sizeText}
                        <span className="dot">·</span>

                        {/* status를 CSS class로 주어 색상/스타일 분기 가능 */}
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

                      {/* 진행률 표시 영역 */}
                      <div className="progressWrap">
                        <div className="progressBar">
                          <div className="progressFill" style={{ width: `${it.progress}%` }} />
                        </div>
                        <div className="progressText">{it.progress}%</div>
                      </div>
                    </div>

                    {/* ✅ Retry/Delete 버튼 영역
                        - 이 버튼을 누를 때 행 클릭(onClick)이 같이 실행되면 안 되므로
                          stopPropagation으로 이벤트 전파 차단 */}
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

            {/* 하단 버튼 바 */}
            <div className="bottomBar">
              {/* 현재 이전 단계가 없어서 비활성화 */}
              <button className="btn" disabled>
                Previous
              </button>

              <div className="bottomRight">
                {/* 전체 초기화 버튼 */}
                <button className="btn" onClick={resetAll} disabled={items.length === 0}>
                  Clear All
                </button>

                {/* Preview로 이동(단, canNext 조건 만족해야 활성화) */}
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

        {/* ================================
            2) 미리보기 화면 (step === 'preview')
           ================================ */}
        {step === 'preview' && (
          <>
            <div className="previewHeader">
              {/* 업로드 화면으로 돌아가기 */}
              <button className="btn" onClick={() => setStep('upload')}>
                ◀ Back
              </button>

              <div className="previewTitle">Preview</div>
              <div className="spacer" />

              {/* 전체 리셋하고 처음부터 새로 */}
              <button className="btn" onClick={resetAll}>
                New Document
              </button>
            </div>

            <div className="previewBody">
              {/* 선택된 파일이 없을 때 안내 */}
              {!activeFile && <div style={{ fontSize: 12, color: '#666' }}>선택된 파일이 없습니다.</div>}

              {/* PDF 파일이면 PdfViewer 컴포넌트로 렌더링 */}
              {activeFile?.type === 'application/pdf' && <PdfViewer file={activeFile} />}

              {/* 이미지 파일이면 img 태그로 렌더링
                  URL.createObjectURL(file):
                  - 로컬 File 객체를 브라우저에서 사용할 수 있는 임시 URL로 만들어줌 */}
              {activeFile && activeFile.type.startsWith('image/') && (
                <div className="imagePreview">
                  <img
                    src={URL.createObjectURL(activeFile)}
                    alt="preview"
                    style={{ maxWidth: '100%', borderRadius: 10 }}
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

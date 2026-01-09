import { useNavigate } from 'react-router-dom';

export default function PreviewPage() {
  const nav = useNavigate();

  return (
    <section className="stage">
      <h1 className="stageTitle">미리보기(Preview)</h1>
      <p className="muted">1단계: Preview 화면 틀. 다음 단계에서 좌측 리스트 + 우측 뷰어 구성.</p>

      <div className="card">
        <button className="navBtn" onClick={() => nav('/')}>
          ← 업로드로
        </button>
      </div>
    </section>
  );
}

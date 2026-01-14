export default function UploadDropzoneCard() {
  return (
    <div className="dropCard">
      <div className="dropZone">
        <div className="dropIcon">📄</div>
        <div className="dropTitle">파일을 여기에 끌어다 놓거나</div>
        <button className="btn primary">파일 선택</button>
        <div className="dropHint">지원: PDF, PNG, JPG</div>
      </div>

      <div className="dropFooter">
        <span className="muted">업로드하면 자동으로 처리 상태가 표시됩니다.</span>
      </div>
    </div>
  );
}

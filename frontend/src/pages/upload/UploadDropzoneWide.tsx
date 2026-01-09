export default function UploadDropzoneWide() {
  return (
    <div className="dropzoneWide">
      <div className="dzInner">
        <div className="dzIcon">📄</div>

        <div className="dzButtonRow">
          <button className="dzBtn">
            <span className="dzBtnIcon">📁</span>
            파일 선택
            <span className="dzBtnCaret">▾</span>
          </button>
        </div>

        <div className="dzHint">또는 파일을 여기로 끌어 놓으세요</div>
      </div>
    </div>
  );
}

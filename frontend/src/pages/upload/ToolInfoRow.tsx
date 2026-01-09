export default function ToolInfoRow() {
  return (
    <section className="infoRow">
      <div className="infoLeft">
        <p className="infoText">
          PDF/이미지 도면을 업로드하면 자동으로 처리 상태를 표시하고,
          파일을 선택해 Preview로 전환하여 검토/관리까지 이어갈 수 있습니다.
        </p>
      </div>

      <div className="infoRight">
        <div className="checkItem">✅ 업로드/처리 진행상태 표시</div>
        <div className="checkItem">✅ PDF·이미지 도면 Preview 지원</div>
        <div className="checkItem">✅ 파일 선택 기반 작업 흐름</div>
      </div>
    </section>
  );
}

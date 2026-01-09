export default function HeroSection() {
  return (
    <div className="hero">
      <h1 className="heroTitle">PDF/이미지에서 필요한 정보를 빠르게 추출하세요</h1>
      <p className="heroSub">
        파일 업로드 → 처리 상태 확인 → 파일 선택 → 미리보기로 바로 이동
      </p>

      <div className="heroActions">
        <button className="btn primary">무료로 시작</button>
        <button className="btn">도구 살펴보기</button>
      </div>

      <ul className="heroBullets">
        <li>PDF / 이미지 업로드</li>
        <li>업로드·처리 진행률 표시</li>
        <li>선택 파일 Preview 전환</li>
      </ul>
    </div>
  );
}

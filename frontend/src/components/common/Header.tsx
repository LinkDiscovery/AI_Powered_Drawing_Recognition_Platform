import { Link, useNavigate } from "react-router-dom";

export default function Header() {
  const nav = useNavigate();
  const token = localStorage.getItem("access_token");
  const isAuthed = !!token;

  return (
    <div style={styles.bar}>
      <div style={styles.left}>
        <div style={styles.logo} onClick={() => nav("/")}>SmallPDF-ish</div>

        <div style={styles.menu}>
          <button style={styles.menuBtn}>도구 ▾</button>
          <button style={styles.menuBtn}>압축</button>
          <button style={styles.menuBtn}>변환</button>
          <button style={styles.menuBtn}>병합</button>
        </div>
      </div>

      <div style={styles.right}>
        {!isAuthed ? (
          <>
            {/* ✅ 여기서 “페이지 이동” 대신 “모달 열기”로 바꿔도 됨 */}
            <Link to="/?auth=login" style={styles.linkBtn}>로그인</Link>
            <Link to="/?auth=signup" style={styles.primaryBtn}>무료체험</Link>
          </>
        ) : (
          <>
            <button style={styles.linkBtn} onClick={() => nav("/upload")}>내 작업</button>
            <button
              style={styles.linkBtn}
              onClick={() => {
                localStorage.removeItem("access_token");
                nav("/", { replace: true });
              }}
            >
              로그아웃
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles: any = {
  bar: {
    height: 56,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 18px",
    borderBottom: "1px solid #eee",
    background: "white",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  left: { display: "flex", alignItems: "center", gap: 16 },
  logo: { fontWeight: 900, cursor: "pointer" },
  menu: { display: "flex", alignItems: "center", gap: 10 },
  menuBtn: { border: "none", background: "transparent", cursor: "pointer" },

  right: { display: "flex", alignItems: "center", gap: 10 },
  linkBtn: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "white",
    cursor: "pointer",
    textDecoration: "none",
    color: "#111",
    fontWeight: 700,
  },
  primaryBtn: {
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid #111",
    background: "#111",
    cursor: "pointer",
    textDecoration: "none",
    color: "white",
    fontWeight: 800,
  },
};

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import UploadPage from '../pages/upload/UploadPage';
import ProtectedRoute from '../components/common/ProtectedRoute';
import TopBar from '../components/common/TopBar';

export default function App() {
  return (
    <BrowserRouter>
      {/* ✅ 페이지 폭 제한(.page) 밖에서 렌더링되므로 "쫙" 퍼짐 */}
      <TopBar />

      <Routes>
        {/* ✅ 메인 = 기존 업로드 화면(랜딩처럼) */}
        <Route path="/" element={<UploadPage />} />

        {/* ✅ 로그인 성공 후 실제 작업 페이지가 따로 필요하면 /upload를 보호로 유지 */}
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <UploadPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

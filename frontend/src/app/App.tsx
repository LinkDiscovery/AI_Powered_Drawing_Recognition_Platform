import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import LoginPage from '../pages/auth/LoginPage';
import SignupPage from '../pages/auth/SignupPage';
import UploadPage from '../pages/upload/UploadPage';
import ProtectedRoute from '../components/common/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 기본 진입 */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* 로그인 필요 페이지 */}
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <UploadPage />
            </ProtectedRoute>
          }
        />

        {/* 없는 경로 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

import { Outlet, useLocation } from 'react-router-dom';
import SmallpdfHeader from '../components/layout/SmallpdfHeader';
import { AuthProvider } from '../context/AuthContext';
import { FileProvider } from '../context/FileContext';
import { ToastProvider } from '../context/ToastContext';

export default function RootLayout() {
  const location = useLocation();
  const isPreview = location.pathname.startsWith('/preview');

  return (
    <ToastProvider>
      <AuthProvider>
        <FileProvider>
          {!isPreview && <SmallpdfHeader />}
          <Outlet />
        </FileProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

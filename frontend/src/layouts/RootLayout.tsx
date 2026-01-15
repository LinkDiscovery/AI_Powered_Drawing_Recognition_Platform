import { Outlet } from 'react-router-dom';
import SmallpdfHeader from '../components/layout/SmallpdfHeader';
import { AuthProvider } from '../context/AuthContext';
import { FileProvider } from '../context/FileContext';
import { ToastProvider } from '../context/ToastContext';

export default function RootLayout() {
  return (
    <ToastProvider>
      <AuthProvider>
        <FileProvider>
          <SmallpdfHeader />
          <Outlet />
        </FileProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

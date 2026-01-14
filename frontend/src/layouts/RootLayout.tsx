import { Outlet } from 'react-router-dom';
import SmallpdfHeader from '../components/layout/SmallpdfHeader';
import { AuthProvider } from '../context/AuthContext';
import { FileProvider } from '../context/FileContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <FileProvider>
        <SmallpdfHeader />
        <Outlet />
      </FileProvider>
    </AuthProvider>
  );
}

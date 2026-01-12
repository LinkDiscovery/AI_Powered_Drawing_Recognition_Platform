import { Outlet } from 'react-router-dom';
import SmallpdfHeader from '../components/layout/SmallpdfHeader';
import { AuthProvider } from '../context/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <SmallpdfHeader />
      <Outlet />
    </AuthProvider>
  );
}

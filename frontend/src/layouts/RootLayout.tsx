import { Outlet } from 'react-router-dom';
import SmallpdfHeader from '../components/layout/SmallpdfHeader';

export default function RootLayout() {
  return (
    <>
      <SmallpdfHeader />
      <Outlet />
    </>
  );
}

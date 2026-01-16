import { createBrowserRouter } from 'react-router-dom';
import RootLayout from './layouts/RootLayout';

import HomePage from './pages/home/HomePage';
import UploadPage from './pages/upload/UploadPage';
import PreviewPage from './pages/preview/PreviewPage';
import UserDashboard from './pages/dashboard/UserDashboard';
// 필요하면 다른 페이지들도 추가

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'upload', element: <UploadPage /> },
      { path: 'preview', element: <PreviewPage /> },
      { path: 'dashboard', element: <UserDashboard /> },
      // { path: 'pricing', element: <PricingPage /> },
      // { path: 'teams', element: <TeamsPage /> },
    ],
  },
]);


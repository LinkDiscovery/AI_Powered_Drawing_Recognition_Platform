import { Outlet } from 'react-router-dom';
import TopNav from '../components/common/TopNav';
import { AuthDrawerProvider } from './providers/AuthDrawerProvider';

import '../styles/layout.css';

export default function AppShell() {
  return (
    <AuthDrawerProvider>
      {/* ✅ 상단바는 풀폭(쫙) */}
      <TopNav />

      {/* ✅ 본문은 중앙 폭 제한(container) */}
      <main className="appMain">
        <div className="container">
          <Outlet />
        </div>
      </main>
    </AuthDrawerProvider>
  );
}

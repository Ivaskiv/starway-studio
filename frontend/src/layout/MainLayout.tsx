// frontend/src/components/layout/MainLayout.tsx
// Публічні сторінки (лендинг). Для кабінету — DashboardLayout.

import { Outlet } from 'react-router-dom';
import LandingHeader from '@/layout/LandingHeader';
import Footer from '@/layout/Footer';
import Breadcrumbs from './Breadcrumbs';

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-[#0d0f1a] text-white flex flex-col" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
      <LandingHeader />
      <main className="flex-1 pt-14">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <Breadcrumbs />
        </div>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
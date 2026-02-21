// packages/frontend/src/components/layout/MainLayout.tsx
import { Outlet } from 'react-router-dom';
import Breadcrumbs from './Breadcrumbs';
import Footer from './Footer';
import Header from './Header';

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      <Header />
      {/* fix code_x: reserve space for fixed header so content is never hidden under top navigation. */}
      <main className="flex-1 pt-16">
        <div className="max-w-7xl mx-auto px-5 sm:px-6">
          <Breadcrumbs />
        </div>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

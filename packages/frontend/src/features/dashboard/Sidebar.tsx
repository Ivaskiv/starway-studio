// packages/frontend/src/features/dashboard/Sidebar.tsx
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  role: 'superAdmin' | 'funnelAdmin' | 'user';
}

const MENU_ITEMS = {
  superAdmin: [
    { label: 'Users', path: 'users' },
    { label: 'Funnels', path: 'funnels' },
    { label: 'Products', path: 'products' },
    { label: 'Analytics', path: 'analytics' },
    { label: 'Settings', path: 'settings' },
  ],
  funnelAdmin: [
    { label: 'My Funnels', path: 'my-funnels' },
    { label: 'Products', path: 'products' },
    { label: 'My Users', path: 'my-users' },
    { label: 'Analytics', path: 'analytics' },
  ],
  user: [
    { label: 'My Progress', path: 'progress' },
    { label: 'My Products', path: 'products' },
    { label: 'Wheel of Balance', path: 'wheel' },
    { label: 'Stats', path: 'stats' },
  ],
};

const Sidebar = ({ role }: SidebarProps) => {
  const location = useLocation();

  return (
    <div className="w-60 bg-slate-800 border-r border-slate-700 flex flex-col">
      <div className="p-4 font-bold text-lg border-b border-slate-700">Dashboard</div>
      <nav className="flex-1 p-2 flex flex-col gap-1">
        {MENU_ITEMS[role].map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`px-4 py-2 rounded hover:bg-slate-700 transition-colors ${
              location.pathname.includes(item.path) ? 'bg-slate-700' : ''
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;

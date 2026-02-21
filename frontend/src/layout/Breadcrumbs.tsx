import { ROUTE_METADATA, type RoutePath } from '@/config/routes';
import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

type Crumb = {
  to: string;
  label: string;
};

const toLabel = (path: string): string => {
  const meta = ROUTE_METADATA[path as RoutePath];
  if (meta?.title) return meta.title;

  const segment = path.split('/').filter(Boolean).pop() ?? '';
  return decodeURIComponent(segment)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};

export default function Breadcrumbs() {
  const { pathname } = useLocation();

  if (pathname === '/') return null;

  const segments = pathname.split('/').filter(Boolean);
  const crumbs: Crumb[] = [];

  let acc = '';
  for (const segment of segments) {
    acc += `/${segment}`;
    crumbs.push({ to: acc, label: toLabel(acc) });
  }

  return (
    <div className="w-full py-2">
      {/* fix code_x: global breadcrumbs directly under header for fast orientation on every page. */}
      <nav
        aria-label="Breadcrumbs"
        className="flex items-center gap-1.5 text-xs sm:text-sm text-white/65 overflow-x-auto no-scrollbar"
      >
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/80 transition-colors"
        >
          <Home className="w-3.5 h-3.5" />
          {/* fix code_x: avoid duplicate "Головна" wording with dashboard main item; keep root breadcrumb neutral. */}
          <span>Сайт</span>
        </Link>

        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <div key={crumb.to} className="inline-flex items-center gap-1.5 shrink-0">
              <ChevronRight className="w-3.5 h-3.5 text-white/35" />
              {isLast ? (
                <span className="px-2.5 py-1 rounded-lg border border-[color:rgba(var(--accent-rgb),0.35)] bg-[color:rgba(var(--accent-rgb),0.14)] text-white">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={crumb.to}
                  className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/75 transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

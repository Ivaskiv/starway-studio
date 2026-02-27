// frontend/src/components/layout/Breadcrumbs.tsx

import { ROUTE_METADATA, type RoutePath } from '@/config/routes';
import { Link, useLocation } from 'react-router-dom';

const toLabel = (path: string): string => {
  const meta = ROUTE_METADATA[path as RoutePath];
  if (meta?.title) return meta.title;
  const segment = path.split('/').filter(Boolean).pop() ?? '';
  return decodeURIComponent(segment)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
};

interface BreadcrumbsProps { items?: string[] }

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const { pathname } = useLocation();

  /* ── static items ── */
  if (items?.length) {
    return (
      <nav className="flex items-center gap-2 py-2 text-[13px] text-white/38">
        {items.map((label, i) => (
          <span key={i} className="flex items-center gap-2">
            <span className="cursor-pointer hover:text-white transition-colors">{label}</span>
            {i < items.length - 1 && <span className="text-white/[0.15]">›</span>}
          </span>
        ))}
      </nav>
    );
  }

  if (pathname === '/') return null;

  /* ── auto from route ── */
  const crumbs: { to: string; label: string }[] = [];
  let acc = '';
  for (const seg of pathname.split('/').filter(Boolean)) {
    acc += `/${seg}`;
    crumbs.push({ to: acc, label: toLabel(acc) });
  }

  return (
    <div className="w-full py-2 overflow-x-auto">
      <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-[13px] text-white/65">

        {/* home */}
        <Link to="/"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[7px] border border-white/[0.07] bg-white/[0.03] text-white/80 hover:bg-white/[0.06] transition-colors whitespace-nowrap no-underline"
        >
          🏠 Сайт
        </Link>

        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <span key={crumb.to} className="inline-flex items-center gap-1.5 flex-shrink-0">
              <span className="text-white/[0.20] text-[12px]">›</span>
              {isLast ? (
                <span className="px-2.5 py-1 rounded-[7px] border border-orange-500/35 bg-orange-500/[0.12] text-white font-semibold whitespace-nowrap">
                  {crumb.label}
                </span>
              ) : (
                <Link to={crumb.to}
                  className="px-2.5 py-1 rounded-[7px] border border-white/[0.07] bg-white/[0.03] text-white/75 hover:bg-white/[0.06] transition-colors whitespace-nowrap no-underline"
                >{crumb.label}</Link>
              )}
            </span>
          );
        })}
      </nav>
    </div>
  );
}
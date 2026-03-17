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
      <nav className="breadcrumbs-nav">
        {items.map((label, i) => (
          <span key={i} className="breadcrumbs-item">
            <span className="breadcrumbs-label">{label}</span>
            {i < items.length - 1 && <span className="breadcrumbs-separator">›</span>}
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
    <div>
      <nav aria-label="Breadcrumbs" className="breadcrumbs-stack">

        {/* home */}
        <Link to="/" className="breadcrumbs-home">
          🏠 Сайт
        </Link>

        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          return (
            <span key={crumb.to} className="inline-flex items-center gap-1.5 flex-shrink-0">
              <span className="breadcrumbs-separator">›</span>
              {isLast ? (
                <span className="breadcrumbs-current">{crumb.label}</span>
              ) : (
                <Link to={crumb.to} className="breadcrumbs-link">{crumb.label}</Link>
              )}
            </span>
          );
        })}
      </nav>
    </div>
  );
}

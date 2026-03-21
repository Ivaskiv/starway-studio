import { GlassCard } from '@/ui'
import { ROUTE_METADATA, ROUTES } from '@/config/routes'
import { Link } from 'react-router-dom'

const routeEntries = Object.entries(ROUTES).map(([key, path]) => ({
  key,
  path,
  meta: ROUTE_METADATA[path],
  type: path.startsWith('/dashboard') ? 'dashboard' : 'public',
}))

export default function DevRoutes() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.4em] text-[var(--text-muted)]">Dev tools</p>
          <h1 className="text-3xl font-bold">Routes QA</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Тут можна перевірити всі визначені шляхи та швидко перепрыгнути на кожен маршрут. Якщо щось не працює — підказка поруч.
          </p>
          <Link
            to={ROUTES.HOME}
            className="btn-responsive nav-tab-responsive glass-button w-fit text-xs px-4 py-2"
          >
            <span className="btn-icon" aria-hidden="true">
              ↩
            </span>
            <span className="nav-tab-label">На головну</span>
          </Link>
        </div>
        <div className="grid gap-3">
          {routeEntries.map(({ key, path, meta, type }) => (
            <GlassCard key={key} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
              <div className="flex-1 space-y-1">
                <p className="text-[10px] uppercase tracking-[0.4em] text-[var(--text-muted)]">
                  {type} · {key}
                </p>
                <p className="text-lg font-semibold">{path}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {meta?.title ?? '—'} {meta?.requiresPaid ? '· paid' : ''}
                </p>
                {meta?.description && (
                  <p className="text-xs text-[var(--text-muted)]">{meta.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={path}
                  className="glass-button border border-[var(--border-primary)] px-4 py-2 text-sm"
                >
                  Відкрити
                </Link>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  )
}

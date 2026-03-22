import { useAppSelector } from '@/app/hooks'
import { Send } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { ROUTES } from '@/config/routes'
import { useGetTelegramLinkUrlQuery } from '@/features/auth/services/auth.api'

export default function SettingsBreadcrumbAction() {
  const { pathname } = useLocation()
  const isAuthenticated = useAppSelector(state => state.auth.status === 'authenticated')
  const { data } = useGetTelegramLinkUrlQuery(undefined, {
    skip: !isAuthenticated || pathname !== ROUTES.SETTINGS,
  })

  if (pathname !== ROUTES.SETTINGS) return null

  const linked = Boolean(data?.linked)
  const href = data?.url

  if (linked) {
    return (
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-[rgba(var(--accent-rgb),0.25)] bg-[rgba(var(--accent-rgb),0.08)] text-sm font-semibold text-[color:var(--text-primary)] shadow-[0_2px_12px_rgba(var(--accent-rgb),0.2)]">
        <Send className="w-4 h-4 text-[color:var(--accent-soft)]" />
        Telegram підключено
      </div>
    )
  }

  return (
    <a
      href={href ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-[rgba(var(--accent-rgb),0.25)] bg-[rgba(255,255,255,0.04)] text-sm font-semibold text-[color:var(--text-primary)] shadow-[0_2px_12px_rgba(var(--accent-rgb),0.15)] transition hover:bg-[rgba(var(--accent-rgb),0.12)] hover:border-[rgba(var(--accent-rgb),0.45)]"
    >
      <Send className="w-4 h-4 text-[color:var(--accent-soft)]" />
      Підключити Telegram
    </a>
  )
}

import BusinessOpsPanel from '@/features/admin/components/BusinessOpsPanel'
import UsersInsightsPanel from '@/features/admin/components/UsersInsightsPanel'
import { ROUTES, toAppRoutePath } from '@/config/routes'
import { InfoHint } from '@/ui'
import { Target, TrendingUp, Users, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { MarketingCardConfig, MarketingCardKey, ProducerMetric, ProducerProduct } from '../types/dashboard.types'
import ContentMachinePage from './ContentMachinePage'
import { DASHBOARD_EYEBROW_CLASS, MetricCard, QuickAction, StatusPill } from './dashboardPrimitives'
import ExpertMarketingTaskCard from './ExpertMarketingTaskCard'
import FunnelAutomationPanel from './FunnelAutomationPanel'

export default function ExpertDashboardView({
  currentRole,
  displayName,
  todayLabel,
  section,
  metrics,
  producerProducts,
  generatedCards,
  marketingCards,
  onGenerateCard,
}: {
  currentRole: string
  displayName: string
  todayLabel: string
  section: string
  metrics: ProducerMetric[]
  producerProducts: ProducerProduct[]
  generatedCards: Partial<Record<MarketingCardKey, string[]>>
  marketingCards: MarketingCardConfig[]
  onGenerateCard: (card: MarketingCardConfig) => void
}) {
  const navigate = useNavigate()
  const dashboardSectionPath = (sectionName: string) => `${ROUTES.DASHBOARD}?section=${sectionName}`
  const isSuperAdmin = currentRole === 'SUPERADMIN'
  const isAdmin = currentRole === 'ADMIN'
  const heroTitle = isSuperAdmin ? 'Бізнес-режим' : isAdmin ? 'Операційний режим' : 'Коуч-режим'
  const heroDescription = isSuperAdmin
    ? 'Один простір для учнів, контенту, воронки і ключових метрик, без розриву між коучингом і бізнес-рішеннями.'
    : isAdmin
      ? 'Один простір для контенту, системних операцій і контролю процесів без окремого дубльованого кабінету.'
      : 'Один простір для учнів, контенту і воронки, де легко перемикатись між коучингом, повідомленнями і наступними діями.'

  return (
    <div className="space-y-6 p-6">
      <div className="dashboard-liquid-card overflow-hidden">
        <div className="dashboard-liquid-edge--top px-6 py-6">
          <div className="dashboard-hero-shell">
            <div className="dashboard-hero-copy">
              <div >
                <div className="px-4 py-3 text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">Оновлено</p>
                  <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{todayLabel}</p>
                </div>
              </div>

              <div className="max-w-4xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--accent-soft-rgb))]">
                  {isSuperAdmin ? 'Starway Studio · SuperAdmin' : isAdmin ? 'Starway Studio · Admin' : 'Starway Studio · Expert'}
                </p>
                <h1 className="mt-3 text-[2.05rem] font-semibold tracking-tight text-[var(--text-primary)] md:text-[2.35rem]">
                  {heroTitle} · {displayName}
                </h1>
                <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[var(--text-secondary)] md:text-base">
                  {heroDescription}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.key}
            icon={metric.icon}
            title={metric.title}
            label={metric.label}
            accent={metric.accent}
            tone={metric.tone}
            info={metric.info}
          />
        ))}
      </div>

      <div className="space-y-6">
        {!isAdmin && section === 'students' && <UsersInsightsPanel />}

        {section === 'content' && (
          <ContentMachinePage />
        )}

        {!isAdmin && !isSuperAdmin && section === 'leadmagnet' && (
          <FunnelAutomationPanel />
        )}

        {!isAdmin && section === 'ai-seo' && (
          <div className="grid gap-6">
            {marketingCards
              .filter((card) => card.key === 'seo' || card.key === 'headline')
              .map((card) => (
                <ExpertMarketingTaskCard
                  key={card.key}
                  card={card}
                  generated={generatedCards[card.key] ?? []}
                  onGenerate={() => onGenerateCard(card)}
                />
              ))}
          </div>
        )}

        {section === 'system' && (isSuperAdmin || isAdmin) && <BusinessOpsPanel />}

        {(section === 'overview' || (isAdmin && section === 'system')) && (
          <div className="dashboard-responsive-split--wide">
            <div className="dashboard-liquid-card--soft p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className={DASHBOARD_EYEBROW_CLASS}>Продукти і канали</p>
                    <InfoHint
                      label="Продукти і канали"
                      description="Короткий зріз того, які модулі й канали вже активні для роботи експерта."
                      instruction="Цей блок не дублює окремі сторінки, а лише допомагає швидко зорієнтуватись, що вже готове до запуску."
                    />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                    Активні продукти, канали доставки й опорні точки для швидкого переходу між сайтовим кабінетом, mini app і Telegram.
                  </p>
                </div>
                <span className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1 text-xs text-[var(--text-muted)]">
                  {producerProducts.length} продукт(и)
                </span>
              </div>
              <div className="mt-5 divide-y divide-[var(--border)]">
                {producerProducts.map((product) => (
                  <div key={product.id ?? product.name ?? product.title} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[15px] font-medium text-[var(--text-primary)]">{product.title ?? product.name ?? 'Продукт'}</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                          {product.description ?? 'Основний сценарій уже активний і готовий до подальшого розширення в сайті, mini app та Telegram.'}
                        </p>
                      </div>
                      <StatusPill active label="Активний" tone="green" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="dashboard-liquid-card--soft p-5">
              <div className="flex items-center gap-2">
                <p className={DASHBOARD_EYEBROW_CLASS}>Швидкі дії</p>
                <InfoHint
                  label="Швидкі дії"
                  description="Швидкі переходи між головними режимами роботи експерта."
                  instruction="Використовуй цей блок, коли потрібно відразу переключитись із коучингу на контент або з контенту на воронку."
                />
              </div>
              <div className="mt-4 space-y-3">
                <QuickAction
                  icon={<Users className="h-4 w-4 text-[var(--accent)]" />}
                  label={isAdmin ? 'Система' : 'Користувачі'}
                  sub={isAdmin ? 'Користувачі, ownership, question sets, activity log' : 'Живий список, ризики, активність, наступні дії'}
                  onClick={() => navigate(isAdmin ? dashboardSectionPath('system') : dashboardSectionPath('students'))}
                />
                <QuickAction
                  icon={<Zap className="h-4 w-4 text-[var(--accent)]" />}
                  label="Content Machine"
                  sub="CM v2, сценарії, ads і публікація в одному місці"
                  onClick={() => navigate(dashboardSectionPath('content'))}
                />
                {!isAdmin ? (
                  <QuickAction
                    icon={<Target className="h-4 w-4 text-[var(--accent)]" />}
                    label="Воронка"
                    sub="D0 → D14 з умовами і шаблонами"
                    onClick={() => navigate(dashboardSectionPath('leadmagnet'))}
                  />
                ) : null}
                <QuickAction
                  icon={<TrendingUp className="h-4 w-4 text-[var(--accent)]" />}
                  label="Аналітика"
                  sub={isSuperAdmin ? 'Конверсія, retention, revenue' : isAdmin ? 'Системні сигнали і жива активність' : 'Основні показники руху'}
                  onClick={() => navigate(isSuperAdmin ? toAppRoutePath('/dashboard/admin/revenue') : isAdmin ? dashboardSectionPath('system') : dashboardSectionPath('ai-seo'))}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

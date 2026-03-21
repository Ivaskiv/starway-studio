// fix style $100k — premium theme selector with glass swatches
import { type FC, useState } from 'react'
import { GlassCard, type Variant as GlassCardVariant } from '@/ui/GlassCard'
import { Badge } from '@/ui/Badge'
import {
  useGetAdminProfilesQuery,
  useRunAnalysisMutation,
  useMarkOfferShownMutation,
  type MentorProfile,
} from '../services/weekly-analysis.api'
import { Button } from '@/ui'

// ── Helpers ───────────────────────────────────────────────────
const riskColor = (score: number) => {
  if (score <= 4) return 'risk-high'
  if (score <= 7) return 'risk-medium'
  return 'risk-stable'
}

const toneEmoji: Record<string, string> = {
  'тривожна': '😰', 'мотивована': '🔥', 'виснажена': '😮‍💨',
  'стабільна': '😌', 'піднесена': '✨',
}

const rhythmEmoji: Record<string, string> = {
  'регулярна': '📈', 'хаотична': '🌀', 'спадає': '📉', 'зростає': '🚀',
}

// ── Картка одного профілю ─────────────────────────────────────
const ProfileCard: FC<{ profile: MentorProfile }> = ({ profile }) => {
  const [expanded, setExpanded] = useState(false)
  const [runAnalysis, { isLoading: running }] = useRunAnalysisMutation()
  const [markOffer, { isLoading: marking }] = useMarkOfferShownMutation()
  const risk = riskColor(profile.retentionRisk)

  return (
    <div className="rounded-2xl overflow-hidden transition-all liquid-glass border-[var(--glass-border)]">

      {/* Header */}
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start gap-3">

          {/* Avatar */}
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 bg-gradient-avatar">
            {profile.user.name?.[0]?.toUpperCase() ?? '?'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-sm text-white truncate">
                {profile.user.name || profile.user.email}
              </span>

              {/* Retention badge */}
              <Badge className={`text-xs font-bold ${risk}`}>
                {profile.retentionRisk <= 4 ? 'Ризик' : profile.retentionRisk <= 7 ? 'Середній' : 'Стабільна'} {profile.retentionRisk}/10
              </Badge>

              {/* Emotional tone */}
              <span className="text-xs text-white/50">
                {toneEmoji[profile.emotionalTone] ?? '•'} {profile.emotionalTone}
              </span>

              {/* Engagement rhythm */}
              <span className="text-xs text-white/50">
                {rhythmEmoji[profile.engagementRhythm] ?? '•'} {profile.engagementRhythm}
              </span>
            </div>

            <p className="text-xs text-white/60 leading-relaxed">
              💬 {profile.mainPainThisWeek}
            </p>
          </div>

          {/* Upsell indicator */}
          {profile.upsellReady && !profile.offerShownAt && (
            <Badge className="upsell-badge text-xs font-bold">
              💎 Апсейл
            </Badge>
          )}

          <span className="text-white/30 text-sm flex-shrink-0">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-[var(--glass-border)]">

          {/* Behavior */}
          <div className="pt-3">
            <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Патерн поведінки</p>
            <p className="text-sm text-white/80">{profile.behaviorPattern}</p>
          </div>

          {/* Retention */}
          <div className="grid grid-cols-2 gap-3">
            <GlassCard variant={profile.retentionRisk <= 4 ? 'error' : profile.retentionRisk <= 7 ? 'warning' : 'success'} className="p-3">
              <p className="text-xs text-white/40 mb-1">Що тримає</p>
              <ul className="space-y-0.5">
                {profile.retentionFactors.map((factor, index) => (
                  <li key={index} className="text-xs text-green-400">• {factor}</li>
                ))}
              </ul>
            </GlassCard>
            {profile.churnSignals.length > 0 && (
              <GlassCard variant="error" className="p-3">
                <p className="text-xs text-white/40 mb-1">Сигнали відходу</p>
                <ul className="space-y-0.5">
                  {profile.churnSignals.map((signal, index) => (
                    <li key={index} className="text-xs text-red-400">• {signal}</li>
                  ))}
                </ul>
              </GlassCard>
            )}
          </div>

          {/* Upsell block */}
          {profile.upsellReady && (
            <GlassCard variant="accent" className="p-3">
              <p className="text-xs font-bold mb-2 text-accent">💎 Рекомендований оффер</p>
              <p className="text-sm text-white/80 mb-1"><strong>Продукт:</strong> {profile.upsellProduct}</p>
              <p className="text-sm text-white/80 mb-1"><strong>Коли:</strong> {profile.upsellTiming}</p>
              <p className="text-sm text-white/80 mb-2"><strong>Чому зараз:</strong> {profile.upsellReasoning}</p>
              <p className="text-sm font-semibold text-white">{profile.recommendedOffer}</p>
              {!profile.offerShownAt ? (
                <Button onClick={() => markOffer(profile.id)} disabled={marking} variant="glass" color="accent" size="sm" className="mt-3">
                  {marking ? 'Зберігаю...' : '✓ Оффер показано'}
                </Button>
              ) : (
                <p className="mt-2 text-xs text-white/30">
                  Показано: {new Date(profile.offerShownAt).toLocaleDateString('uk')}
                </p>
              )}
            </GlassCard>
          )}

          {/* System notes */}
          {profile.systemNotes && (
            <GlassCard className="p-3">
              <p className="text-xs text-white/40 mb-1">📝 Нотатки для AI-ментора</p>
              <p className="text-xs text-white/70 leading-relaxed">{profile.systemNotes}</p>
            </GlassCard>
          )}

          {/* Trigger */}
          {profile.triggerForContact && (
            <div className="text-xs text-white/50">
              🔔 Тригер контакту: <span className="text-white/70">{profile.triggerForContact}</span>
            </div>
          )}

          {/* Actions */}
          <Button onClick={() => runAnalysis(profile.userId)} disabled={running} variant="glass" size="sm">
            {running ? '⏳ Аналізую...' : '🔄 Оновити аналіз'}
          </Button>
        </div>
      )}
    </div>
  )
}

// ── Головна панель ────────────────────────────────────────────
export const MentorInsightsPanel: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [upsellOnly, setUpsellOnly] = useState(false)

  const { data, isLoading, refetch } = useGetAdminProfilesQuery({
    risk: filter === 'all' ? undefined : filter,
    upsell: upsellOnly || undefined,
  })

  const profiles = data?.profiles ?? []

  const counts = {
    high: profiles.filter(p => p.retentionRisk <= 4).length,
    medium: profiles.filter(p => p.retentionRisk >= 5 && p.retentionRisk <= 7).length,
    low: profiles.filter(p => p.retentionRisk >= 8).length,
    upsell: profiles.filter(p => p.upsellReady && !p.offerShownAt).length,
  }

  const statCards: { label: string; value: number; color: GlassCardVariant }[] = [
    { label: 'Всього', value: data?.total ?? 0, color: 'accent' },
    { label: 'Під ризиком', value: counts.high, color: 'error' },
    { label: 'Апсейл готові', value: counts.upsell, color: 'accent' },
    { label: 'Стабільні', value: counts.low, color: 'success' },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <p className="text-xs tracking-widest uppercase mb-1 text-accent">🧠 Аналіз тижня</p>
          <h2 className="text-lg font-bold">Профілі користувачів</h2>
        </div>
        <Button onClick={() => refetch()} variant="glass" size="sm" color="accent">
          🔄 Оновити
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-5">
        {(['all','high','medium','low'] as const).map(id => (
          <Button
            key={id}
            size="sm"
            variant={filter === id ? 'solid' : 'outline'}
            color={id === 'all' ? 'muted' : id === 'high' ? 'error' : id === 'medium' ? 'warning' : 'success'}
            onClick={() => setFilter(id)}
          >
            {id === 'all' ? 'Всі' :
             id === 'high' ? `⚠️ Ризик (${counts.high})` :
             id === 'medium' ? `🟡 Середні (${counts.medium})` :
             `✅ Стабільні (${counts.low})`}
          </Button>
        ))}

        <Button
          size="sm"
          variant={upsellOnly ? 'solid' : 'outline'}
          color="accent"
          className="ml-auto"
          onClick={() => setUpsellOnly(v => !v)}
        >
          💎 Готові до апсейлу ({counts.upsell})
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {statCards.map(s => (
          <GlassCard key={s.label} className="p-3 text-center" variant={s.color}>
            <p className="text-2xl font-bold text-accent">{s.value}</p>
            <p className="text-xs text-white/40 mt-1">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-white/40">Завантаження...</div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <p className="text-3xl mb-3">📊</p>
          <p>Профілів поки немає</p>
          <p className="text-xs mt-1">Аналіз запускається щонеділі о 08:00</p>
        </div>
      ) : (
        <div className="space-y-2">
          {profiles.map(p => <ProfileCard key={p.id} profile={p} />)}
        </div>
      )}
    </div>
  )
}

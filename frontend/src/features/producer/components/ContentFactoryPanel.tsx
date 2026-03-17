import { useState } from 'react'
import { useGenerateContentFactoryMutation } from '../services/producer.api'
import type { BannerCopy, ContentPlanDay, EmailItem, ReelsScript } from '@/features/producer/types'
import { BannerCanvas } from './BannerCanvas'

type FactoryType = 'content_plan' | 'reels_script' | 'email_series' | 'banner_copy'

const TABS: { id: FactoryType; icon: string; label: string }[] = [
  { id: 'banner_copy',    icon: '🖼️',  label: 'Банери'        },
  { id: 'content_plan',  icon: '📅',  label: 'Контент-план'  },
  { id: 'reels_script',  icon: '🎬',  label: 'Reels-скрипт'  },
  { id: 'email_series',  icon: '📧',  label: 'Email-серія'   },
]

const TONE_OPTIONS = [
  { value: 'direct',      label: '⚡ Жорстка ясність' },
  { value: 'emotional',   label: '💙 Емоційне'        },
  { value: 'provocative', label: '🔥 Провокація'      },
] as const

interface Props {
  productName:    string
  expertName:     string
  funnelUrl:      string
  accentColor?:   string  // hex, наприклад '#0c1d33'
}

export function ContentFactoryPanel({
  productName, expertName, funnelUrl, accentColor = '#0c1d33'
}: Props) {
  const [activeType, setActiveType]           = useState<FactoryType>('banner_copy')
  const [targetAudience, setTargetAudience]   = useState('')
  const [transformation, setTransformation]   = useState('')
  const [tone, setTone]                       = useState<'direct' | 'emotional' | 'provocative'>('direct')
  const [days, setDays]                       = useState(30)
  const [emailCount, setEmailCount]           = useState(5)
  const [copiedIdx, setCopiedIdx]             = useState<string | null>(null)

  const [generate, { isLoading, data, error }] = useGenerateContentFactoryMutation()

  const handleGenerate = () => {
    if (!targetAudience.trim() || !transformation.trim()) return
    generate({ type: activeType, productName, expertName, targetAudience, transformation, funnelUrl, tone, days, emailCount })
  }

  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(key)
      setTimeout(() => setCopiedIdx(null), 2000)
    })
  }

  // Скидати результат при зміні вкладки
  const handleTabChange = (t: FactoryType) => {
    setActiveType(t)
  }

  const bannerResult = data?.type === 'banner_copy' ? data.result as BannerCopy[] : undefined
  const contentPlanResult = data?.type === 'content_plan' ? data.result as ContentPlanDay[] : undefined
  const reelsResult = data?.type === 'reels_script' ? data.result as ReelsScript : undefined
  const emailResult = data?.type === 'email_series' ? data.result as EmailItem[] : undefined

  return (
    <div className="cf-wrap">
      {/* Header */}
      <div className="cf-header">
        <h2 className="cf-title">🏭 Контент-фабрика</h2>
        <p className="cf-subtitle">
          Генерує банери, контент-план, Reels-скрипт та email-серію — без зовнішніх сервісів
        </p>
      </div>

      {/* Type tabs */}
      <div className="cf-type-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`cf-type-tab ${activeType === t.id ? 'cf-type-tab--active' : ''}`}
            onClick={() => handleTabChange(t.id)}
          >
            <span className="cf-type-tab-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="cf-form">
        <div className="cf-form-row">
          <div className="cf-field">
            <label className="cf-label">Цільова аудиторія</label>
            <input className="cf-input" type="text"
              placeholder="Жінки 25-45, підприємці, хочуть змін"
              value={targetAudience} onChange={e => setTargetAudience(e.target.value)} />
          </div>
          <div className="cf-field">
            <label className="cf-label">Трансформація клієнта</label>
            <input className="cf-input" type="text"
              placeholder="За 5 днів побачить що блокує результат"
              value={transformation} onChange={e => setTransformation(e.target.value)} />
          </div>
        </div>

        <div className="cf-form-row">
          <div className="cf-field cf-field--sm">
            <label className="cf-label">Тон</label>
            <div className="cf-tone-row">
              {TONE_OPTIONS.map(opt => (
                <button key={opt.value}
                  className={`cf-tone-btn ${tone === opt.value ? 'cf-tone-btn--active' : ''}`}
                  onClick={() => setTone(opt.value)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {activeType === 'content_plan' && (
    <div className="cf-field cf-field--xs">
      <label className="cf-label" htmlFor="content-days">Днів</label>
      <select id="content-days" className="cf-select" value={days} onChange={e => setDays(Number(e.target.value))}>
        {[7, 14, 30].map(d => <option key={d} value={d}>{d} днів</option>)}
      </select>
    </div>
          )}

          {activeType === 'email_series' && (
    <div className="cf-field cf-field--xs">
      <label className="cf-label" htmlFor="email-count">Листів</label>
      <select id="email-count" className="cf-select" value={emailCount} onChange={e => setEmailCount(Number(e.target.value))}>
        {[3, 5, 7].map(n => <option key={n} value={n}>{n} листи</option>)}
      </select>
    </div>
          )}
        </div>

        <button className="cf-generate-btn"
          onClick={handleGenerate}
          disabled={isLoading || !targetAudience.trim() || !transformation.trim()}>
          {isLoading ? <span className="cf-spinner" /> : `✦ Згенерувати ${TABS.find(t => t.id === activeType)?.label}`}
        </button>
      </div>

      {error && <div className="cf-error">⚠️ Помилка генерації. Спробуй ще раз.</div>}

      {/* ── Results ── */}
      {bannerResult && (
        <BannersResult
          items={bannerResult}
          accentColor={accentColor}
          expertName={expertName}
          productName={productName}
          copiedIdx={copiedIdx}
          onCopy={copy}
        />
      )}

      {contentPlanResult && (
        <ContentPlanResult
          items={contentPlanResult}
          copiedIdx={copiedIdx}
          onCopy={copy}
        />
      )}

      {reelsResult && (
        <ReelsScriptResult
          script={reelsResult}
          copiedIdx={copiedIdx}
          onCopy={copy}
        />
      )}

      {emailResult && (
        <EmailSeriesResult
          items={emailResult}
          copiedIdx={copiedIdx}
          onCopy={copy}
        />
      )}
    </div>
  )
}

// ── Банери ────────────────────────────────────────────────────────────────────

function BannersResult({ items, accentColor, expertName, productName, copiedIdx, onCopy }: {
  items: BannerCopy[]
  accentColor: string
  expertName: string
  productName: string
  copiedIdx: string | null
  onCopy: (k: string, v: string) => void
}) {
  return (
    <div className="cf-result-section">
      <p className="cf-result-label">🖼️ Банери — {items.length} формати</p>
      <div className="cf-banners-grid">
        {items.map((b, i) => (
          <div key={i} className="cf-banner-card">
            <p className="cf-banner-format-label">{b.label}</p>
            {/* Canvas render */}
            <BannerCanvas
              format={b.format as 'square_1080' | 'stories_1080' | 'facebook_banner'}
              headline={b.headline}
              subheadline={b.subheadline}
              cta={b.cta}
              badge={b.badge}
              accentColor={accentColor}
              expertName={expertName}
            />
            {/* Text copy */}
            <div className="cf-banner-texts">
              <div className="cf-banner-text-row">
                <span className="cf-banner-text-label">Заголовок:</span>
                <span className="cf-banner-text-val">{b.headline}</span>
              </div>
              <div className="cf-banner-text-row">
                <span className="cf-banner-text-label">Підзаголовок:</span>
                <span className="cf-banner-text-val">{b.subheadline}</span>
              </div>
              {b.badge && (
                <div className="cf-banner-text-row">
                  <span className="cf-banner-text-label">Бейдж:</span>
                  <span className="cf-banner-text-val">{b.badge}</span>
                </div>
              )}
            </div>
            <div className="cf-banner-actions">
              <button className="cf-copy-btn cf-copy-btn--full"
                onClick={() => onCopy(`banner-${i}`, `${b.headline}\n${b.subheadline}\n${b.cta}`)}>
                {copiedIdx === `banner-${i}` ? '✓ Скопійовано тексти' : '⧉ Копіювати тексти'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Контент-план ──────────────────────────────────────────────────────────────

function ContentPlanResult({ items, copiedIdx, onCopy }: {
  items: ContentPlanDay[]
  copiedIdx: string | null
  onCopy: (k: string, v: string) => void
}) {
  const allText = items.map(d =>
    `${d.date_label} | ${d.platform} | ${d.type}\n${d.hook}\n${d.text}\n${d.cta}\n${d.hashtags.join(' ')}`
  ).join('\n\n---\n\n')

  return (
    <div className="cf-result-section">
      <div className="cf-result-header">
        <p className="cf-result-label">📅 Контент-план — {items.length} днів</p>
        <button className="cf-copy-btn"
          onClick={() => onCopy('plan-all', allText)}>
          {copiedIdx === 'plan-all' ? '✓ Скопійовано' : '⧉ Копіювати все'}
        </button>
      </div>
      <div className="cf-plan-grid">
        {items.map((d, i) => (
          <div key={i} className="cf-plan-card">
            <div className="cf-plan-head">
              <span className="cf-plan-day">{d.date_label}</span>
              <span className="cf-plan-platform">{d.platform}</span>
              <span className="cf-plan-type">{d.type}</span>
            </div>
            <p className="cf-plan-hook">"{d.hook}"</p>
            <p className="cf-plan-text">{d.text}</p>
            <p className="cf-plan-cta">{d.cta}</p>
            <div className="cf-hashtags">
              {d.hashtags.map(h => <span key={h} className="cf-hashtag">{h}</span>)}
            </div>
            <button className="cf-copy-btn cf-copy-btn--sm"
              onClick={() => onCopy(`day-${i}`, `${d.hook}\n\n${d.text}\n\n${d.cta}\n\n${d.hashtags.join(' ')}`)}>
              {copiedIdx === `day-${i}` ? '✓' : '⧉ Копіювати'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Reels скрипт ──────────────────────────────────────────────────────────────

function ReelsScriptResult({ script, copiedIdx, onCopy }: {
  script: ReelsScript
  copiedIdx: string | null
  onCopy: (k: string, v: string) => void
}) {
  const fullScript = script.segments.map(s =>
    `[${s.second_start}–${s.second_end}с] ${s.what_to_say}${s.on_screen_text ? ` | Екран: ${s.on_screen_text}` : ''}${s.action ? ` | Дія: ${s.action}` : ''}`
  ).join('\n')

  return (
    <div className="cf-result-section">
      <div className="cf-result-header">
        <p className="cf-result-label">🎬 Reels-скрипт — 60 секунд</p>
        <button className="cf-copy-btn"
          onClick={() => onCopy('reels-all', `${script.hook_text}\n\n${fullScript}\n\nCTA: ${script.cta_end}\n\n${script.caption}`)}>
          {copiedIdx === 'reels-all' ? '✓ Скопійовано' : '⧉ Копіювати скрипт'}
        </button>
      </div>

      <div className="cf-reels-hook">
        <span className="cf-reels-hook-label">Хук (0–3 сек на екрані):</span>
        <span className="cf-reels-hook-text">"{script.hook_text}"</span>
      </div>

      <div className="cf-segments">
        {script.segments.map((s, i) => (
          <div key={i} className="cf-segment">
            <div className="cf-segment-time">{s.second_start}–{s.second_end}с</div>
            <div className="cf-segment-body">
              <p className="cf-segment-say">{s.what_to_say}</p>
              {s.on_screen_text && <p className="cf-segment-screen">📺 {s.on_screen_text}</p>}
              {s.action         && <p className="cf-segment-action">✋ {s.action}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="cf-reels-footer">
        <div className="cf-reels-cta">
          <span className="cf-reels-cta-label">CTA в кінці:</span>
          <span className="cf-reels-cta-text">{script.cta_end}</span>
        </div>
        <div className="cf-reels-caption">
          <span className="cf-reels-caption-label">Caption:</span>
          <p className="cf-reels-caption-text">{script.caption}</p>
          <button className="cf-copy-btn cf-copy-btn--sm"
            onClick={() => onCopy('caption', script.caption)}>
            {copiedIdx === 'caption' ? '✓' : '⧉'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Email серія ───────────────────────────────────────────────────────────────

function EmailSeriesResult({ items, copiedIdx, onCopy }: {
  items: EmailItem[]
  copiedIdx: string | null
  onCopy: (k: string, v: string) => void
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <div className="cf-result-section">
      <p className="cf-result-label">📧 Email-серія — {items.length} листів</p>
      <div className="cf-emails">
        {items.map((email, i) => (
          <div key={i} className="cf-email-card">
            <button className="cf-email-head" onClick={() => setOpenIdx(openIdx === i ? null : i)}>
              <div className="cf-email-meta">
                <span className="cf-email-num">#{email.number}</span>
                <span className="cf-email-day">День {email.send_day}</span>
                <span className="cf-email-type">{email.type}</span>
              </div>
              <p className="cf-email-subject">{email.subject}</p>
              <span className="cf-email-chevron">{openIdx === i ? '▲' : '▼'}</span>
            </button>

            {openIdx === i && (
              <div className="cf-email-body">
                <p className="cf-email-preview-text">
                  <em>Preview: {email.preview}</em>
                </p>
                <div className="cf-email-content">{email.body}</div>
                <div className="cf-email-cta-row">
                  <span className="cf-email-cta-label">CTA:</span>
                  <span className="cf-email-cta-btn-preview">{email.cta_text}</span>
                </div>
                <button className="cf-copy-btn cf-copy-btn--full"
                  onClick={() => onCopy(`email-${i}`, `Тема: ${email.subject}\nPreview: ${email.preview}\n\n${email.body}\n\nCTA: ${email.cta_text} → ${email.cta_url}`)}>
                  {copiedIdx === `email-${i}` ? '✓ Скопійовано' : '⧉ Копіювати лист'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

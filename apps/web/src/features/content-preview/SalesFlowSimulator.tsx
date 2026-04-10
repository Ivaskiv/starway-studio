import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

import type { ContentStudioItem } from '@/features/content-studio/types/contentStudio.types'

import { AdPreview } from './AdPreview'
import { DMPreview } from './DMPreview'
import { ReelsPreview } from './ReelsPreview'
import { TelegramPreview } from './TelegramPreview'
import type { PreviewButton } from './types'
import { buildDmSteps, buildSubtitles, normalizePreviewStatus, splitTextSlides } from './types'

type SalesFlowStage = 'reel' | 'dm' | 'telegram' | 'bot'

const STAGES: SalesFlowStage[] = ['reel', 'dm', 'telegram', 'bot']

export function SalesFlowSimulator({
  open,
  items,
  onClose,
}: {
  open: boolean
  items: ContentStudioItem[]
  onClose: () => void
}) {
  const [stage, setStage] = useState<SalesFlowStage>('reel')

  const reelItem = useMemo(
    () => items.find((item) => item.type === 'reel') ?? items.find((item) => item.type === 'ad') ?? items[0],
    [items],
  )
  const dmItem = useMemo(
    () => items.find((item) => item.type === 'dm') ?? items[0],
    [items],
  )
  const telegramItem = useMemo(
    () => items.find((item) => item.telegramMessage) ?? items[0],
    [items],
  )

  const stageIndex = STAGES.indexOf(stage)

  if (!open) return null

  const telegramButtons: PreviewButton[] = [
    telegramItem?.cta ? { label: telegramItem.cta, tone: 'primary' as const } : null,
    telegramItem?.dmEntry ? { label: telegramItem.dmEntry, tone: 'secondary' as const } : null,
    { label: 'Відкрити Mini App', tone: 'ghost' as const },
  ].filter((button): button is NonNullable<typeof button> => Boolean(button))

  return (
    <div className="cp-sim-overlay">
      <div className="cp-sim-shell">
        <div className="cp-sim-header">
          <div>
            <p className="cp-sim-eyebrow">Simulation mode</p>
            <h3 className="cp-sim-title">Прожити як користувач</h3>
            <p className="cp-sim-subtitle">Fake flow: Reel → DM → Telegram → bot. Так виглядає шлях до діалогу й активації.</p>
          </div>
          <button type="button" onClick={onClose} className="cp-sim-close" aria-label="Закрити симулятор">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="cp-sim-nav">
          {STAGES.map((entry, index) => (
            <button
              key={entry}
              type="button"
              onClick={() => setStage(entry)}
              className={`cp-sim-stage ${entry === stage ? 'is-active' : ''}`}
            >
              <span className="cp-sim-stage-index">{index + 1}</span>
              <span className="cp-sim-stage-label">
                {entry === 'reel' ? 'Reel' : entry === 'dm' ? 'DM' : entry === 'telegram' ? 'Telegram' : 'Bot'}
              </span>
            </button>
          ))}
        </div>

        <div className="cp-sim-body">
          <div className="cp-sim-preview">
            {stage === 'reel' && reelItem ? (
              reelItem.type === 'ad' ? (
                <AdPreview
                  hook={reelItem.hook ?? reelItem.content[0]}
                  body={reelItem.content.slice(1)}
                  cta={reelItem.cta}
                  imagePrompt={reelItem.imagePrompt}
                  status={normalizePreviewStatus(reelItem.status)}
                />
              ) : (
                <ReelsPreview
                  hook={reelItem.hook ?? reelItem.content[0]}
                  body={reelItem.content}
                  cta={reelItem.cta}
                  subtitles={buildSubtitles(reelItem.content)}
                  status={normalizePreviewStatus(reelItem.status)}
                />
              )
            ) : null}

            {stage === 'dm' && dmItem ? (
              <DMPreview
                steps={buildDmSteps(dmItem.content)}
                status={normalizePreviewStatus(dmItem.status)}
              />
            ) : null}

            {stage === 'telegram' && telegramItem ? (
              <TelegramPreview
                text={telegramItem.telegramMessage ?? telegramItem.content.join('\n\n')}
                buttons={telegramButtons}
                status={normalizePreviewStatus(telegramItem.status)}
              />
            ) : null}

            {stage === 'bot' ? (
              <div className="cp-frame">
                <div className="cp-phone cp-phone--dm">
                  <div className="cp-feed-header">
                    <div className="cp-avatar">S</div>
                    <div>
                      <div className="cp-feed-user">Starway Bot</div>
                      <div className="cp-feed-meta">mini app / onboarding</div>
                    </div>
                    <span className="cp-status cp-status--ready">Ready</span>
                  </div>
                  <div className="cp-bot-card">
                    <p className="cp-bot-title">Куди веде CTA</p>
                    <p className="cp-bot-copy">
                      Користувач потрапляє в bot / mini app, бачить офер, стартовий маршрут і наступний крок без втрати контексту.
                    </p>
                    <div className="cp-bot-points">
                      {[
                        '1. Відкривається Mini App',
                        '2. Показується офер або trial',
                        '3. Є кнопка старту / оплати / Zoom',
                        '4. Далі йде activation або DM follow-up',
                      ].map((point) => (
                        <span key={point} className="cp-bot-point">{point}</span>
                      ))}
                    </div>
                    <button type="button" className="cp-action cp-action--primary">Активувати сценарій</button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="cp-sim-copy">
            <div className="cp-sim-panel">
              <p className="cp-sim-panel-title">Що відбувається на цьому кроці</p>
              <p className="cp-sim-panel-text">
                {stage === 'reel' && 'Перший дотик. Hook зупиняє людину, показує біль/результат і дає чіткий перехід у DM.'}
                {stage === 'dm' && 'Діалог розгортає інтерес: користувач відповідає, система прогріває і веде до Telegram або Mini App.'}
                {stage === 'telegram' && 'Telegram фіксує увагу, показує короткий сценарій і дає кнопки для переходу в правильний funnel step.'}
                {stage === 'bot' && 'Останній крок: бот або Mini App збирає дію в чіткий продуктовий сценарій — trial, підписка, Zoom або розбір.'}
              </p>
            </div>

            <div className="cp-sim-panel">
              <p className="cp-sim-panel-title">Копія для цього кроку</p>
              <div className="cp-sim-text-list">
                {(stage === 'reel'
                  ? (reelItem?.content ?? [])
                  : stage === 'dm'
                    ? (dmItem?.content ?? [])
                    : stage === 'telegram'
                      ? splitTextSlides([telegramItem?.telegramMessage ?? ''])
                      : ['Mini App / bot offer'])
                  .slice(0, 4)
                  .map((line) => (
                    <p key={line} className="cp-sim-line">{line}</p>
                  ))}
              </div>
            </div>
          </div>
        </div>

        <div className="cp-sim-footer">
          <button
            type="button"
            onClick={() => setStage(STAGES[Math.max(stageIndex - 1, 0)])}
            disabled={stageIndex === 0}
            className="cp-sim-footer-btn"
          >
            <ChevronLeft className="h-4 w-4" />
            Попередній крок
          </button>
          <span className="cp-sim-footer-progress">{stageIndex + 1}/{STAGES.length}</span>
          <button
            type="button"
            onClick={() => setStage(STAGES[Math.min(stageIndex + 1, STAGES.length - 1)])}
            disabled={stageIndex === STAGES.length - 1}
            className="cp-sim-footer-btn"
          >
            Наступний крок
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import type { AnyOutputCard } from '@/features/sales-assistant/types/output.types'
import type { CardAction, OutputCardCommonProps } from './types'
import { OutputCardShell } from './OutputCardShell'

type Props = OutputCardCommonProps & { extraActions?: CardAction[] }

function flattenCard(card: AnyOutputCard): Array<{ key: string; value: string }> {
  return Object.entries(card)
    .filter(([key]) => !['contentType', 'model', 'status', 'wordCount', 'generatedAt'].includes(key))
    .map(([key, value]) => ({ key, value: typeof value === 'string' ? value : JSON.stringify(value) }))
}

function renderPreview(mode: Props['previewMode'], values: Array<{ key: string; value: string }>) {
  if (mode === 'landing') {
    return <div className="sa-preview sa-preview--landing">{values.map((v) => <div key={v.key} className="sa-preview-block"><h4>{v.key}</h4><p>{v.value}</p></div>)}</div>
  }
  if (mode === 'stories') {
    return <div className="sa-preview sa-preview--stories">{values.map((v) => <div key={v.key} className="sa-story-slide"><strong>{v.key}</strong><p>{v.value}</p></div>)}</div>
  }
  if (mode === 'messenger') {
    return <div className="sa-preview sa-preview--messenger">{values.map((v) => <p key={v.key} className="sa-msg-bubble">{v.value}</p>)}</div>
  }
  if (mode === 'video') {
    return <div className="sa-preview sa-preview--video"><div className="sa-video-frame">{values.map((v) => <p key={v.key} className="sa-video-sub">{v.value}</p>)}</div></div>
  }
  if (mode === 'calendar') {
    return <div className="sa-preview sa-preview--calendar">{values.slice(0, 3).map((v) => <div key={v.key} className="sa-day-col"><h4>{v.key}</h4><p>{v.value}</p></div>)}</div>
  }
  if (mode === 'dialog') {
    return <div className="sa-preview sa-preview--dialog">{values.map((v, i) => <p key={v.key} className={i % 2 === 0 ? 'sa-dialog-left' : 'sa-dialog-right'}>{v.value}</p>)}</div>
  }
  if (mode === 'email') {
    return <div className="sa-preview sa-preview--email"><div className="sa-envelope">{values.map((v) => <p key={v.key}><strong>{v.key}:</strong> {v.value}</p>)}</div></div>
  }
  if (mode === 'feed') {
    return <div className="sa-preview sa-preview--feed">{values.map((v) => <div key={v.key} className="sa-feed-post"><strong>{v.key}</strong><p>{v.value}</p></div>)}</div>
  }
  return <div className="sa-preview sa-preview--article">{values.map((v, i) => i === 0 ? <h2 key={v.key}>{v.value}</h2> : <p key={v.key}>{v.value}</p>)}</div>
}

function renderReelsCard(card: AnyOutputCard) {
  const reels = card as AnyOutputCard & {
    timeline?: Array<{ text?: string }>
    cta?: string
    voiceover?: string
  }
  const scenes = reels.timeline ?? []
  return (
    <div className="sa-preview sa-preview--video">
      <h4>Hook</h4>
      <p>{scenes[0]?.text ?? reels.voiceover ?? '—'}</p>
      <h4>Сцени</h4>
      <ol>
        {scenes.map((scene, idx) => <li key={`${idx}-${scene.text ?? ''}`}>{scene.text ?? '—'}</li>)}
      </ol>
      <h4>CTA</h4>
      <p>{reels.cta ?? '—'}</p>
      <h4>Caption</h4>
      <p>{reels.voiceover ?? '—'}</p>
    </div>
  )
}

function renderWarmupCard(card: AnyOutputCard) {
  const warmup = card as AnyOutputCard & {
    days?: Array<{ day?: number; theme?: string; text?: string }>
  }
  const days = warmup.days ?? []
  return (
    <div className="sa-preview sa-preview--calendar">
      {[0, 1, 2].map((idx) => {
        const day = days[idx]
        return (
          <div key={`day-${idx}`} className="sa-day-col">
            <h4>День {idx + 1}</h4>
            <p><strong>{day?.theme ?? '—'}</strong></p>
            <p>{day?.text ?? '—'}</p>
          </div>
        )
      })}
    </div>
  )
}

function renderTelegramMsgCard(card: AnyOutputCard) {
  const telegram = card as AnyOutputCard & {
    messages?: Array<{ text?: string }>
  }
  const messages = telegram.messages ?? []
  return (
    <div className="sa-preview sa-preview--messenger">
      <h4>Повідомлення</h4>
      {messages.map((msg, idx) => <p key={`msg-${idx}`} className="sa-msg-bubble">{msg.text ?? '—'}</p>)}
      <h4>Хуки</h4>
      <ul>
        {messages.slice(0, 3).map((msg, idx) => <li key={`hook-${idx}`}>{msg.text ?? '—'}</li>)}
      </ul>
    </div>
  )
}

export function GenericTypeCard(props: Props) {
  const [draft, setDraft] = useState(() => flattenCard(props.card))
  const draftJson = useMemo(() => draft.map((item) => `${item.key}: ${item.value}`).join('\n'), [draft])

  return (
    <OutputCardShell {...props} extraActions={props.extraActions}>
      {(mode) => (
        mode === 'edit'
          ? <div className="sa-edit-grid">{draft.map((item, index) => (
            <label key={item.key} className="sa-field">
              <span>{item.key}</span>
              <textarea
                className="sa-field-input"
                value={item.value}
                onChange={(event) => setDraft((prev) => prev.map((p, i) => i === index ? { ...p, value: event.target.value } : p))}
              />
            </label>
          ))}</div>
          : <>
            {props.contentType === 'reels'
              ? renderReelsCard(props.card)
              : props.contentType === 'warmup'
                ? renderWarmupCard(props.card)
                : props.contentType === 'telegram_msg'
                  ? renderTelegramMsgCard(props.card)
                  : renderPreview(props.previewMode, draft)}
          </>
      )}
    </OutputCardShell>
  )
}

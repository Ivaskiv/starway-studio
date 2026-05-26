import { FileText, Monitor, Smartphone, Zap } from 'lucide-react'

type PreviewDevice = 'desktop' | 'mobile' | 'doc'

type Props = {
  outputs: string[]
  typedPayload?: string
  previewTabIndex: number
  previewPage: number
  previewDevice: PreviewDevice
  onSetPreviewTabIndex: (idx: number) => void
  onPrevPage: () => void
  onNextPage: () => void
  onSetPreviewDevice: (device: PreviewDevice) => void
}

export function PreviewRenderer({
  outputs,
  typedPayload,
  previewTabIndex,
  previewPage,
  previewDevice,
  onSetPreviewTabIndex,
  onPrevPage,
  onNextPage,
  onSetPreviewDevice,
}: Props) {
  const parsedPayload = (() => {
    if (!typedPayload) return null
    try {
      return JSON.parse(typedPayload) as Record<string, unknown>
    } catch {
      return null
    }
  })()
  const payloadEntries = parsedPayload ? Object.entries(parsedPayload).slice(0, 3) : []
  const hasParsingError = Boolean(typedPayload) && !parsedPayload
  console.log('[DNA][debug][render][preview]', {
    outputs,
    previewTabIndex,
    selectedOutput: outputs[previewTabIndex] ?? null,
    typedPayloadExists: Boolean(typedPayload),
    typedPayloadLength: typedPayload?.length ?? 0,
    parsedPayloadKeys: parsedPayload ? Object.keys(parsedPayload) : [],
    parseStatus: typedPayload ? (parsedPayload ? 'ok_json' : 'not_json_or_invalid') : 'empty',
  })

  return (
    <div className="dna-right-section">
      <h4 className="dna-right-label">ПОПЕРЕДНІЙ ПЕРЕГЛЯД</h4>
      <div className="dna-preview-tabs">
        {outputs.map((type, idx) => (
          <button key={type} type="button" className={`dna-preview-tab ${previewTabIndex === idx ? 'is-active' : ''}`} onClick={() => onSetPreviewTabIndex(idx)}>
            {type}
          </button>
        ))}
      </div>
      <p className="dna-preview-lead">Як це виглядатиме для аудиторії:</p>
      <div className={`dna-preview-card is-${previewDevice}`}>
        <span className="dna-preview-card__tag">{outputs[previewTabIndex] ?? 'type'}</span>
        <h5>{parsedPayload ? 'Реальний превʼю-фрагмент' : 'Попередній заголовок H1'}</h5>
        <div className="dna-preview-card__tags">
          {payloadEntries.length > 0 ? payloadEntries.map(([key]) => <span key={key}>#{key}</span>) : <><span>#hook</span><span>#cta</span><span>#pain</span></>}
        </div>
        <div className="dna-preview-card__hero">
          {payloadEntries.length > 0
            ? payloadEntries.map(([key, value]) => <p key={key}><strong>{key}:</strong> {typeof value === 'string' ? value : JSON.stringify(value)}</p>)
            : 'плейсхолдер Hero'}
        </div>
        {hasParsingError ? (
          <p className="dna-preview-card__error">
            Parsing error: AI response is not valid JSON for preview.
          </p>
        ) : null}
      </div>
      <div className="dna-preview-controls">
        <button type="button" onClick={onPrevPage}>{'<'}</button>
        <span>{previewPage + 1}/{Math.max(1, outputs.length)}</span>
        <button type="button" onClick={onNextPage}>{'>'}</button>
        <button type="button" className={previewDevice === 'desktop' ? 'is-active' : ''} onClick={() => onSetPreviewDevice('desktop')} aria-label="Перегляд на комп'ютері"><Monitor size={14} /></button>
        <button type="button" className={previewDevice === 'mobile' ? 'is-active' : ''} onClick={() => onSetPreviewDevice('mobile')} aria-label="Перегляд на телефоні"><Smartphone size={14} /></button>
        <button type="button" className={previewDevice === 'doc' ? 'is-active' : ''} onClick={() => onSetPreviewDevice('doc')} aria-label="Перегляд як документ"><FileText size={14} /></button>
      </div>
      <button type="button" className="dna-preview-open"><Zap size={14} /> Відкрити повний прев'ю</button>
    </div>
  )
}

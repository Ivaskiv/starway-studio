import { useEffect, useMemo, useState } from 'react'

type Score = 'LOW' | 'MID' | 'HIGH'

type StepInputStats = {
  wordCount: number
  hookCount: number
  ctaCount: number
  score: Score
  tokens: number
  cost: string
}

type Props = {
  onStatsChange?: (stats: StepInputStats) => void
}

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type SpeechCtor = new () => SpeechRecognitionLike

type WinWithSpeech = Window & {
  SpeechRecognition?: SpeechCtor
  webkitSpeechRecognition?: SpeechCtor
}

export default function StepInput({ onStatsChange }: Props) {
  const [mainText, setMainText] = useState('')
  const [painText, setPainText] = useState('')
  const [actionText, setActionText] = useState('')
  const [directivesText, setDirectivesText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)

  const stats = useMemo<StepInputStats>(() => {
    const wordCount = mainText.trim().split(/\s+/).filter(Boolean).length
    const hookCount = (mainText.match(/[?!]|^(Чому|Як|Що|Коли)/gim) || []).length
    const ctaCount = (mainText.match(/запиш|купи|переходь|старт|кнопк/gi) || []).length
    const score: Score = hookCount >= 2 && ctaCount >= 1 ? 'HIGH' : hookCount >= 1 ? 'MID' : 'LOW'
    const tokens = 817 + wordCount * 4
    const cost = (0.002 + wordCount * 0.00001).toFixed(4)
    return { wordCount, hookCount, ctaCount, score, tokens, cost }
  }, [mainText])

  useEffect(() => {
    onStatsChange?.(stats)
  }, [stats, onStatsChange])

  const clearAll = () => {
    setMainText('')
    setPainText('')
    setActionText('')
    setDirectivesText('')
    setAudioError(null)
  }

  const handleAudio = () => {
    const Win = window as WinWithSpeech
    const Speech = Win.SpeechRecognition ?? Win.webkitSpeechRecognition
    if (!Speech) {
      setAudioError('Аудіо-ввід не підтримується у цьому браузері.')
      return
    }

    setAudioError(null)
    const recognition = new Speech()
    recognition.lang = 'uk-UA'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result?.[0]?.transcript ?? '')
        .join(' ')
        .trim()
      if (transcript) setMainText((prev) => (prev ? `${prev}\n${transcript}` : transcript))
    }
    recognition.onerror = () => {
      setAudioError('Не вдалося розпізнати аудіо. Спробуй ще раз.')
      setIsListening(false)
    }
    recognition.onend = () => setIsListening(false)

    setIsListening(true)
    recognition.start()
  }

  return (
    <section className="dna-step-input">
      <div className="dna-input-col dna-input-col--focus">
        <label className="dna-input-label" htmlFor="dna-main-text">Головний текст</label>
        <textarea
          id="dna-main-text"
          className="dna-textarea"
          rows={4}
          maxLength={2000}
          value={mainText}
          onChange={(e) => setMainText(e.target.value)}
          placeholder="Встав текст або продиктуй аудіо..."
        />
        <p className="dna-input-sub">Слів:{stats.wordCount} · Хуків:{stats.hookCount} · CTA:{stats.ctaCount} · {stats.score}</p>
        {audioError ? <p className="generation-validation-error">{audioError}</p> : null}
        <div className="dna-input-methods">
          <button type="button" className="dna-input-method" onClick={clearAll}>Очистити</button>
          <button type="button" className={`dna-input-method${isListening ? ' is-active' : ''}`} onClick={handleAudio}>
            {isListening ? 'Слухаю...' : 'Аудіо'}
          </button>
        </div>
      </div>

      <div className="dna-input-grid">
        <div className="dna-input-col dna-input-col--focus">
          <label className="dna-input-label" htmlFor="dna-pain">Що болить</label>
          <textarea id="dna-pain" className="dna-textarea" rows={5} maxLength={2000} value={painText} onChange={(e) => setPainText(e.target.value)} />
        </div>
        <div className="dna-input-col dna-input-col--focus">
          <label className="dna-input-label" htmlFor="dna-action">До якої дії</label>
          <textarea id="dna-action" className="dna-textarea" rows={5} maxLength={1500} value={actionText} onChange={(e) => setActionText(e.target.value)} />
        </div>
      </div>

      <div className="dna-input-col dna-input-col--focus">
        <label className="dna-input-label" htmlFor="dna-directives">AI-директиви</label>
        <textarea
          id="dna-directives"
          className="dna-textarea"
          rows={4}
          maxLength={1000}
          value={directivesText}
          onChange={(e) => setDirectivesText(e.target.value)}
        />
      </div>
    </section>
  )
}

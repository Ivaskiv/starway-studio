import { Link, Mic, MicOff, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

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
  const [recordingField, setRecordingField] = useState<'main' | 'pain' | 'action' | 'directives' | null>(null)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [audioUrl, setAudioUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const stats = (() => {
    const wordCount = mainText.trim().split(/\s+/).filter(Boolean).length
    const hookCount = (mainText.match(/[?!]|^(Чому|Як|Що|Коли)/gim) || []).length
    const ctaCount = (mainText.match(/запиш|купи|переходь|старт|кнопк/gi) || []).length
    const score: Score = hookCount >= 2 && ctaCount >= 1 ? 'HIGH' : hookCount >= 1 ? 'MID' : 'LOW'
    const tokens = 817 + wordCount * 4
    const cost = (0.002 + wordCount * 0.00001).toFixed(4)
    return { wordCount, hookCount, ctaCount, score, tokens, cost }
  })()

  useEffect(() => {
    onStatsChange?.(stats)
  }, [stats, onStatsChange])

  const clearAll = () => {
    setMainText('')
    setPainText('')
    setActionText('')
    setDirectivesText('')
    setAudioError(null)
    setRecordingField(null)
  }

  const handleAudio = (field: 'main' | 'pain' | 'action' | 'directives') => {
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
      if (!transcript) return
      if (field === 'main') setMainText((prev) => (prev ? `${prev}\n${transcript}` : transcript))
      if (field === 'pain') setPainText((prev) => (prev ? `${prev}\n${transcript}` : transcript))
      if (field === 'action') setActionText((prev) => (prev ? `${prev}\n${transcript}` : transcript))
      if (field === 'directives') setDirectivesText((prev) => (prev ? `${prev}\n${transcript}` : transcript))
    }
    recognition.onerror = () => {
      setAudioError('Не вдалося розпізнати аудіо. Спробуй ще раз.')
      setIsListening(false)
      setRecordingField(null)
    }
    recognition.onend = () => {
      setIsListening(false)
      setRecordingField(null)
    }

    setIsListening(true)
    setRecordingField(field)
    recognition.start()
  }

  const handleMicToggle = (field: 'main' | 'pain' | 'action' | 'directives') => {
    if (isListening && recordingField === field) {
      setIsListening(false)
      setRecordingField(null)
      return
    }
    handleAudio(field)
  }

  const handleUploadAudio = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setAudioError(`Аудіо файл додано: ${file.name}`)
  }

  const handleAudioUrl = (url: string) => {
    if (!url.trim()) return
    setAudioError(`Аудіо URL додано: ${url.trim()}`)
    setShowUrlInput(false)
  }

  return (
    <section className="dna-step-input">
      <div className="dna-input-col dna-input-col--focus">
        <div className="dna-main-header">
          <label className="dna-input-label" htmlFor="dna-main-text">Введення сенсів
          </label>
            <p>Універсальний шар введення: ручний текст, браузерна диктовка та аудіо-транскрибація з семантичним автозаповненням.</p>
          <div className="dna-main-header__actions">
            <button type="button" className="dna-input-method" onClick={clearAll}>Очистити</button>
            <div className="ai-audio-split">
              <button className="ai-audio-split__main" type="button" onClick={handleUploadAudio}>
                <Upload size={15} />
                Завантажити аудіо
              </button>
              <button
                className="ai-audio-split__arrow"
                onClick={() => setShowUrlInput((prev) => !prev)}
                type="button"
                title="Вставити URL"
              >
                <Link size={14} />
              </button>
            </div>
          </div>
        </div>
        <div className="ai-input-wrapper">
          <textarea
            id="dna-main-text"
            className="dna-textarea"
            rows={4}
            maxLength={2000}
            value={mainText}
            onChange={(e) => setMainText(e.target.value)}
            placeholder="Встав текст або продиктуй аудіо..."
          />
          <button
            className={`ai-mic-btn ${recordingField === 'main' ? 'ai-mic-btn--active' : ''}`}
            onClick={() => handleMicToggle('main')}
            title="Голосовий ввід"
            type="button"
          >
            {recordingField === 'main' ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        </div>
        {audioError ? <p className="generation-validation-error">{audioError}</p> : null}
        {showUrlInput ? (
          <div className="ai-audio-url">
            <input
              className="ai-audio-url__input"
              type="url"
              placeholder="https://drive.google.com/... або будь-який URL аудіо"
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
            />
            <button className="ai-audio-url__submit" onClick={() => handleAudioUrl(audioUrl)} type="button">
              Завантажити
            </button>
          </div>
        ) : null}
        <input ref={fileInputRef} type="file" accept="audio/*" className="ai-visually-hidden" onChange={handleFileChange} />
      </div>

      <div className="dna-input-grid">
        <div className="dna-input-col dna-input-col--focus">
          <label className="dna-input-label" htmlFor="dna-pain">Що болить</label>
          <div className="ai-input-wrapper">
            <textarea
              id="dna-pain"
              className="dna-textarea"
              rows={5}
              maxLength={2000}
              value={painText}
              onChange={(e) => setPainText(e.target.value)}
              placeholder={'Опиши біль аудиторії:\n— що їх дратує\n— що вони бояться\n— від чого хочуть позбутись'}
            />
            <button
              className={`ai-mic-btn ${recordingField === 'pain' ? 'ai-mic-btn--active' : ''}`}
              onClick={() => handleMicToggle('pain')}
              title="Голосовий ввід"
              type="button"
            >
              {recordingField === 'pain' ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </div>
        </div>
        <div className="dna-input-col dna-input-col--focus">
          <label className="dna-input-label" htmlFor="dna-action">До якої дії</label>
          <div className="ai-input-wrapper">
            <textarea
              id="dna-action"
              className="dna-textarea"
              rows={5}
              maxLength={1500}
              value={actionText}
              onChange={(e) => setActionText(e.target.value)}
              placeholder={'Яку дію має зробити читач:\n— підписатись\n— купити\n— написати\n— прийти'}
            />
            <button
              className={`ai-mic-btn ${recordingField === 'action' ? 'ai-mic-btn--active' : ''}`}
              onClick={() => handleMicToggle('action')}
              title="Голосовий ввід"
              type="button"
            >
              {recordingField === 'action' ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </div>
        </div>
      </div>

      <div className="dna-input-col dna-input-col--focus">
        <label className="dna-input-label" htmlFor="dna-directives">AI-директиви</label>
        <div className="ai-input-wrapper">
          <textarea
            id="dna-directives"
            className="dna-textarea"
            rows={4}
            maxLength={1000}
            value={directivesText}
            onChange={(e) => setDirectivesText(e.target.value)}
            placeholder={'Додаткові інструкції для AI:\n— стиль подачі\n— що НЕ писати\n— специфічні вимоги до тексту'}
          />
          <button
            className={`ai-mic-btn ${recordingField === 'directives' ? 'ai-mic-btn--active' : ''}`}
            onClick={() => handleMicToggle('directives')}
            title="Голосовий ввід"
            type="button"
          >
            {recordingField === 'directives' ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        </div>
      </div>
    </section>
  )
}

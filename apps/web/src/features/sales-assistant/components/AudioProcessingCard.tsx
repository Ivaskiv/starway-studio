import type { InputStatus } from '@/features/sales-assistant/hooks/useAudioInput'
import { CheckCircle2, Play } from 'lucide-react'

type Props = {
  audioFile: File | null
  audioDurationSec: number | null
  audioProcessingMs: number | null
  audioTranscript: string
  inputStatus: InputStatus
  inputStatusCopy: Record<InputStatus, string>
  onReset: () => void
}

export function AudioProcessingCard({
  audioFile,
  audioDurationSec,
  audioProcessingMs,
  audioTranscript,
  inputStatus,
  inputStatusCopy,
  onReset,
}: Props) {
  if (!audioFile) return null

  return (
    <div className="dna-audio-console">
      <div className="dna-audio-processing__row">
        <Play size={12} />
        <span className="dna-audio-processing__name">{audioFile.name}</span>
        <span className="dna-audio-chip">{audioDurationSec ? `${audioDurationSec}s` : '...s'}</span>
        <span className="dna-audio-chip">{audioProcessingMs ? `${audioProcessingMs}ms` : '...'}</span>
      </div>
      <div className="dna-audio-waveform">
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} className="dna-audio-waveform__bar" />
        ))}
      </div>
      <div className="dna-input-status-grid">
        <span className={audioFile ? 'is-done' : ''}><CheckCircle2 size={12} /> аудіо завантажено</span>
        <span className={audioTranscript ? 'is-done' : ''}><CheckCircle2 size={12} /> транскрипцію завершено</span>
        <span className={inputStatus === 'autofilled' ? 'is-done' : ''}><CheckCircle2 size={12} /> сенси проаналізовано</span>
        <span className={inputStatus === 'autofilled' ? 'is-done' : ''}><CheckCircle2 size={12} /> поля автозаповнено</span>
      </div>
      <div className="dna-input-status-row">
        <span className={`dna-input-status-human is-${inputStatus}`}>{inputStatusCopy[inputStatus]}</span>
        <button type="button" className="dna-audio-banner__reset" onClick={onReset}>
          ↺ Спробувати ще раз
        </button>
      </div>
    </div>
  )
}

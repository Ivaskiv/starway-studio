import { AudioProcessingCard } from '@/features/sales-assistant/components/AudioProcessingCard'
import { PresetPanel } from '@/features/sales-assistant/components/PresetPanel'
import { SemanticFields } from '@/features/sales-assistant/components/SemanticFields'
import type { InputMethod, InputStatus } from '@/features/sales-assistant/hooks/useAudioInput'
import { Loader2, Mic, Trash2, Upload, PencilLine } from 'lucide-react'
import type { ChangeEvent, RefObject } from 'react'

type Props = {
  inputMethod: InputMethod
  inputStatus: InputStatus
  activePreset: 'noise' | 'stuck' | 'battle' | 'tactic' | null
  audioFile: File | null
  audioDurationSec: number | null
  audioProcessingMs: number | null
  audioTranscript: string
  inputStatusCopy: Record<InputStatus, string>
  dictationField: 'pain' | 'goal' | 'custom' | null
  pain: string
  goal: string
  customTask: string
  audioInputRef: RefObject<HTMLInputElement>
  onClear: () => void
  onSetInputMethod: (method: InputMethod) => void
  onStartDictation: (field: 'pain' | 'goal' | 'custom') => void
  onApplyPreset: (preset: 'noise' | 'stuck' | 'battle' | 'tactic') => void
  onAudioFileChange: (e: ChangeEvent<HTMLInputElement>) => void
  onResetAudio: () => void
  onPainChange: (value: string) => void
  onGoalChange: (value: string) => void
  onCustomTaskChange: (value: string) => void
}

export function InputEngineSection(props: Props) {
  const {
    inputMethod,
    inputStatus,
    activePreset,
    audioFile,
    audioDurationSec,
    audioProcessingMs,
    audioTranscript,
    inputStatusCopy,
    dictationField,
    pain,
    goal,
    customTask,
    audioInputRef,
    onClear,
    onSetInputMethod,
    onStartDictation,
    onApplyPreset,
    onAudioFileChange,
    onResetAudio,
    onPainChange,
    onGoalChange,
    onCustomTaskChange,
  } = props
  const isListening = inputStatus === 'recording'
  const isProcessing = inputStatus === 'transcribing' || inputStatus === 'parsing'

  return (
    <div className="dna-step">
      <div className="dna-step__header">
        <h3 className="dna-step__title">КРОК 1. ВВЕДЕННЯ СЕНСІВ</h3>
      <div className="dna-step-input-toolbar">
        <button type="button" className={`dna-input-method dna-btn-inline-content ${inputMethod === 'manual' ? 'is-active' : ''}`} onClick={() => onSetInputMethod('manual')}><PencilLine size={14} /> Написати</button>
        <button type="button" className={`dna-input-method dna-btn-inline-content ${inputMethod === 'audio_upload' ? 'is-active' : ''}`} onClick={() => audioInputRef.current?.click()}><Upload size={14} /> Завантажити аудіо</button>
      </div>

        <div className="dna-step__header-actions">
          <button type="button" onClick={onClear} className="dna-tone-btn dna-step__tone-action dna-btn-inline-content"><Trash2 size={14} /> Очистити все</button>
        </div>
      </div>
      <p className="dna-step__sub">Універсальний шар введення: ручний текст, браузерна диктовка та аудіо-транскрибація з семантичним автозаповненням.</p>


      <PresetPanel activePreset={activePreset} onApplyPreset={onApplyPreset} />

      <input ref={audioInputRef} type="file" accept=".mp3,.wav,.m4a,.ogg,.webm" className="dna-hidden-input" onChange={onAudioFileChange} />

      <AudioProcessingCard
        audioFile={audioFile}
        audioDurationSec={audioDurationSec}
        audioProcessingMs={audioProcessingMs}
        audioTranscript={audioTranscript}
        inputStatus={inputStatus}
        inputStatusCopy={inputStatusCopy}
        onReset={onResetAudio}
      />

      <SemanticFields
        pain={pain}
        goal={goal}
        customTask={customTask}
        dictationField={dictationField}
        onPainChange={onPainChange}
        onGoalChange={onGoalChange}
        onCustomTaskChange={onCustomTaskChange}
        onStartDictation={onStartDictation}
      />
    </div>
  )
}

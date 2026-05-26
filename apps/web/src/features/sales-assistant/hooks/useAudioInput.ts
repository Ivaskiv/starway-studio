import { resolveApiUrl } from '@/services/api'
import toast from 'react-hot-toast'
import { useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react'

export type InputMethod = 'manual' | 'voice_dictation' | 'audio_upload'
export type InputStatus = 'idle' | 'recording' | 'transcribing' | 'parsing' | 'autofilled' | 'error'

type DictationField = 'pain' | 'goal' | 'custom' | null

type SpeechRecognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
  start: () => void
  stop: () => void
}

type Params = {
  setPain: Dispatch<SetStateAction<string>>
  setGoal: Dispatch<SetStateAction<string>>
  setCustomTask: Dispatch<SetStateAction<string>>
}

export function useAudioInput({ setPain, setGoal, setCustomTask }: Params) {
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [inputMethod, setInputMethod] = useState<InputMethod>('manual')
  const [inputStatus, setInputStatus] = useState<InputStatus>('idle')
  const [audioDurationSec, setAudioDurationSec] = useState<number | null>(null)
  const [audioProcessingMs, setAudioProcessingMs] = useState<number | null>(null)
  const [audioTranscript, setAudioTranscript] = useState('')
  const [dictationField, setDictationField] = useState<DictationField>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const patchDictationText = (field: 'pain' | 'goal' | 'custom', nextChunk: string) => {
    if (!nextChunk.trim()) return
    if (field === 'pain') setPain((prev) => `${prev}${prev ? ' ' : ''}${nextChunk}`.trim())
    if (field === 'goal') setGoal((prev) => `${prev}${prev ? ' ' : ''}${nextChunk}`.trim())
    if (field === 'custom') setCustomTask((prev) => `${prev}${prev ? ' ' : ''}${nextChunk}`.trim())
    setInputMethod('voice_dictation')
  }

  const stopDictation = () => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setDictationField(null)
    setInputStatus('idle')
  }

  const startDictation = (field: 'pain' | 'goal' | 'custom') => {
    const SpeechRecognitionCtor = (window as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition
    if (!SpeechRecognitionCtor) {
      toast.error('Dictation is not supported in this browser')
      return
    }
    if (recognitionRef.current && dictationField === field) {
      stopDictation()
      return
    }
    recognitionRef.current?.stop()
    const rec = new SpeechRecognitionCtor()
    rec.lang = 'uk-UA'
    rec.continuous = true
    rec.interimResults = true
    rec.onstart = () => {
      setInputMethod('voice_dictation')
      setInputStatus('recording')
      setDictationField(field)
    }
    rec.onresult = (event) => {
      let chunk = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        if (result?.isFinal) chunk += `${result[0].transcript} `
      }
      if (chunk.trim()) patchDictationText(field, chunk.trim())
    }
    rec.onerror = () => {
      setInputStatus('error')
    }
    rec.onend = () => {
      recognitionRef.current = null
      setDictationField(null)
      setInputStatus((prev) => (prev === 'error' ? 'error' : 'idle'))
    }
    recognitionRef.current = rec
    rec.start()
  }

  const handleAudioFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAudioFile(file)
    setAudioTranscript('')
    setAudioDurationSec(null)
    setAudioProcessingMs(null)
    setInputMethod('audio_upload')
    setInputStatus('transcribing')

    const audioUrl = URL.createObjectURL(file)
    const tmpAudio = new Audio(audioUrl)
    tmpAudio.onloadedmetadata = () => {
      if (Number.isFinite(tmpAudio.duration)) setAudioDurationSec(Math.round(tmpAudio.duration))
      URL.revokeObjectURL(audioUrl)
    }

    const startedAt = performance.now()
    try {
      const bytes = await file.arrayBuffer()
      const base64 = btoa(new Uint8Array(bytes).reduce((acc, byte) => acc + String.fromCharCode(byte), ''))
      const response = await fetch(resolveApiUrl('/sales-assistant/transcribe'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, mimeType: file.type || 'audio/webm', audioBase64: base64 }),
      })
      if (!response.ok) throw new Error('transcription_failed')
      const payload = await response.json() as {
        transcript?: string
        semantic?: { pain?: string; goal?: string; customTask?: string }
        processingMs?: number
      }
      setInputStatus('parsing')
      const semanticPain = payload.semantic?.pain?.trim() ?? ''
      const semanticGoal = payload.semantic?.goal?.trim() ?? ''
      const semanticCustom = payload.semantic?.customTask?.trim() ?? payload.transcript?.trim() ?? ''
      if (semanticPain) setPain(semanticPain)
      if (semanticGoal) setGoal(semanticGoal)
      if (semanticCustom) setCustomTask(semanticCustom)
      setAudioTranscript(payload.transcript ?? '')
      setAudioProcessingMs(Math.round(payload.processingMs ?? performance.now() - startedAt))
      setInputStatus('autofilled')
    } catch {
      setInputStatus('error')
      toast.error('Не вдалося обробити аудіо')
    }
  }

  const resetAudio = () => {
    setAudioFile(null)
    setAudioDurationSec(null)
    setAudioTranscript('')
    setInputStatus('idle')
  }

  return {
    audioFile,
    inputMethod,
    inputStatus,
    audioDurationSec,
    audioProcessingMs,
    audioTranscript,
    dictationField,
    audioInputRef,
    setInputMethod,
    setInputStatus,
    setAudioFile,
    setAudioDurationSec,
    setAudioTranscript,
    startDictation,
    stopDictation,
    handleAudioFileChange,
    resetAudio,
  }
}

import { ContentType, type ModelProvider } from '@ai/types/salesAssistant.types'

export const AI_ASSISTANT_TABS = [
  { id: 'dna', label: 'ДНК STARWAY' },
  { id: 'content-machine', label: 'Content Machine' },
  { id: 'control-center', label: 'DNA Control Center' },
] as const

export const AI_ASSISTANT_GENERATION_MODES = [
  { id: 'reels', label: 'Reels', contentType: ContentType.REELS_SCENARIO, output: 'reels' },
  { id: 'stories', label: 'Stories', contentType: ContentType.STORIES_CHECK, output: 'stories' },
  { id: 'warmup', label: 'Warmup', contentType: ContentType.WARMUP_3DAYS, output: 'warmup' },
  { id: 'webinar', label: 'Webinar', contentType: ContentType.WEBINAR_SALES, output: 'webinar' },
  { id: 'audit', label: 'Audit', contentType: ContentType.STORIES_CHECK, output: 'audit' },
] as const

export const AI_ASSISTANT_PROTOCOL_LABELS = [
  { id: 'SYSTEM', label: 'Оголена правда', marker: '🔥' },
  { id: 'AUTHOR', label: 'Головний Архітектор', marker: '👑' },
  { id: 'PSYCH', label: 'Психологія Дії', marker: '🧠' },
] as const

export const AI_ASSISTANT_AUDIT_LABELS = [
  'Чіткість офферу',
  'Контекст аудиторії',
  'Емоційна логіка',
  'Наступна дія',
] as const

export const AI_ASSISTANT_OUTPUT_LABELS = [
  'Пост',
  'Сторіс',
  'Reels',
  'Email',
  'Скрипт продажу',
] as const

export const AI_ASSISTANT_TONE_PRESETS = [
  { id: 'clear', label: 'Чітко' },
  { id: 'warm', label: 'Тепло' },
  { id: 'expert', label: 'Експертно' },
  { id: 'bold', label: 'Сміливо' },
] as const

export const AI_ASSISTANT_MODEL_OPTIONS = [
  { id: 'gpt', label: 'GPT-4o', specialization: 'Структури & Воронки' },
  { id: 'claude', label: 'Claude', specialization: 'Психолінгвістика' },
  { id: 'gemini', label: 'Gemini', specialization: 'Аудит & Аналітика' },
] as const satisfies ReadonlyArray<{
  id: ModelProvider
  label: string
  specialization: string
}>

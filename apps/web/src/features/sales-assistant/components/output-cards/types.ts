import type { AnyOutputCard, ContentTypeKey, OutputModel, OutputStatus } from '@/features/sales-assistant/types/output.types'

export type PreviewMode = 'article' | 'landing' | 'stories' | 'messenger' | 'video' | 'calendar' | 'dialog' | 'email' | 'feed'

export type CardAction = {
  id: string
  label: string
  onClick?: () => void
}

export type OutputCardCommonProps = {
  card: AnyOutputCard
  contentType: ContentTypeKey
  actions: string[]
  metrics: string[]
  previewMode: PreviewMode
  onCopy: (value: string) => void
}

export type FlatField = { key: string; label: string; multiline?: boolean }

export const MODEL_BADGE: Record<OutputModel, string> = {
  claude: 'Claude',
  gpt: 'GPT',
  gemini: 'Gemini',
}

export const STATUS_BADGE: Record<OutputStatus, string> = {
  pending: 'Pending',
  generating: 'Generating',
  ready: 'Ready',
  error: 'Error',
}

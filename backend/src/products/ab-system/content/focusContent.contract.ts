export const FOCUS_RESULT_SEGMENTS = ['state', 'goal', 'choice', 'decision', 'action'] as const
export type FocusResultSegment = typeof FOCUS_RESULT_SEGMENTS[number]

export const FOCUS_FOLLOWUP_WAVES = ['24h', '48h', '72h', '5d', '7d'] as const
export type FocusFollowupWave = typeof FOCUS_FOLLOWUP_WAVES[number]

export type FocusPricingCopy = {
  oneMonth: string
  threeMonths: string
  oneYear: string
  resultOffer: string
  title: string
  guaranteeLine: string
  paymentCta1m: string
  paymentCta3m: string
}

export type FocusButtons = {
  resultCta: string
  resultCtaMultiline: string
  followupJoinCta: string
  followupPayCta: string
  showInsideCta: string
}

export type FocusReviewReference = {
  header: string
  sourceLine: string
}

export type FocusResultMessages = {
  step1: string
  step2: string
  step3: string
  step4: string
  step5: string
  step6: string
  step7: string
  step8: string
  step9: string
}

export type FocusResultSegmentContent = {
  label: string
  messages: FocusResultMessages
  review: FocusReviewReference
}

export type FocusFollowupMessage = {
  wave: FocusFollowupWave
  heading: string
  paragraphs: string[]
  ctaLabel: string
  pricingTitle?: string
  reviewQuote?: string
  reviewSourceLine?: string
}

export type FocusReminderRule = {
  id: 'after_voice_without_click' | 'after_offer_without_payment'
  schedule: Array<{
    offset: string
    description: string
  }>
}

export type FocusContentContract = {
  source: {
    adapter: 'local_markdown'
    path: string
    generatedAt: string
  }
  shared: {
    title: string
    weeklyText: string
    includedStandardText: string
    zoomCasesText: string
  }
  pricing: FocusPricingCopy
  buttons: FocusButtons
  results: Record<FocusResultSegment, FocusResultSegmentContent>
  followups: Record<FocusResultSegment, Record<FocusFollowupWave, FocusFollowupMessage>>
  reminders: FocusReminderRule[]
}

export const ALLOWED_FOCUS_PLACEHOLDERS = new Set(['firstName'])

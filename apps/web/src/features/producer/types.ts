// ── Content Factory types ─────────────────────────────────────────────────────

export interface ContentPlanDay {
  day:        number
  date_label: string
  platform:   string
  type:       string
  hook:       string
  text:       string
  cta:        string
  hashtags:   string[]
}

export interface ReelsSegment {
  second_start:    number
  second_end:      number
  what_to_say:     string
  on_screen_text:  string | null
  action:          string | null
}

export interface ReelsScript {
  title:     string
  hook_text: string
  segments:  ReelsSegment[]
  caption:   string
  cta_end:   string
}

export interface EmailItem {
  number:   number
  send_day: number
  type:     string
  subject:  string
  preview:  string
  body:     string
  cta_text: string
  cta_url:  string
}

export interface BannerCopy {
  format:       string
  label:        string
  headline:     string
  subheadline:  string
  cta:          string
  badge:        string | null
}
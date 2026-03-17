// frontend/src/features/ai-generator/types/ai-generator.types.ts

export type HeroAngle = 'pain' | 'desire' | 'curiosity'
export type HeroTone = 'serious' | 'inspiring' | 'provocative' | 'soft'

export interface HeroVariant {
  headline:    string
  subline:     string
  cta:         string
  angle:       HeroAngle
  description: string
}

export interface AdTexts {
  facebook:          string
  instagram_caption: string
  tiktok_hook:       string
  stories:           string
  reels_script:      string
}

export interface HeroGeneratePayload {
  niche:          string
  targetAudience: string
  utp:            string
  tone?:          HeroTone
  language?:      'uk' | 'en'
}

export interface AdsGeneratePayload {
  niche:        string
  targetAudience: string
  heroHeadline: string
  language?:     'uk' | 'en'
}

export interface HeroGenerationResponse {
  success:  true
  variants: HeroVariant[]
}

export interface AdsGenerationResponse {
  success: true
  ads:     AdTexts
}

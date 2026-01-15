// packages/frontend/src/constants/socialPlatforms.ts
// export type SocialProvider =
//   | 'telegram'
//   | 'discord'
//   | 'whatsapp'
//   | 'facebook'
//   | 'twitter'
//   | 'instagram'
//   | 'linkedin'

// export const SOCIAL_PLATFORMS: SocialProvider[] = [
//   'telegram',
//   'discord',
//   'whatsapp',
//   'facebook',
//   'twitter',
//   'instagram',
//   'linkedin'
// ]
export const SOCIAL_PLATFORMS = [
  'telegram',
  'discord',
  'whatsapp',
  'facebook',
  'twitter',
  'instagram',
  'linkedin',
] as const

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]
export const runtimeConfig = {
  isDev: import.meta.env.DEV,
  allowedPrefixes: ['/', '/focus', '/login', '/miniapp', '/telegram', '/auth', '/onboarding', '/products', '/reset-password'],
  devOnlyRoutes: ['/wheel', '/mentor', '/admin', '/playground'],
} as const

export type RuntimeConfig = typeof runtimeConfig

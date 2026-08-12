import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const appRouterSource = readFileSync(
  new URL('../../../app/router/AppRouter.tsx', import.meta.url),
  'utf8',
)
const miniAppPageSource = readFileSync(
  new URL('../../social/pages/MiniAppPage.tsx', import.meta.url),
  'utf8',
)
const miniAppLayoutSource = readFileSync(
  new URL('../../../components/miniapp/MiniAppLayout.tsx', import.meta.url),
  'utf8',
)
const routeConfigSource = readFileSync(
  new URL('../../../app/router/routeConfig.tsx', import.meta.url),
  'utf8',
)
const zoomApiSource = readFileSync(
  new URL('../services/zoom.api.ts', import.meta.url),
  'utf8',
)

describe('zoom miniapp runtime ownership', () => {
  it('keeps exactly one canonical miniapp zoom route owner', () => {
    expect(appRouterSource).toContain('path="/miniapp/zoom-calendar"')
    expect(appRouterSource).toContain('element={<CleanMiniAppZoomCalendar />}')
    expect(routeConfigSource).toContain("path: '/dashboard/zoom'")
    expect(routeConfigSource).toContain('element: <Navigate to="/miniapp/zoom-calendar" replace />')
    expect(miniAppPageSource).not.toContain('MiniAppZoomWeekPanel')
    expect(miniAppPageSource).toContain(
      'return <Navigate to={`/miniapp/zoom-calendar${location.search}`} replace />',
    )
  })

  it('keeps telegram miniapp auth bootstrap inside the canonical zoom renderer only', () => {
    expect(miniAppLayoutSource).not.toContain('useTelegramMiniAppAuthMutation')
    expect(miniAppLayoutSource).not.toContain('telegramMiniAppAuth({ initData')
    expect(miniAppLayoutSource).not.toContain('dispatch(setLoading())')
    expect(appRouterSource).toContain('element={<CleanMiniAppZoomCalendar />}')
  })

  it('keeps zoom API on the shared client instead of a feature-local base resolver', () => {
    expect(zoomApiSource).toContain("import { api } from '@/services/api'")
    expect(zoomApiSource).toContain('api.injectEndpoints')
    expect(zoomApiSource).not.toContain('createApi(')
    expect(zoomApiSource).not.toContain('fetchBaseQuery(')
  })
})

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const webRoot = resolve(import.meta.dirname, '../../../..')

const readSource = (path: string) =>
  readFileSync(resolve(webRoot, path), 'utf8')

const appRouterSource =
  readSource('src/app/router/AppRouter.tsx')

const miniAppPageSource =
  readSource('src/features/social/pages/MiniAppPage.tsx')

const miniAppLayoutSource =
  readSource('src/components/miniapp/MiniAppLayout.tsx')

const routeConfigSource =
  readSource('src/app/router/routeConfig.tsx')

const zoomApiSource =
  readSource('src/features/zoom/services/zoom.api.ts')

const routeSource =
  readSource(
    'src/features/zoom/routes/CleanMiniAppZoomCalendar.tsx',
  )

const controllerSource =
  readSource(
    'src/features/zoom/hooks/useCleanMiniAppZoomCalendar.ts',
  )

describe('zoom miniapp runtime ownership', () => {
  it('keeps exactly one canonical miniapp zoom route owner', () => {
    expect(appRouterSource).toContain(
      'path="/miniapp/zoom-calendar"',
    )

    expect(appRouterSource).toContain(
      'element={<CleanMiniAppZoomCalendar />}',
    )

    expect(routeConfigSource).toContain(
      "path: '/dashboard/zoom'",
    )

    expect(routeConfigSource).toContain(
      'element: <Navigate to="/miniapp/zoom-calendar" replace />',
    )

    expect(miniAppPageSource).not.toContain(
      'MiniAppZoomWeekPanel',
    )

    expect(miniAppPageSource).toContain(
      'return <Navigate to={`/miniapp/zoom-calendar${location.search}`} replace />',
    )
  })

  it('keeps telegram auth in the canonical zoom controller only', () => {
    expect(miniAppLayoutSource).not.toContain(
      'useTelegramMiniAppAuthMutation',
    )

    expect(miniAppLayoutSource).not.toContain(
      'telegramMiniAppAuth({ initData',
    )

    expect(controllerSource).toContain(
      'useTelegramMiniAppAuthMutation',
    )

    expect(controllerSource).toContain(
      'telegramMiniAppAuth({ initData: nextInitData })',
    )

    expect(controllerSource).not.toContain(
      'dispatch(setLoading())',
    )

    expect(routeSource).not.toContain(
      'dispatch(setLoading())',
    )

    expect(routeSource).toContain(
      'useCleanMiniAppZoomCalendar',
    )

    expect(routeSource).toContain(
      'CleanMiniAppZoomCalendarView',
    )
  })

  it('keeps zoom API on the shared client', () => {
    expect(zoomApiSource).toContain(
      "import { api } from '@/services/api'",
    )

    expect(zoomApiSource).toContain(
      'api.injectEndpoints',
    )

    expect(zoomApiSource).not.toContain(
      'createApi(',
    )

    expect(zoomApiSource).not.toContain(
      'fetchBaseQuery(',
    )
  })
})

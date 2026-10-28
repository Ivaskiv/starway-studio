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
    'src/features/zoom/routes/MiniAppCalendarRoute.tsx',
  )

const sessionOrchestratorSource =
  readSource(
    'src/features/auth/context/SessionOrchestratorContext.tsx',
  )

describe('zoom miniapp runtime ownership', () => {
  it('keeps exactly one canonical miniapp zoom route owner', () => {
    expect(appRouterSource).toContain(
      'path="/miniapp/zoom-calendar"',
    )

    expect(appRouterSource).toContain(
      'element={<MiniAppCalendarRoute />}',
    )

    expect(routeConfigSource).toContain(
      "path: '/dashboard/zoom'",
    )

    expect(routeConfigSource).toContain(
      'element: <ZoomCalendarPage />',
    )

    expect(miniAppPageSource).not.toContain(
      'MiniAppZoomWeekPanel',
    )

    expect(miniAppPageSource).toContain(
      'return <Navigate to={`/miniapp/zoom-calendar${location.search}`} replace />',
    )
  })

  it('keeps Telegram auth restoration in the shared session orchestrator', () => {
    expect(miniAppLayoutSource).not.toContain(
      'useTelegramMiniAppAuthMutation',
    )

    expect(miniAppLayoutSource).not.toContain(
      'telegramMiniAppAuth({ initData',
    )

    expect(sessionOrchestratorSource).toContain(
      'const restoreSession = useCallback',
    )

    expect(routeSource).not.toContain(
      'useTelegramMiniAppAuthMutation',
    )

    expect(routeSource).toContain(
      'useSessionOrchestrator',
    )

    expect(routeSource).toContain(
      'const { authRestoreStatus, restoreSession } = useSessionOrchestrator()',
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

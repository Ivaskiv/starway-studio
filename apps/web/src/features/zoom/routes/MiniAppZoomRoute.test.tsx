import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const routeSource = readFileSync(new URL('./MiniAppZoomRoute.tsx', import.meta.url), 'utf8')

describe('MiniAppZoomRoute onboarding gate removal', () => {
  it('removes the legacy registration block copy from the miniapp route owner', () => {
    expect(routeSource).not.toContain('Ще один крок.')
    expect(routeSource).not.toContain('Додай ім&apos;я та email, щоб відкрити Zoom-календар.')
    expect(routeSource).not.toContain("Заповни ім'я та email.")
    expect(routeSource).not.toContain('MiniAppZoomOnboarding')
  })

  it('keeps the unauthenticated miniapp entry on the existing zoom content path', () => {
    expect(routeSource).toContain('if (!user) {')
    expect(routeSource).toContain('return <MiniAppZoomWeekPanel />')
    expect(routeSource).not.toContain('needsOnboarding')
    expect(routeSource).not.toContain('useUpdateUserSettingsMutation')
  })
})

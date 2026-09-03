import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const authState = {
  auth: {
    isAuthenticated: true,
  },
}

const mockSessionOrchestrator = {
  accessData: {
    plan: 'free',
    role: 'EXPERT',
    trialEnd: null,
    abilities: {},
  },
  canRunProtectedQueries: true,
  isAccessReady: true,
}

vi.mock('react-redux', () => ({
  useSelector: (selector: (state: typeof authState) => unknown) => selector(authState),
}))

vi.mock('@/features/auth/context/SessionOrchestratorContext', () => ({
  useSessionOrchestrator: () => mockSessionOrchestrator,
}))

vi.mock('@/features/auth/services/auth.slice', () => ({
  selectIsAuthenticated: (state: typeof authState) => state.auth.isAuthenticated,
}))

describe('useAccess privileged staff resolution', () => {
  beforeEach(() => {
    mockSessionOrchestrator.accessData = {
      plan: 'free',
      role: 'EXPERT',
      trialEnd: null,
      abilities: {},
    }
  })

  it('treats EXPERT as privileged paid staff without falling back to free plan', async () => {
    const { useAccess } = await import('./useAccess')

    function Probe() {
      const access = useAccess()
      return createElement(
        'pre',
        undefined,
        JSON.stringify({
          plan: access.plan,
          isAdmin: access.isAdmin,
          isPaid: access.isPaid,
          isFree: access.isFree,
          label: access.label,
        }),
      )
    }

    const markup = renderToStaticMarkup(createElement(Probe))

    expect(markup).toContain('&quot;plan&quot;:&quot;free&quot;')
    expect(markup).toContain('&quot;isAdmin&quot;:true')
    expect(markup).toContain('&quot;isPaid&quot;:true')
    expect(markup).toContain('&quot;isFree&quot;:false')
    expect(markup).toContain('&quot;label&quot;:&quot;Admin&quot;')
  })

  it('allows products.manage for privileged staff even if the current access snapshot has empty abilities', async () => {
    const { useAccess } = await import('./useAccess')

    function Probe() {
      const access = useAccess()
      return createElement(
        'pre',
        undefined,
        JSON.stringify({
          canManageProducts: access.can('products.manage'),
        }),
      )
    }

    const markup = renderToStaticMarkup(createElement(Probe))

    expect(markup).toContain('&quot;canManageProducts&quot;:true')
  })

  it('keeps USER denied for products.manage on the same path', async () => {
    mockSessionOrchestrator.accessData = {
      plan: 'free',
      role: 'USER',
      trialEnd: null,
      abilities: {},
    }

    const { useAccess } = await import('./useAccess')

    function Probe() {
      const access = useAccess()
      return createElement(
        'pre',
        undefined,
        JSON.stringify({
          canManageProducts: access.can('products.manage'),
        }),
      )
    }

    const markup = renderToStaticMarkup(createElement(Probe))

    expect(markup).toContain('&quot;canManageProducts&quot;:false')
  })
})

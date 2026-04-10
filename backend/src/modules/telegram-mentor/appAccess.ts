import type { AccessControlState, UserSystemState } from '../access/types.js'

export type StarwayAppAccess = {
  hasAccess: boolean
  hideAppUi: boolean
  preferredStartPath: string | null
}

type AppFlowProductConfig = {
  id: string
  startPath: string
  productIdTokens?: string[]
  productNameTokens?: string[]
  moduleIds?: string[]
  matchesAccessControl?: (accessControl: AccessControlState) => boolean
}

const STARWAY_APP_PRODUCTS: readonly AppFlowProductConfig[] = [
  {
    id: 'ai-mentor',
    startPath: '/miniapp/mentor',
    productIdTokens: ['ai-mentor', 'mentor'],
    productNameTokens: ['ai-mentor', 'ai-ментор', 'mentor', 'ментор'],
    moduleIds: ['AI_MENTOR'],
    matchesAccessControl: accessControl => accessControl.hasSubscription,
  },
  {
    id: 'five-points',
    startPath: '/products/five-points',
    productIdTokens: ['five-points', 'five-points-of-support'],
    productNameTokens: ['five-points', '5-точок', '5-точок-опори', 'точок-опори'],
    matchesAccessControl: accessControl => accessControl.hasLeadMagnet,
  },
] as const

function normalizeToken(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
}

function matchesAnyToken(value: string | null | undefined, candidates: readonly string[] | undefined): boolean {
  if (!candidates?.length) return false
  const normalized = normalizeToken(value)
  return candidates.some(candidate => normalized.includes(candidate))
}

function isActiveProduct(product: { status: 'trial' | 'paid' | 'locked' }): boolean {
  return product.status === 'trial' || product.status === 'paid'
}

function resolveMatchedProductIds(
  accessControl: AccessControlState,
  systemState: UserSystemState,
): string[] {
  const activeProducts = systemState.products.subscribed.filter(isActiveProduct)

  return STARWAY_APP_PRODUCTS
    .filter((product) => {
      const matchedByAccessControl = product.matchesAccessControl?.(accessControl) === true
      const matchedByModule = product.moduleIds?.some(
        moduleId => systemState.aiModules.some(module => module.moduleId === moduleId && !module.isLocked),
      ) ?? false
      const matchedBySubscribedProduct = activeProducts.some(subscribedProduct =>
        matchesAnyToken(subscribedProduct.id, product.productIdTokens)
        || matchesAnyToken(subscribedProduct.name, product.productNameTokens),
      )

      return matchedByAccessControl || matchedByModule || matchedBySubscribedProduct
    })
    .map(product => product.id)
}

export function resolveStarwayAppAccessFromState(
  accessControl: AccessControlState,
  systemState: UserSystemState,
): StarwayAppAccess {
  if (accessControl.currentFlow === 'lead-magnet') {
    return {
      hasAccess: false,
      hideAppUi: true,
      preferredStartPath: null,
    }
  }

  const matchedProductIds = resolveMatchedProductIds(accessControl, systemState)

  if (matchedProductIds.length === 0) {
    return {
      hasAccess: false,
      hideAppUi: false,
      preferredStartPath: null,
    }
  }

  if (matchedProductIds.length > 1) {
    return {
      hasAccess: true,
      hideAppUi: false,
      preferredStartPath: '/miniapp',
    }
  }

  const matchedProduct = STARWAY_APP_PRODUCTS.find(product => product.id === matchedProductIds[0])

  return {
    hasAccess: true,
    hideAppUi: false,
    preferredStartPath: matchedProduct?.startPath ?? '/miniapp',
  }
}


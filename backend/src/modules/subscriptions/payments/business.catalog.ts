import type {
  EcosystemPaymentPlanId,
  EcosystemPaymentProduct,
  EcosystemPlanDefinition,
} from './business.types.js'

// TODO: узгодити фінальну ціну з Вірою.
const STARWAY_COMPLETE_SUBSCRIPTION_PRICE_UAH = 1120

const absystemAiUpgradePlan: EcosystemPlanDefinition = {
  amount: STARWAY_COMPLETE_SUBSCRIPTION_PRICE_UAH,
  durationDays: 30,
  dbProductCodes: ['absystem_ai', 'absystem'],
  lifecycleState: 'platform_active',
}

const ECOSYSTEM_PAYMENT_CATALOG: Record<
  EcosystemPaymentProduct,
  Partial<Record<EcosystemPaymentPlanId, EcosystemPlanDefinition>> &
    Partial<Record<'STARWAY_COMPLETE_SUBSCRIPTION', EcosystemPlanDefinition>>
> = {
  focus: {
    'welcome_test': {
      amount: 490,
      durationDays: 30,
      dbProductCodes: ['focus'],
      lifecycleState: 'focus_active',
    },
    '1month': {
      amount: 780,
      durationDays: 30,
      dbProductCodes: ['focus'],
      lifecycleState: 'focus_active',
    },
    '3month': {
      amount: 1990,
      durationDays: 90,
      dbProductCodes: ['focus'],
      lifecycleState: 'focus_active',
    },
  },
  trial_zoom: {
    single: {
      amount: 1,
      durationDays: 7,
      dbProductCodes: ['trial_zoom'],
      lifecycleState: 'trial_zoom',
    },
  },
  absystem_ai: {
    '1month': {
      amount: 1900,
      durationDays: 30,
      dbProductCodes: ['absystem_ai', 'absystem'],
      lifecycleState: 'platform_active',
    },
    '1month_upgrade': absystemAiUpgradePlan,
    STARWAY_COMPLETE_SUBSCRIPTION: absystemAiUpgradePlan,
    '6month': {
      amount: 9900,
      durationDays: 180,
      dbProductCodes: ['absystem_ai', 'absystem'],
      lifecycleState: 'platform_active',
    },
    '1year': {
      amount: 18000,
      durationDays: 365,
      dbProductCodes: ['absystem_ai', 'absystem'],
      lifecycleState: 'platform_active',
    },
  },
}

export function resolveEcosystemPaymentPlan(
  productId: EcosystemPaymentProduct,
  planId: EcosystemPaymentPlanId
): EcosystemPlanDefinition | null {
  return ECOSYSTEM_PAYMENT_CATALOG[productId]?.[planId] ?? null
}

export function resolveEcosystemPaymentTarget(amount: number): {
  productId: EcosystemPaymentProduct
  planId: EcosystemPaymentPlanId
} | null {
  for (const [productId, plans] of Object.entries(
    ECOSYSTEM_PAYMENT_CATALOG
  ) as Array<
    [
      EcosystemPaymentProduct,
      Partial<Record<EcosystemPaymentPlanId, EcosystemPlanDefinition>>,
    ]
  >) {
    for (const [planId, plan] of Object.entries(plans) as Array<
      [EcosystemPaymentPlanId, EcosystemPlanDefinition]
    >) {
      if (plan.amount === amount) {
        return { productId, planId }
      }
    }
  }

  return null
}

export function resolveEcosystemProductCode(
  productId: EcosystemPaymentProduct
): string[] {
  if (productId === 'focus') return ['focus']
  if (productId === 'trial_zoom') return ['trial_zoom']
  return ['absystem_ai', 'absystem']
}

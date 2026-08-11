#!/usr/bin/env tsx

import { getPayment } from '../packages/shared/src/payments/payments.catalog.js'
import { runFocusContentSync, resolveDefaultFocusSourcePath, resolveDefaultGeneratedPath, FocusContentSyncError } from '../backend/src/products/ab-system/content/focusContent.sync.js'
import { resolveEcosystemPaymentPlan } from '../backend/src/modules/subscriptions/payments/business.catalog.js'

async function main() {
  const sourcePath = resolveDefaultFocusSourcePath()
  const generatedPath = resolveDefaultGeneratedPath()
  const allowPriceConfigMismatch = process.env.CONTENT_SYNC_ALLOW_PRICE_CONFIG_MISMATCH === '1'

  const oneMonthPlan = resolveEcosystemPaymentPlan('focus', '1month')
  const threeMonthPlan = resolveEcosystemPaymentPlan('focus', '3month')
  const focusMonthly = getPayment('focus_monthly')
  const focusQuarterly = getPayment('focus_quarterly')

  if (!oneMonthPlan || !threeMonthPlan) {
    throw new Error('Missing focus payment plans in business catalog')
  }

  const result = await runFocusContentSync({
    sourcePath,
    generatedPath,
    allowPriceConfigMismatch,
    priceConfig: {
      businessCatalog: {
        oneMonthAmount: oneMonthPlan.amount,
        threeMonthAmount: threeMonthPlan.amount,
      },
      paymentCatalog: {
        focusMonthlyAmount: focusMonthly.amount,
        focusQuarterlyAmount: focusQuarterly.amount,
      },
    },
  })

  console.log([
    `content:sync ${result.changed ? 'UPDATED' : 'NO_CHANGES'}`,
    `source=${result.sourcePath}`,
    `generated=${result.generatedPath}`,
    `results=${result.summary.resultSegments}`,
    `followups=${result.summary.followups}`,
    `reminders=${result.summary.reminders}`,
  ].join('\n'))
}

main().catch((error) => {
  if (error instanceof FocusContentSyncError) {
    console.error(`content:sync FAILED ${error.code}`)
    console.error(error.message)
    process.exit(1)
  }

  console.error(error)
  process.exit(1)
})

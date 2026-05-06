import { generateConversionMessage } from './conversionMessageGenerator.js'
import type { ConversionOpportunityEvent } from './conversionEmitter.js'

export type ConversionActionType = 'trial_start' | 'show_paywall' | 'offer_discount'

export type ConversionActionResult = {
  type: 'conversion_action'
  userId: string
  offerType: ConversionOpportunityEvent['offerType']
  timingScore: number
  reason: string
  action: ConversionActionType
  message: string
  channel: 'web' | 'telegram'
  timestamp: number
}

export function handleConversion(event: ConversionOpportunityEvent): ConversionActionResult {
  let action: ConversionActionType
  let channel: 'web' | 'telegram'

  switch (event.offerType) {
    case 'trial':
      action = 'trial_start'
      channel = 'telegram'
      break
    case 'discount':
      action = 'offer_discount'
      channel = 'telegram'
      break
    case 'standard':
    default:
      action = 'show_paywall'
      channel = 'web'
      break
  }

  const result: ConversionActionResult = {
    type: 'conversion_action',
    userId: event.userId,
    offerType: event.offerType,
    timingScore: event.timingScore,
    reason: event.reason,
    action,
    message: generateConversionMessage(event.offerType, action),
    channel,
    timestamp: Date.now(),
  }

  console.log('[CONVERSION]', {
    userId: event.userId,
    status: 'handled',
    action: result.action,
    offerType: result.offerType,
    channel: result.channel,
  })

  return result
}

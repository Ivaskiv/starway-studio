import { isTelegramMiniApp } from '@/features/social/utils/telegramWebApp'
import { resolveApiUrl } from '@/services/api'

import { openExternalPaymentUrl } from './openExternalPaymentUrl'

type WayForPayPayload = Record<string, unknown>

const ARRAY_FIELD_NAMES: Record<string, string> = {
  productName: 'productName[]',
  productPrice: 'productPrice[]',
  productCount: 'productCount[]',
}

function encodeCheckoutPayload(payload: WayForPayPayload): string {
  const json = JSON.stringify(payload)
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function resolveCheckoutProxyUrl(payload: WayForPayPayload): string {
  const encoded = encodeCheckoutPayload(payload)
  return resolveApiUrl(`/payments/wayforpay/checkout?payload=${encoded}`)
}

function isWayForPayCheckoutProxy(action: string): boolean {
  return action.includes('/payments/wayforpay/checkout')
}

function isDirectWayForPayPayEndpoint(action: string): boolean {
  return /secure\.wayforpay\.com\/pay\/?$/i.test(action)
}

function shouldUseExternalCheckout(action: string): boolean {
  if (typeof window === 'undefined') return false
  if (!isTelegramMiniApp(window.location.pathname)) return false
  return isDirectWayForPayPayEndpoint(action) || isWayForPayCheckoutProxy(action)
}

function resolveCheckoutAction(action: string, payload: WayForPayPayload): string {
  if (isWayForPayCheckoutProxy(action)) {
    return action.startsWith('http') ? action : resolveApiUrl(action.replace(/^\/?api/, ''))
  }

  if (isDirectWayForPayPayEndpoint(action)) {
    return resolveCheckoutProxyUrl(payload)
  }

  return action
}

export function submitWayForPayForm(action: string, payload: WayForPayPayload) {
  if (typeof document === 'undefined') return

  if (shouldUseExternalCheckout(action)) {
    openExternalPaymentUrl(resolveCheckoutAction(action, payload))
    return
  }

  const form = document.createElement('form')
  form.method = 'POST'
  form.action = action
  form.target = '_top'
  form.style.display = 'none'

  Object.entries(payload).forEach(([key, value]) => {
    if (value == null) return

    if (Array.isArray(value)) {
      const fieldName = ARRAY_FIELD_NAMES[key] ?? `${key}[]`
      value.forEach((item) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = fieldName
        input.value = String(item)
        form.appendChild(input)
      })
      return
    }

    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = key
    input.value = String(value)
    form.appendChild(input)
  })

  document.body.appendChild(form)
  form.submit()
  document.body.removeChild(form)
}

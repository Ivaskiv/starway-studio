// frontend/src/features/quota/components/PurchaseModal.tsx
// ─── ВИПРАВЛЕНО: рядок 5 — імпорт з quota.api замість @/services/api ─────────
import { Button } from '@/ui/Button'
import { GlassCard } from '@/ui'
import { toast } from 'react-hot-toast'
import React, { Fragment } from 'react'
import { usePurchaseQuotaMutation } from '@/features/quota/services/api'
// import { usePurchaseQuotaMutation } from '@/features/quota/services/quota.api' // ← виправлено (було: @/services/api)

const PACKAGES = [
  { id: 's', label: 'Пакет S', gens: 50,  price: 3.99  },
  { id: 'm', label: 'Пакет M', gens: 150, price: 9.99  },
  { id: 'l', label: 'Пакет L', gens: 500, price: 24.99 },
]

type PurchaseModalProps = {
  open:    boolean
  onClose: () => void
}

const buildWayForPayUrl = (amount: number, orderId: string) => {
  const params = new URLSearchParams({
    merchantAccount:   'demo@wayforpay.com',
    merchantDomainName: 'starway.studio',
    orderReference:    orderId,
    orderDate:         `${Math.floor(Date.now() / 1000)}`,
    amount:            amount.toFixed(2),
    currency:          'USD',
    productName:       'Timely generations',
    productPrice:      amount.toFixed(2),
    productCount:      '1',
    clientFirstName:   'Starway',
    clientLastName:    'Client',
    clientEmail:       'notify@starway.studio',
    returnUrl:         window.location.origin,
  })
  return `https://secure.wayforpay.com/payment?${params.toString()}`
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({ open, onClose }) => {
  const [purchaseQuota, { isLoading }] = usePurchaseQuotaMutation()

  const handlePurchase = async (pkg: typeof PACKAGES[number]) => {
    try {
      await purchaseQuota({ amount: pkg.gens, costUsd: pkg.price }).unwrap()
      toast.success(`+${pkg.gens} generations added`)
      window.open(buildWayForPayUrl(pkg.price, `quota-${pkg.id}-${Date.now()}`), '_blank')
      onClose()
    } catch (error) {
      console.error(error)
      toast.error('Не вдалося оформити пакет')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <GlassCard className="max-w-lg w-full space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Обрати пакет генерацій</h3>
          <button className="text-white/50" onClick={onClose}>✕</button>
        </div>
        <p className="text-sm text-white/60">
          Додаткові пакети відкривають нові можливості для AI-ментору. Платіж через WayForPay зручним способом.
        </p>
        <div className="grid grid-cols-1 gap-3">
          {PACKAGES.map(pkg => (
            <Fragment key={pkg.id}>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                <div>
                  <p className="text-white font-semibold">{pkg.label}</p>
                  <p className="text-xs text-white/50">{pkg.gens} генерацій</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-[var(--accent)]">${pkg.price}</p>
                  <p className="text-xs text-white/50">${(pkg.price / pkg.gens).toFixed(2)}/gen</p>
                </div>
                <Button
                  color="accent"
                  size="sm"
                  onClick={() => handlePurchase(pkg)}
                  disabled={isLoading}
                >
                  Купити
                </Button>
              </div>
            </Fragment>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
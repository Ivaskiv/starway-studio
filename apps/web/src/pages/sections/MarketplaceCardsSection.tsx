// frontend/src/pages/sections/MarketplaceCardsSection.tsx
import { useEffect, useState } from "react"
import { fetchProducts, MarketplaceProduct } from "@/features/marketplace/services/products.service"

export default function MarketplaceCardsSection() {
  const [products, setProducts] = useState<MarketplaceProduct[]>([])

  useEffect(() => {
    fetchProducts().then(setProducts)
  }, [])

  return (
    <section className="py-8">
      <div className="mx-auto max-w-[1600px] px-6">
        <div className="rounded-2xl border border-[color:var(--border-primary)] bg-[color:var(--glass-bg)] p-6">
          <h2 className="mb-6 text-2xl font-bold">AI Marketplace</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {products.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-[color:var(--border-accent)] bg-[color:var(--glass-bg-hover)] p-4 transition hover:shadow-lg"
              >
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="mt-2 text-xs text-[color:var(--text-muted)]">{p.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-bold text-[color:var(--accent-soft)]">${p.price}</span>
                  <button className="btn-responsive glass-button px-3 py-1 text-sm">
                    Деталі
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

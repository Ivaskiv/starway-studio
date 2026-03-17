// frontend/src/pages/sections/MarketplaceCardsSection.tsx
import { useEffect, useState } from "react"
import { fetchProducts, MarketplaceProduct } from "@/features/marketplace/services/products.service"

export default function MarketplaceCardsSection() {
  const [products, setProducts] = useState<MarketplaceProduct[]>([])

  useEffect(() => {
    fetchProducts().then(setProducts)
  }, [])

  return (
    <section className="py-12 px-6 bg-[color:var(--glass-bg)] rounded-2xl border border-[color:var(--border-primary)]">
      <h2 className="text-2xl font-bold mb-6">AI Marketplace</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.map((p) => (
          <div
            key={p.id}
            className="p-4 rounded-xl bg-[color:var(--glass-bg-hover)] border border-[color:var(--border-accent)] hover:shadow-lg transition"
          >
            <h3 className="font-semibold text-lg">{p.name}</h3>
            <p className="text-xs mt-2 text-[color:var(--text-muted)]">{p.description}</p>
            <div className="mt-4 flex justify-between items-center">
              <span className="font-bold text-[color:var(--accent-soft)]">${p.price}</span>
              <button className="btn-responsive glass-button text-sm px-3 py-1">
                Деталі
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

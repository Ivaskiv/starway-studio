// frontend/src/pages/sections/AffiliateTestSection.tsx
import { useState } from "react"
import { createAffiliate, recordSale, trackClick } from "@/features/affiliate/services/affiliate.service"

export default function AffiliateTestSection() {
  const [code, setCode] = useState("")
  const [saleAmount, setSaleAmount] = useState(50)
  const [result, setResult] = useState<any>(null)

  const handleCreate = async () => setResult(await createAffiliate({ productId: "test-prod" }))
  const handleClick = async () => setResult(await trackClick(code))
  const handleSale = async () => setResult(await recordSale({ code, amount: saleAmount }))

  return (
    <section className="mt-6 border-t border-[color:var(--border-primary)] py-8">
      <div className="mx-auto max-w-[1600px] px-6">
        <h2 className="mb-4 text-2xl font-bold">Affiliate Test</h2>
        <div className="flex max-w-md flex-col gap-3">
          <button onClick={handleCreate} className="btn-responsive glass-button">Створити лінк</button>
          <input
            placeholder="Affiliate code"
            value={code}
            onChange={e => setCode(e.target.value)}
            className="glass-input"
          />
          <button onClick={handleClick} className="btn-responsive glass-button">Трек клік</button>
          <input
            type="number"
            placeholder="Сума продажу"
            value={saleAmount}
            onChange={e => setSaleAmount(+e.target.value)}
            className="glass-input"
          />
          <button onClick={handleSale} className="btn-responsive glass-button">Записати продаж</button>
          <pre className="rounded bg-[color:var(--glass-bg)] p-2 text-xs">{JSON.stringify(result, null, 2)}</pre>
        </div>
      </div>
    </section>
  )
}

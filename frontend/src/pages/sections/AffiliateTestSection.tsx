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
    <section className="py-12 px-6 mt-6 border-t border-[color:var(--border-primary)]">
      <h2 className="text-2xl font-bold mb-4">Affiliate Test</h2>
      <div className="flex flex-col gap-3 max-w-md">
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
        <pre className="text-xs bg-black/20 p-2 rounded">{JSON.stringify(result, null, 2)}</pre>
      </div>
    </section>
  )
}

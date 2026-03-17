// frontend/src/features/producer/components/SEOPanel.tsx

import { useState } from 'react'
import { useGenerateSEOMutation } from '../services/producer.api'
import type { SEOResult } from '../services/producer.api'

interface Props {
  productId: string
  onGenerated?: (seo: SEOResult) => void
}

const PAGE_TYPES = [
  { value: 'landing',  label: 'Лендінг'  },
  { value: 'product',  label: 'Продукт'  },
  { value: 'blog',     label: 'Блог'     },
  { value: 'funnel',   label: 'Воронка'  },
] as const

type PageType = typeof PAGE_TYPES[number]['value']

export function SEOPanel({ productId, onGenerated }: Props) {
  const [pageType, setPageType] = useState<PageType>('landing')
  const [keyword,  setKeyword]  = useState('')
  const [result,   setResult]   = useState<SEOResult | null>(null)
  const [copied,   setCopied]   = useState<string | null>(null)

  const [generate, { isLoading }] = useGenerateSEOMutation()

  const handleGenerate = async () => {
    const res = await generate({ productId, pageType, keyword: keyword.trim() || undefined }).unwrap()
    setResult(res.seo)
    onGenerated?.(res.seo)
  }

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button
      onClick={() => copy(text, id)}
      className="ml-2 text-xs px-2 py-0.5 rounded-lg transition-all"
    >
      {copied === id ? '✓' : 'Копіювати'}
    </button>
  )

  return (
    <div
      className="rounded-2xl p-5 space-y-4"
    >
      {/* Хедер */}
      <div>
        <p className="text-white/40 text-xs uppercase tracking-widest mb-0.5">SEO Менеджер</p>
        <p className="text-white font-semibold">Мета-теги та структура</p>
      </div>

      {/* Тип сторінки */}
      <div className="flex gap-2 flex-wrap">
        {PAGE_TYPES.map(pt => (
          <button
            key={pt.value}
            onClick={() => setPageType(pt.value)}
            className="px-3 py-1.5 rounded-xl text-sm transition-all"
          >
            {pt.label}
          </button>
        ))}
      </div>

      {/* Ключове слово */}
      <input
        value={keyword}
        onChange={e => setKeyword(e.target.value)}
        placeholder="Ключове слово (необов'язково)"
        className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none"
      />

      {/* Кнопка */}
      <button
        onClick={handleGenerate}
        disabled={isLoading}
        className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-50"
      >
        {isLoading ? 'Генеруємо...' : '⚡ Згенерувати SEO'}
      </button>

      {/* Результат */}
      {result && (
        <div className="space-y-3 pt-2 border-t border-white/[0.06]">

          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-white/40 text-xs uppercase tracking-widest">Title</p>
              <CopyBtn text={result.title} id="title" />
            </div>
            <p className="text-white text-sm bg-white/[0.04] rounded-xl px-3 py-2">
              {result.title}
            </p>
            <p className="text-white/30 text-xs mt-1 text-right">{result.title.length}/60</p>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-white/40 text-xs uppercase tracking-widest">Description</p>
              <CopyBtn text={result.description} id="desc" />
            </div>
            <p className="text-white text-sm bg-white/[0.04] rounded-xl px-3 py-2 leading-relaxed">
              {result.description}
            </p>
            <p className="text-white/30 text-xs mt-1 text-right">{result.description.length}/160</p>
          </div>

          {/* H1 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-white/40 text-xs uppercase tracking-widest">H1</p>
              <CopyBtn text={result.h1} id="h1" />
            </div>
            <p className="text-white font-semibold text-sm bg-white/[0.04] rounded-xl px-3 py-2">
              {result.h1}
            </p>
          </div>

          {/* Keywords */}
          {result.keywords.length > 0 && (
            <div>
              <p className="text-white/40 text-xs uppercase tracking-widest mb-2">Ключові слова</p>
              <div className="flex flex-wrap gap-1.5">
                {result.keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-full"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* FAQ */}
          {result.faq.length > 0 && (
            <div>
              <p className="text-white/40 text-xs uppercase tracking-widest mb-2">FAQ</p>
              <div className="space-y-2">
                {result.faq.map((item, i) => (
                  <div key={i} className="bg-white/[0.03] rounded-xl px-3 py-2.5">
                    <p className="text-white/80 text-sm font-medium mb-1">Q: {item.q}</p>
                    <p className="text-white/50 text-sm">A: {item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
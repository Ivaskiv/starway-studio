// frontend/src/features/landing/components/CreateLandingForm.tsx
import { GlassCard, Select } from '@/ui'
import axios from 'axios'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

type CreateLandingFormProps = {
  userId: string
}

type Product = {
  id: string
  title: string
  price: number
}

const EMPTY_PRODUCT: Product = { id: '', title: '', price: 0 }

export default function CreateLandingForm({ userId }: CreateLandingFormProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const selectedProduct = useMemo(
    () => products.find(product => product.id === selectedProductId) ?? EMPTY_PRODUCT,
    [products, selectedProductId],
  )

  useEffect(() => {
    let cancelled = false
    axios
      .get<Product[]>(`/api/products?userId=${userId}`)
      .then(res => {
        if (!cancelled) {
          setProducts(res.data ?? [])
        }
      })
      .catch(error => {
        console.error('[CreateLandingForm] Failed to load products', error)
        toast.error('Не вдалося завантажити продукти — спробуй пізніше.')
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const canSubmit = useMemo(
    () => title.trim().length > 0 && selectedProductId.trim().length > 0,
    [title, selectedProductId],
  )

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error('Вкажіть назву лендінгу та оберіть продукт/воронку!')
      return
    }

    setIsSubmitting(true)

    try {
      await axios.post('/api/landing/create', {
        userId,
        title: title.trim(),
        url: url.trim(),
        productId: selectedProductId,
      })
      toast.success('Лендінг успішно створено!')
      navigate('/dashboard')
    } catch (error) {
      console.error('[CreateLandingForm] create failed', error)
      toast.error('Помилка створення лендінгу — спробуйте ще раз.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <GlassCard className="p-6 space-y-4">
      <h2 className="text-lg font-bold text-[var(--text-primary)]">Створити новий лендінг</h2>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-[var(--text-muted)]" htmlFor="landing-title">
          Назва лендінгу
        </label>
        <input
          id="landing-title"
          type="text"
          placeholder="Назва лендінгу"
          value={title}
          onChange={event => setTitle(event.target.value)}
          className="w-full p-2 border rounded border-[var(--border)] bg-[var(--bg-primary)] focus:border-[var(--accent)] focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-[var(--text-muted)]" htmlFor="landing-url">
          URL (опційно)
        </label>
        <input
          id="landing-url"
          type="text"
          placeholder="https://"
          value={url}
          onChange={event => setUrl(event.target.value)}
          className="w-full p-2 border rounded border-[var(--border)] bg-[var(--bg-primary)] focus:border-[var(--accent)] focus:outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-[var(--text-muted)]" htmlFor="landing-product">
          Оберіть продукт або воронку
        </label>
        <Select
          id="landing-product"
          title="Оберіть продукт або воронку"
          aria-label="Оберіть продукт або воронку"
          value={selectedProductId}
          onChange={event => setSelectedProductId(event.target.value)}
          className="w-full p-2 border rounded border-[var(--border)] bg-[var(--bg-primary)] focus:border-[var(--accent)] focus:outline-none"
        >
          <option value="" disabled>
            Оберіть продукт / воронку
          </option>
          {products.map(product => (
            <option key={product.id} value={product.id}>
              {product.title} (€{product.price})
            </option>
          ))}
        </Select>
        {selectedProductId && (
          <p className="text-xxs text-[var(--text-muted-light)]">
            Обрано: {selectedProduct.title} — €{selectedProduct.price}
          </p>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || isSubmitting}
        className="w-full px-4 py-2 rounded bg-[var(--accent)] text-black font-semibold transition hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Створюємо…' : 'Створити лендінг'}
      </button>
    </GlassCard>
  )
}

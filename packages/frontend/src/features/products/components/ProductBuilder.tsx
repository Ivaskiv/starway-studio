// packages/frontend/src/features/products/components/ProductBuilder.tsx

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/ui/Input'
import { Textarea } from '@/ui/Textarea'
import { Button } from '@/ui/Button'
import { Select } from '@/ui/Select'
import { Label } from '@/ui/Label'
import {
  ProductFormInputs,
  ProductType,
  ProductFormat,
  ProductIntegration,
  formToCreatePayload,
} from '@/features/products/types/product.types'
import { useCreateProductMutation } from '@/services/admin.api'

// ===== Константи для селектів =====
const PRODUCT_TYPES: { label: string; value: ProductType }[] = [
  { label: '📚 Курс', value: 'course' },
  { label: '🎯 Практикум', value: 'coaching' },
  { label: '🤖 AI-ментор', value: 'telegram_bot' },
  { label: '📖 Електронна книга', value: 'ebook' },
  { label: '🖥️ Вебінар', value: 'webinar' },
  // Додавайте нові типи тут
]

const FORMATS: { label: string; value: ProductFormat }[] = [
  { label: 'Web', value: 'web' },
  { label: 'Mini App', value: 'mini_app' },
  { label: 'Telegram Task', value: 'telegram_task' },
]

const INTEGRATIONS: { label: string; value: ProductIntegration }[] = [
  { label: 'Telegram', value: 'telegram' },
  { label: 'Web', value: 'web' },
  { label: 'Future', value: 'future' },
]

const DEFAULT_FORM: ProductFormInputs = {
  name: '',
  description: '',
  type: 'course',
  price: 0,
  currency: 'EUR',
  includesTrial: false,
  trialDays: 7,
  includesMentorship: false,
  format: 'web',
  integration: 'telegram',
  status: 'draft',
  thumbnailUrl: '',
  modules: [],
  resolvedModules: [],
}

export const ProductBuilder: React.FC = () => {
  const [productForm, setProductForm] = useState<ProductFormInputs>(DEFAULT_FORM)
  const [createProduct, { isLoading }] = useCreateProductMutation()
  const navigate = useNavigate()

  const handleChange = <K extends keyof ProductFormInputs>(
    key: K,
    value: ProductFormInputs[K]
  ) => {
    setProductForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleCreate = async () => {
    try {
      const payload = formToCreatePayload(productForm)
      const result = await createProduct(payload).unwrap()
      navigate(`/admin/products/${result.id}/edit`)
    } catch (error) {
      console.error('Error creating product:', error)
    }
  }

  return (
    <div className="space-y-6 p-6 bg-gray-900 rounded-xl text-white">
      <h2 className="text-2xl font-bold mb-4">Створення продукту</h2>

      {/* Назва */}
      <div>
        <Label>Назва продукту</Label>
        <Input
          value={productForm.name}
          onChange={(e) => handleChange('name', e.target.value)}
          placeholder="Наприклад: Сила свідомості"
        />
      </div>

      {/* Опис */}
      <div>
        <Label>Опис продукту</Label>
        <Textarea
          value={productForm.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Короткий опис продукту"
          rows={3}
        />
      </div>

      {/* Тип */}
      <div>
        <Label>Тип продукту</Label>
        <Select
          value={productForm.type}
          onChange={(e) => handleChange('type', e.target.value as ProductType)}
        >
          {PRODUCT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Формат */}
      <div>
        <Label>Формат</Label>
        <Select
          value={productForm.format}
          onChange={(e) => handleChange('format', e.target.value as ProductFormat)}
        >
          {FORMATS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Інтеграція */}
      <div>
        <Label>Інтеграція</Label>
        <Select
          value={productForm.integration}
          onChange={(e) =>
            handleChange('integration', e.target.value as ProductIntegration)
          }
        >
          {INTEGRATIONS.map((i) => (
            <option key={i.value} value={i.value}>
              {i.label}
            </option>
          ))}
        </Select>
      </div>

      {/* Ціна */}
      <div>
        <Label>Ціна</Label>
        <Input
          type="number"
          value={productForm.price}
          onChange={(e) => handleChange('price', Number(e.target.value))}
        />
      </div>

      {/* Триал */}
      <div className="flex items-center gap-3">
        <Input
          type="checkbox"
          checked={productForm.includesTrial}
          onChange={(e) => handleChange('includesTrial', e.target.checked)}
          id="trial"
        />
        <Label htmlFor="trial">Має триал</Label>
      </div>

      {/* Дні триалу */}
      {productForm.includesTrial && (
        <div>
          <Label>Кількість днів триалу</Label>
          <Input
            type="number"
            value={productForm.trialDays}
            onChange={(e) => handleChange('trialDays', Number(e.target.value))}
          />
        </div>
      )}

      {/* Менторство */}
      <div className="flex items-center gap-3">
        <Input
          type="checkbox"
          checked={productForm.includesMentorship}
          onChange={(e) => handleChange('includesMentorship', e.target.checked)}
          id="mentorship"
        />
        <Label htmlFor="mentorship">Має менторство</Label>
      </div>

      {/* Кнопка створення */}
      <Button onClick={handleCreate} disabled={isLoading} className="mt-4">
        {isLoading ? 'Створюємо...' : 'Створити продукт'}
      </Button>
    </div>
  )
}

export default ProductBuilder

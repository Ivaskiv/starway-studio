// packages/frontend/src/features/products/components/ProductForm.tsx

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'

// import {
//   ProductFormInputs,
//   ProductType,
//   Currency,
//   ProductFormat,
//   ProductIntegration,
//   PRODUCT_TYPE_LABELS,
//   CURRENCY_SYMBOLS,
//   Product,
//   Module,
// } from '@/features/products/types/product.types'

import { Input, Button, Select, Textarea } from '@/ui'
import {
  useCreateProductMutation,
  useGetProductByIdQuery,
  useUpdateProductMutation,
} from '@/features/products/services/products.api'

const productTypeOptions = Object.entries(PRODUCT_TYPE_LABELS).map(([value, label]) => ({
  value: value as ProductType,
  label,
}))

const currencyOptions = [
  { value: 'UAH' as Currency, label: `Українська гривня (${CURRENCY_SYMBOLS.UAH})` },
  { value: 'EUR' as Currency, label: `Євро (${CURRENCY_SYMBOLS.EUR})` },
  { value: 'USD' as Currency, label: `Долар США (${CURRENCY_SYMBOLS.USD})` },
]

const formatOptions = [
  { value: 'web' as ProductFormat, label: 'Тільки веб-версія' },
  { value: 'mini_app' as ProductFormat, label: 'Telegram Mini App' },
  { value: 'telegram_task' as ProductFormat, label: 'Завдання в Telegram' },
  { value: 'mixed' as ProductFormat, label: 'Web + Telegram' },
]

const integrationOptions = [
  { value: 'telegram' as ProductIntegration, label: 'Telegram (нагадування + Mini App)' },
  { value: 'web' as ProductIntegration, label: 'Тільки веб' },
  { value: 'future' as ProductIntegration, label: 'Майбутні соцмережі' },
]

export default function ProductForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const { data: product, isLoading: isLoadingProduct } = useGetProductByIdQuery(id!, {
    skip: !isEdit,
  })

  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation()
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation()

  const isSubmitting = isCreating || isUpdating

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ProductFormInputs>({
    defaultValues: {
      name: '',
      description: '',
      type: 'membership',
      price: 0,
      currency: 'EUR',
      includesTrial: false,
      trialDays: 7,
      includesMentorship: false,
      format: 'mini_app',
      integration: 'telegram',
      status: 'draft',
      thumbnailUrl: '',
      modules: [],
    },
  })

  // Безпечний reset при редагуванні
  useEffect(() => {
    if (product && isEdit) {
      reset({
        name: product.name ?? '',
        description: product.description ?? '',
        type: (product.type as ProductType) ?? 'membership',
        price: product.price ?? 0,
        currency: (product.currency as Currency) ?? 'EUR',
 includesTrial: (product as any).includesTrial ?? false,
        trialDays: (product as any).trialDays ?? 7,
        includesMentorship: (product as any).includesMentorship ?? false,
        format: (product as any).format ?? 'mini_app',
        integration: (product as any).integration ?? 'telegram',        status: product.status ?? 'draft',
        thumbnailUrl: product.thumbnailUrl ?? '',
        // Якщо modules — це масив об’єктів Module, витягуємо id
        modules: product.modules?.map((m: any) => m.id) ?? [],
      })
    }
  }, [product, isEdit, reset])

const onSubmit = async (data: ProductFormInputs) => {
  try {
    const payload: Partial<Product> = {
      ...data,
      modules: data.modules.map((id) => ({ id } as Module)), // приводимо до Module
    }

    if (isEdit && id) {
      await updateProduct({ id, data: payload }).unwrap()
      toast.success('Продукт успішно оновлено!')
    } else {
      await createProduct(payload).unwrap()
      toast.success('Продукт успішно створено!')
    }

    navigate('/products')
  } catch (err: any) {
    toast.error(err?.data?.message || 'Щось пішло не так')
  }
}


  const getError = (field: keyof ProductFormInputs): string | undefined =>
    errors[field]?.message as string

  if (isEdit && isLoadingProduct) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-400">Завантаження продукту...</p>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold mb-8 text-white">
        {isEdit ? 'Редагування продукту' : 'Створення нового продукту'}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Назва */}
        <Input
          label="Назва продукту"
          placeholder="Наприклад: Місячна підписка AI-Ментор + Наставництво"
          error={getError('name')}
          {...register('name', { required: "Назва обов'язкова" })}
        />

        {/* Тип продукту */}
        <Controller
          name="type"
          control={control}
          rules={{ required: 'Оберіть тип продукту' }}
          render={({ field }) => (
            <Select
              label="Тип продукту"
              value={field.value}
              onChange={field.onChange}
              options={productTypeOptions}
              error={getError('type')}
            />
          )}
        />

        {/* Ціна та валюта */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Ціна"
            type="number"
            step="0.01"
            placeholder="33.00"
            error={getError('price')}
            {...register('price', {
              required: 'Вкажіть ціну',
              min: { value: 0, message: 'Ціна не може бути від’ємною' },
              valueAsNumber: true,
            })}
          />

          <Controller
            name="currency"
            control={control}
            render={({ field }) => (
              <Select
                label="Валюта"
                value={field.value}
                onChange={field.onChange}
                options={currencyOptions}
              />
            )}
          />
        </div>

        {/* Опції доступу */}
        <div className="space-y-4 py-4 px-6 glass-card rounded-xl">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-slate-600"
              {...register('includesTrial')}
            />
            <span className="text-white">Включити пробний період (7 днів)</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-5 h-5 rounded border-slate-600"
              {...register('includesMentorship')}
            />
            <span className="text-white">Включити індивідуальне наставництво</span>
          </label>
        </div>

        {/* Формат та інтеграція */}
        <Controller
          name="format"
          control={control}
          render={({ field }) => (
            <Select
              label="Формат доставки"
              value={field.value}
              onChange={field.onChange}
              options={formatOptions}
            />
          )}
        />

        <Controller
          name="integration"
          control={control}
          render={({ field }) => (
            <Select
              label="Основна інтеграція"
              value={field.value}
              onChange={field.onChange}
              options={integrationOptions}
            />
          )}
        />

        {/* Опис */}
        <Textarea
          label="Опис продукту"
          placeholder="Розкажи, що отримає клієнт: доступ до Mini App, щоденні завдання в Telegram, підтримка, результати..."
          rows={5}
          {...register('description')}
        />

        {/* Thumbnail */}
        <Input
          label="Посилання на обкладинку (thumbnail)"
          placeholder="https://..."
          {...register('thumbnailUrl')}
        />

        {/* Submit */}
        <Button
          type="submit"
          disabled={isSubmitting}
          data-color="purple"
          data-size="lg"
          className="w-full py-5 text-lg font-bold"
        >
          {isSubmitting ? 'Зберігаємо...' : isEdit ? 'Зберегти зміни' : 'Створити продукт'}
        </Button>
      </form>
    </div>
  )
}
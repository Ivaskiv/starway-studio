// packages/frontend/src/features/products/ProductForm.tsx
import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Module, ProductFormInputs } from './productsType'
import { Input, Button } from '../../ui'

const modulesList: Module[] = [
  { value: 'wheel', label: 'Колесо балансу' },
  { value: 'daily_analysis', label: 'AI-аналіз дня' },
  { value: 'telegram_bot', label: 'Telegram-бот' },
  { value: 'tasks', label: 'Завдання' },
]

export default function ProductForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const { register, handleSubmit, setValue, control, formState: { errors } } = useForm<ProductFormInputs>({
    defaultValues: {
      title: '',
      price: 0,
      description: '',
      modules: []
    }
  })

  useEffect(() => {
    if (isEdit) {
      axios.get<ProductFormInputs>(`/api/products/${id}`).then(res => {
        const data = res.data
        setValue('title', data.title)
        setValue('price', data.price)
        setValue('description', data.description)
        setValue('modules', data.modules || [])
      })
    }
  }, [id, isEdit, setValue])

  const onSubmit = async (data: ProductFormInputs) => {
    try {
      if (isEdit) {
        await axios.patch(`/api/products/${id}`, data)
      } else {
        await axios.post('/api/products', data)
      }
      toast.success('Продукт збережено!')
      navigate('/products')
    } catch {
      toast.error('Помилка')
    }
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">{isEdit ? 'Редагування' : 'Новий'} продукт</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        <Input
          label="Назва"
          placeholder="Введіть назву продукту"
          {...register('title', { required: 'Назва обов’язкова' })}
          error={errors.title?.message}
        />

        <Input
          label="Ціна"
          type="number"
          placeholder="0"
          {...register('price', { required: 'Ціна обов’язкова', min: { value: 0, message: 'Має бути >= 0' } })}
          error={errors.price?.message}
        />

        <Input
          label="Опис"
          placeholder="Короткий опис продукту"
          {...register('description')}
        />

        <div>
          <p className="mb-2 font-semibold">Модулі</p>
          <div className="flex flex-wrap gap-4">
            {modulesList.map(mod => (
              <Controller
                key={mod.value}
                name="modules"
                control={control}
                render={({ field }) => (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      value={mod.value}
                      checked={field.value.includes(mod.value)}
                      onChange={() => {
                        const newModules = field.value.includes(mod.value)
                          ? field.value.filter(v => v !== mod.value)
                          : [...field.value, mod.value]
                        field.onChange(newModules)
                      }}
                    />
                    {mod.label}
                  </label>
                )}
              />
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full py-4 text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600">
          {isEdit ? 'Зберегти' : 'Створити'}
        </Button>
      </form>
    </div>
  )
}

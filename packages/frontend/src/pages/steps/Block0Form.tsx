// packages/frontend/src/pages/demo/steps/Block0Form.tsx

import React from 'react'
import { useForm } from 'react-hook-form'
import { Button, Input, Label, Select, Textarea } from '@frontend/components/ui';
import { SelectContent, SelectItem, SelectTrigger, SelectValue } from '@frontend/components/ui/Select';

interface Block0FormData {
  businessName: string
  industry: string
  description: string
  targetAudience: string
  goals: string
}

interface Block0FormProps {
  onSubmit?: (data: Block0FormData) => void
  defaultValues?: Partial<Block0FormData>
}

const Block0Form: React.FC<Block0FormProps> = ({ onSubmit, defaultValues }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<Block0FormData>({
    defaultValues: {
      businessName: '',
      industry: '',
      description: '',
      targetAudience: '',
      goals: '',
      ...defaultValues,
    },
  })

  const handleFormSubmit = async (data: Block0FormData) => {
    console.log('Form submitted:', data)
    onSubmit?.(data)
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
      <h3 className="text-2xl font-bold mb-6">Блок 0: Основна інформація</h3>
      
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Business Name */}
        <div>
          <Label htmlFor="businessName" className="text-sm font-medium">
            Назва бізнесу *
          </Label>
          <Input
            id="businessName"
            {...register('businessName', {
              required: "Назва бізнесу обов'язкова",
              minLength: {
                value: 2,
                message: 'Мінімум 2 символи',
              },
            })}
            placeholder="Наприклад: Starway Studio"
            className="mt-1"
          />
          {errors.businessName && (
            <p className="text-red-500 text-sm mt-1">{errors.businessName.message}</p>
          )}
        </div>

        {/* Industry */}
        <div>
          <Label htmlFor="industry" className="text-sm font-medium">
            Індустрія *
          </Label>
          <Select
            onValueChange={(value) => setValue('industry', value)}
            defaultValue={defaultValues?.industry}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Оберіть індустрію" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="education">Освіта</SelectItem>
              <SelectItem value="ecommerce">E-commerce</SelectItem>
              <SelectItem value="saas">SaaS</SelectItem>
              <SelectItem value="consulting">Консалтинг</SelectItem>
              <SelectItem value="healthcare">Охорона здоров'я</SelectItem>
              <SelectItem value="finance">Фінанси</SelectItem>
              <SelectItem value="marketing">Маркетинг</SelectItem>
              <SelectItem value="other">Інше</SelectItem>
            </SelectContent>
          </Select>
          {errors.industry && (
            <p className="text-red-500 text-sm mt-1">{errors.industry.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description" className="text-sm font-medium">
            Опис бізнесу *
          </Label>
          <Textarea
            id="description"
            {...register('description', {
              required: "Опис обов'язковий",
              minLength: {
                value: 20,
                message: 'Мінімум 20 символів',
              },
            })}
            placeholder="Розкажіть про свій бізнес, що ви робите, які послуги/продукти пропонуєте..."
            className="mt-1 min-h-[100px]"
          />
          {errors.description && (
            <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
          )}
        </div>

        {/* Target Audience */}
        <div>
          <Label htmlFor="targetAudience" className="text-sm font-medium">
            Цільова аудиторія *
          </Label>
          <Textarea
            id="targetAudience"
            {...register('targetAudience', {
              required: "Цільова аудиторія обов'язкова",
              minLength: {
                value: 10,
                message: 'Мінімум 10 символів',
              },
            })}
            placeholder="Хто ваші клієнти? Опишіть демографію, інтереси, потреби..."
            className="mt-1 min-h-[80px]"
          />
          {errors.targetAudience && (
            <p className="text-red-500 text-sm mt-1">{errors.targetAudience.message}</p>
          )}
        </div>

        {/* Goals */}
        <div>
          <Label htmlFor="goals" className="text-sm font-medium">
            Цілі та очікування *
          </Label>
          <Textarea
            id="goals"
            {...register('goals', {
              required: "Цілі обов'язкові",
              minLength: {
                value: 10,
                message: 'Мінімум 10 символів',
              },
            })}
            placeholder="Що ви хочете досягти? Збільшення продажів, більше лідів, покращення бренду..."
            className="mt-1 min-h-[80px]"
          />
          {errors.goals && (
            <p className="text-red-500 text-sm mt-1">{errors.goals.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2"
          >
            {isSubmitting ? 'Збереження...' : 'Зберегти і продовжити'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default Block0Form
// features/products/hooks/useProductForm.ts
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

// Схема форми
export const productSchema = z.object({
  name: z.string().min(1, 'Назва обовʼязкова'),
  description: z.string().optional(),
  type: z.enum([
    'course', 'membership', 'coaching', 'digital_product', 'webinar',
    'ebook', 'mini_app', 'telegram_bot', 'service', 'physical_product', 'other'
  ]),
  price: z.number().nonnegative('Ціна не може бути відʼємною'),
  currency: z.enum(['UAH','EUR','USD']),
  includesTrial: z.boolean().default(false),
  trialDays: z.number().min(0).default(7),
  includesMentorship: z.boolean().default(false),
  format: z.enum(['web','mini_app','telegram_task','mixed']),
  integration: z.enum(['telegram','web','future']),
  status: z.enum(['draft','published','archived']),
  thumbnailUrl: z.string().url().optional(),
  modules: z.array(z.string()),
  resolvedModules: z.array(z.any()).optional(), 
})

// Тип форми на основі схеми
export type ProductFormInputs = z.infer<typeof productSchema>

// Хук форми
export const useProductForm = (product?: Partial<ProductFormInputs>) => {
  const defaultValues: ProductFormInputs = {
    name: product?.name ?? '',
    description: product?.description ?? '',
    type: product?.type ?? 'membership',
    price: product?.price ?? 0,
    currency: product?.currency ?? 'EUR',
    includesTrial: product?.includesTrial ?? false,
    trialDays: product?.trialDays ?? 7,
    includesMentorship: product?.includesMentorship ?? false,
    format: product?.format ?? 'mini_app',
    integration: product?.integration ?? 'telegram',
    status: product?.status ?? 'draft',
    thumbnailUrl: product?.thumbnailUrl ?? '',
    modules: product?.modules ?? [],
    resolvedModules: product?.resolvedModules ?? [], 
  }

  const methods = useForm<ProductFormInputs>({
    resolver: zodResolver(productSchema) as any, 
    defaultValues,
  })

  return methods
}

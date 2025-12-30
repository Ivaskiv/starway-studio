// packages/shared/src/hooks/useStepForm.ts

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

export const stepSchema = z.object({
  type: z.string().min(1, 'Тип обов\'язковий'),
  title: z.string().min(3, 'Назва має містити мінімум 3 символи'),
  description: z.string().optional(),
  order_index: z.number().int().min(0),
});

export type StepFormData = z.infer<typeof stepSchema>;

export function useStepForm(defaultValues?: Partial<StepFormData>) {
  return useForm<StepFormData>({
    // resolver: zodResolver(stepSchema),
    defaultValues: {
      order_index: 0,
      ...defaultValues,
    },
  });
}
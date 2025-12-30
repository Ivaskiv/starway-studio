// packages/shared/src/schemas/funnel.schemas.ts

import { z } from 'zod';
import { FunnelStatus, StepType } from '../types';

// Step config schemas
const messageConfigSchema = z.object({
  message: z.object({
    text: z.string().min(1, 'Текст повідомлення обов\'язковий'),
    buttons: z.array(z.object({
      id: z.string(),
      text: z.string(),
      action: z.enum(['next', 'url', 'callback', 'payment']),
      value: z.string().optional(),
      style: z.enum(['primary', 'secondary', 'danger']).optional()
    })).optional(),
    media: z.array(z.object({
      id: z.string(),
      type: z.enum(['image', 'video', 'document', 'audio']),
      url: z.string().url(),
      filename: z.string().optional(),
      size: z.number().optional()
    })).optional()
  })
});

const formConfigSchema = z.object({
  form: z.object({
    fields: z.array(z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(['text', 'email', 'tel', 'number', 'select', 'textarea', 'checkbox', 'radio', 'date']),
      label: z.string(),
      placeholder: z.string().optional(),
      required: z.boolean(),
      validation: z.object({
        min: z.number().optional(),
        max: z.number().optional(),
        pattern: z.string().optional(),
        errorMessage: z.string().optional()
      }).optional(),
      options: z.array(z.object({
        value: z.string(),
        label: z.string()
      })).optional(),
      defaultValue: z.any().optional()
    })).min(1, 'Форма має містити хоча б одне поле'),
    submitText: z.string().default('Відправити'),
    successMessage: z.string().optional()
  })
});

const paymentConfigSchema = z.object({
  payment: z.object({
    amount: z.number().positive('Сума має бути більше 0'),
    currency: z.string().length(3, 'Код валюти має бути 3 символи'),
    description: z.string().min(1, 'Опис обов\'язковий'),
    provider: z.enum(['wayforpay', 'stripe', 'liqpay', 'fondy']),
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional()
  })
});

const delayConfigSchema = z.object({
  delay: z.object({
    duration: z.number().positive('Тривалість має бути більше 0'),
    unit: z.enum(['minutes', 'hours', 'days'])
  })
});

const webhookConfigSchema = z.object({
  webhook: z.object({
    url: z.string().url('Невірний формат URL'),
    method: z.enum(['GET', 'POST', 'PUT']),
    headers: z.record(z.string()).optional(),
    body: z.any().optional()
  })
});

// Funnel step schema
export const funnelStepSchema = z.object({
  id: z.string().optional(),
  type: z.nativeEnum(StepType),
  name: z.string().min(1, 'Назва кроку обов\'язкова'),
  order: z.number().int().min(0),
  config: z.any(), 
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'not_equals', 'contains', 'greater', 'less', 'greater_or_equal', 'less_or_equal']),
    value: z.any(),
    nextStepId: z.string()
  })).optional(),
  nextStepId: z.string().optional(),
  isActive: z.boolean().default(true)
});

// Create funnel schema
export const createFunnelSchema = z.object({
  name: z.string().min(1, 'Назва воронки обов\'язкова').max(100),
  description: z.string().max(500).optional(),
  template: z.string().optional()
});

// Update funnel schema
export const updateFunnelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.nativeEnum(FunnelStatus).optional(),
  steps: z.array(funnelStepSchema).optional(),
  settings: z.object({
    domain: z.string().optional(),
    theme: z.object({
      primaryColor: z.string(),
      fontFamily: z.string()
    }).optional(),
    seo: z.object({
      title: z.string(),
      description: z.string(),
      keywords: z.array(z.string())
    }).optional(),
    integrations: z.object({
      googleAnalytics: z.string().optional(),
      facebookPixel: z.string().optional(),
      telegramBotToken: z.string().optional()
    }).optional()
  }).optional()
});

// Validate step config based on type
export const validateStepConfig = (type: StepType, config: any) => {
  switch (type) {
    case StepType.MESSAGE:
      return messageConfigSchema.parse({ message: config.message });
    case StepType.FORM:
      return formConfigSchema.parse({ form: config.form });
    case StepType.PAYMENT:
      return paymentConfigSchema.parse({ payment: config.payment });
    case StepType.DELAY:
      return delayConfigSchema.parse({ delay: config.delay });
    case StepType.WEBHOOK:
      return webhookConfigSchema.parse({ webhook: config.webhook });
    default:
      return config;
  }
};
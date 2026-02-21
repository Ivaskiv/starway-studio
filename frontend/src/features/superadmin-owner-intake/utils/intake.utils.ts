import type {
  OwnerIntakeFormValues,
  OwnerIntakeFunnelPayload,
  OwnerIntakeProductPayload,
} from '../types/intake.types';

export function makeProductCode(seed: string): string {
  const normalized = seed
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 36);

  const fallback = `product-${Math.random().toString(36).slice(2, 7)}`;
  return normalized || fallback;
}

function splitList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function toOwnerIntakeProductPayload(values: OwnerIntakeFormValues): OwnerIntakeProductPayload {
  return {
    ownerEmail: values.ownerEmail.trim().toLowerCase(),
    code: makeProductCode(values.productCode || values.productName),
    name: values.productName.trim(),
    description: values.productDescription.trim(),
    priceCents: 0,
    currency: 'EUR',
    features: {
      funnelGoal: values.funnelGoal.trim(),
      coreTask: values.coreTask.trim(),
      telegram: {
        botName: values.telegramBotName.trim(),
        // fix code_x: store only masked hint instead of raw bot token in product metadata.
        botTokenHint: values.telegramBotToken ? `${values.telegramBotToken.slice(0, 8)}***` : '',
        contact: values.telegramContact.trim(),
      },
      suggestedProducts: splitList(values.initialProducts),
    },
    limits: {
      mode: 'owner_builder',
    },
  };
}

export function toOwnerIntakeFunnelPayload(values: OwnerIntakeFormValues): OwnerIntakeFunnelPayload {
  const promptParts = [
    `Назва воронки: ${values.funnelName.trim()}`,
    `Мета: ${values.funnelGoal.trim()}`,
    `Основна задача: ${values.coreTask.trim()}`,
    `Бізнес: ${values.businessType.trim()}`,
    `ЦА: ${values.targetAudience.trim()}`,
    `Початкові продукти: ${values.initialProducts.trim()}`,
    `Telegram бот: ${values.telegramBotName.trim()} (${values.telegramContact.trim()})`,
  ].filter(Boolean);

  return {
    ownerEmail: values.ownerEmail.trim().toLowerCase(),
    userPrompt: promptParts.join('\n'),
    businessType: values.businessType.trim(),
    targetAudience: values.targetAudience.trim(),
  };
}

export const OWNER_INTAKE_DEFAULTS: OwnerIntakeFormValues = {
  ownerEmail: '',
  productCode: '',
  productName: '',
  productDescription: '',
  funnelName: '',
  funnelGoal: '',
  coreTask: '',
  businessType: '',
  targetAudience: '',
  telegramBotName: '',
  telegramBotToken: '',
  telegramContact: '',
  initialProducts: '',
};

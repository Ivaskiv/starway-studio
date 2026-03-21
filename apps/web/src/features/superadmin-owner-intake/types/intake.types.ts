export interface OwnerIntakeFormValues {
  ownerEmail: string;
  productCode: string;
  productName: string;
  productDescription: string;
  funnelName: string;
  funnelGoal: string;
  coreTask: string;
  businessType: string;
  targetAudience: string;
  telegramBotName: string;
  telegramBotToken: string;
  telegramContact: string;
  initialProducts: string;
}

export interface OwnerIntakeProductPayload {
  ownerEmail: string;
  code: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  features: {
    funnelGoal: string;
    coreTask: string;
    telegram: {
      botName: string;
      botTokenHint: string;
      contact: string;
    };
    suggestedProducts: string[];
  };
  limits: {
    mode: 'owner_builder';
  };
}

export interface OwnerIntakeFunnelPayload {
  ownerEmail: string;
  userPrompt: string;
  businessType: string;
  targetAudience: string;
}

export interface OwnerIntakeResult {
  productId?: string;
  funnelId?: string;
}

// packages/frontend/src/features/integrations/integrationsTypes.ts
import type { LucideIcon } from 'lucide-react';

// Тип інтеграцій
export type IntegrationType = 'telegram' | 'email' | 'payment' | 'landing';

// Статус інтеграції
export type IntegrationStatus = 'connected' | 'disconnected' | 'error';

// Опції для select-поля
export interface SelectOption {
  value: string;
  label: string;
}

// Типи полів для інтеграцій
export type FieldType = 'text' | 'password' | 'email' | 'url' | 'select';

// Опис поля конфігурації інтеграції
export interface IntegrationField {
  key: string;                     // ключ поля у config
  label: string;                   // лейбл
  type: FieldType;                 // тип input
  placeholder?: string;            // плейсхолдер
  options?: SelectOption[];        // якщо select
}

// Tailwind кольори для каналів
export type ChannelColor = 'cyan' | 'purple' | 'green' | 'blue';

// Опис конфігурації каналу
export interface ChannelConfig {
  icon: LucideIcon;                // Lucide icon
  color: ChannelColor;             // Tailwind color клас
  fields: IntegrationField[];      // поля налаштувань
}

// Конфігурація інтеграції користувача
export interface Integration {
  id: string;
  name: string;
  type: IntegrationType;
  status: IntegrationStatus;
  config: Record<string, string>; // ключі як у IntegrationField.key
}

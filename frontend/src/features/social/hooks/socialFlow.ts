// features/social/utils/socialFlow.ts
import type { SocialPlatform } from '../types/social.types';

export type SocialFlowMode = 'login' | 'connect';

export interface SocialFlowState {
  provider?: SocialPlatform;
  mode?: SocialFlowMode | string; // може прийти з query параметра
}

/**
 * Визначає соціальний флоу:
 * - 'connect' — приєднання соцмережі до існуючого акаунту
 * - 'login' — стандартний логін через соцмережу
 * 
 * @param state рядок, що може прийти з query параметра 'state'
 * @returns 'login' | 'connect'
 */
export const resolveSocialFlow = (state?: string): SocialFlowMode => {
  return state === 'connect' ? 'connect' : 'login';
};

/**
 * Допоміжна функція для парсингу query параметрів OAuth
 * @param queryParams URLSearchParams
 * @returns обʼєкт із provider та mode
 */
export const parseSocialFlow = (queryParams: URLSearchParams): SocialFlowState => {
  const providerParam = queryParams.get('provider');
  const stateParam = queryParams.get('state');

const provider: SocialPlatform | undefined = providerParam && SOCIAL_PLATFORMS.includes(providerParam as any)
  ? providerParam as SocialPlatform
  : undefined;

const mode = resolveSocialFlow(stateParam !== null ? stateParam : undefined);
  return { provider, mode };
};

// 🔹 якщо треба, експортуємо масив платформ для валідації
import { SOCIAL_PLATFORMS } from '../constants/social.constants';

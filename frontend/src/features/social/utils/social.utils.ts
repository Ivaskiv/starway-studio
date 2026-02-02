// frontend/src/features/social/utils/social.utils.ts
import { SOCIAL_PLATFORMS } from '../constants/social.constants';
import type { SocialPlatform } from '../types/social.types';

export type SocialFlowMode = 'login' | 'connect';

export interface SocialFlowState {
  provider?: SocialPlatform;
  mode?: SocialFlowMode;
}

/**
 * Визначає режим флоу за state-параметром
 */
export const resolveSocialFlow = (state?: string): SocialFlowMode => {
  return state === 'connect' ? 'connect' : 'login';
};

/**
 * Парсить query-параметри після OAuth-redirect
 */
export const parseSocialFlow = (queryParams: URLSearchParams): SocialFlowState => {
  const providerParam = queryParams.get('provider');
  const stateParam = queryParams.get('state'); // string | null

  const provider: SocialPlatform | undefined =
    providerParam && SOCIAL_PLATFORMS.includes(providerParam as SocialPlatform)
      ? (providerParam as SocialPlatform)
      : undefined;

  // Найпростіше виправлення типів
  const mode = resolveSocialFlow(stateParam ?? undefined);

  return { provider, mode };
};
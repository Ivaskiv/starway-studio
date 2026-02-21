// backend/src/types/types.ts

import { Product } from '@/modules/products/types.js';
import { SocialPlatform } from '@/modules/social/types.js';

// ======================= AUTH =======================

export type UserRole =  'admin' | 'user' | 'guest' | 'mentor' ;

export interface User {
  id: string;
  email?: string;
  passwordHash?: string;
  display_name?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  avatar?: string;
  isActive?: boolean;
  authProvider?: SocialPlatform;
  telegramId?: string;
  telegramUserName?: string;
  instagramId?: string;
  instagramUserName?: string;
  createdAt?: string;
  updatedAt?: string;
}


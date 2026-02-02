// /features/products/hooks/useProductAccess.ts
import { useAuth } from '@/features/auth/hooks/useAuth';
import type { Product } from '@/shared/types/product.types';

export const useProductAccess = () => {
  const { user } = useAuth();

  const hasAccessToPremium = (product: Product) => {
    if (!product.isPremium) return true;
    return user?.subscriptionsRole?.includes(product.creator.id) ?? false;
  };

  return { hasAccessToPremium };
};

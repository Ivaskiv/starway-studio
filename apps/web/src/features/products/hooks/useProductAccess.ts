import { useAuth } from '@/features/auth/hooks/useAuth';
import { Product } from '@/features/products/types/product.types';

type Enrollment = {
  productId: string;
  expiresAt?: string | null;
};

type Subscription = {
  productId?: string | null;
  expertId?: string | null;
  status: string;
  currentPeriodEnd?: string | null;
};

export const useProductAccess = () => {
  const { user } = useAuth();

  const hasAccess = (
    product: Product,
    enrollments: Enrollment[] = [],
    subscriptions: Subscription[] = []
  ) => {
    if (!user) return false;

    // 1. Безкоштовний продукт
    if (product.priceCents === 0) return true;

    const now = new Date();

    // 2. Активний enrollment
    const activeEnrollment = enrollments.find(e => {
      if (e.productId !== product.id) return false;
      if (!e.expiresAt) return true;
      return new Date(e.expiresAt) > now;
    });

    if (activeEnrollment) return true;

    // 3. Активна підписка на продукт
    const activeProductSub = subscriptions.find(s => {
      if (s.status !== 'ACTIVE') return false;
      if (s.productId !== product.id) return false;
      if (!s.currentPeriodEnd) return true;
      return new Date(s.currentPeriodEnd) > now;
    });

    if (activeProductSub) return true;

    // 4. Активна підписка на експерта
    const activeExpertSub = subscriptions.find(s => {
      if (s.status !== 'ACTIVE') return false;
      if (s.expertId !== product.expertId) return false;
      if (!s.currentPeriodEnd) return true;
      return new Date(s.currentPeriodEnd) > now;
    });

    if (activeExpertSub) return true;

    return false;
  };

  return { hasAccess };
};
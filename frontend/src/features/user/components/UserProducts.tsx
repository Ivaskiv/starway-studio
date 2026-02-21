// frontend/src/features/dashboard/blocks/user/UserProducts.tsx

import { useGetMyProductsQuery } from '@/features/products/services/products.api';
import { GlassCard } from '@/ui';
import { Package } from 'lucide-react';

export default function UserProducts() {
  const { data, isLoading } = useGetMyProductsQuery();
  const products = data ?? [];

  return (
    <GlassCard className="p-6">
      <h3 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
        <Package className="w-5 h-5 text-white/85" />
        Ваші продукти
      </h3>

      {isLoading ? (
        <p className="text-white/50 text-sm">Завантаження продуктів...</p>
      ) : products.length === 0 ? (
        <p className="text-white/50 text-sm">У вас ще немає активних продуктів.</p>
      ) : (
        <div className="space-y-2">
          {products.slice(0, 4).map((product) => (
            <div key={product.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-sm text-white font-medium">{product.title || product.name}</p>
              <p className="text-xs text-white/50 mt-0.5">
                {product.status} · {product.price} {product.currency}
              </p>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

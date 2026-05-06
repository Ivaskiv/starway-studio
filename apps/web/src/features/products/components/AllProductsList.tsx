// frontend/src/features/products/components/AllProductsList.tsx
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSystemState } from '@/features/auth/hooks/useSystemState';
import { useGetAllProductsQuery } from '@/features/products/services/products.api';
import { Product } from '@/features/products/types/product.types';
import { Button, GlassCard } from '@/ui';
import { Lock } from 'lucide-react';

export default function AllProductsList() {
  const { user } = useAuth();
  const { subscription, accessControl, trial } = useSystemState();
  const { data: products = [], isLoading } = useGetAllProductsQuery();
  const hasPaidAccess = Boolean(
    subscription?.isActive ||
    accessControl?.hasSubscription ||
    trial?.isActive
  );

  const hasAccessToPremium = (product: Product) => {
    const isPremium = product.price > 0;
    if (!isPremium) return true;
    return (
      hasPaidAccess ||
      user?.id === product.creatorId ||
      user?.role === 'SUPERADMIN' ||
      user?.role === 'ADMIN'
    );
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Усі курси</h1>
        <p className="text-white/60">
          Обирайте курси для розвитку. Безкоштовні доступні одразу, преміум — після підписки.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(product => {
          const hasAccess = hasAccessToPremium(product);
          const isOwner = user?.id === product.creatorId;

          return (
            <GlassCard
              key={product.id}
              className="p-0 overflow-hidden hover:scale-[1.02] transition-transform cursor-pointer relative"
            >
              <div className="h-40 bg-gradient-to-br from-orange-500/20 to-pink-500/20 flex items-center justify-center relative">
                {!hasAccess && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Lock className="w-12 h-12 text-white/60" />
                  </div>
                )}
                <div className="text-6xl opacity-20">📚</div>
                {product.price > 0 && (
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-xs font-semibold text-white">
                    Premium
                  </div>
                )}
              </div>

              <div className="p-5 space-y-3">
                <h3 className="text-xl font-bold text-white line-clamp-2">{product.title}</h3>
                <p className="text-white/60 text-sm line-clamp-2">{product.description}</p>

                <div className="flex items-center gap-2 text-sm text-white/60">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-pink-500" />
                  <span>{product.creatorId}</span>
                  {isOwner && (
                    <span className="ml-auto text-xs bg-white/10 px-2 py-0.5 rounded">Owner</span>
                  )}
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                  {hasAccess ? (
                    <Button className="w-full py-2 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold hover:opacity-90 transition-opacity">
                      {product.price === 0 ? 'Почати навчання' : 'Відкрити курс'}
                    </Button>
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-white">{product.price} ₴</span>
                      <Button className="px-6 py-2 rounded-lg bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors border border-white/20">
                        Підписатися
                      </Button>
                    </>
                  )}
                  {isOwner && (
                    <Button className="ml-2 px-3 py-1 text-xs">Редагувати</Button>
                  )}
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

// packages/frontend/src/pages/user/DashboardUser.tsx
import { Link } from 'react-router-dom';
import { useGetUserProductsQuery, useGetMyProductsQuery } from '@/services/products.api';
import { useGetMeQuery } from '@/services/auth.api';
import { GlassCard, Button } from '@/ui';
import { Boxes, Workflow } from 'lucide-react';

export default function DashboardUser() {
  // Публічні продукти
  const { data: publicProducts = [], isLoading: isLoadingPublic } = useGetUserProductsQuery();

  // Придбані продукти для авторизованого користувача
  const { data: myProducts = [], isLoading: isLoadingMine } = useGetMyProductsQuery();

  // Користувач
  const { data: meData } = useGetMeQuery();
  const user = meData?.user;

  const isLoading = isLoadingPublic || isLoadingMine;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      <h1 className="text-2xl font-bold text-white">Привіт, {user?.firstName || 'користувач'}!</h1>

      {/* Мої продукти */}
      {user && myProducts.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Мої курси</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {myProducts.map(product => (
              <Link key={product.id} to={`/products/${product.id}`}>
                <GlassCard className="p-6 group relative overflow-hidden" data-hover="lift">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                      <Boxes size={24} className="text-white" />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-white group-hover:text-orange-400 transition">{product.name}</h3>
                    <p className="text-sm text-slate-400 mb-4">{product.description}</p>
                    <Button className="text-sm">Відкрити</Button>
                  </div>
                </GlassCard>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Публічні продукти */}
      {publicProducts.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Публічні курси</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {publicProducts.map(product => (
              <Link key={product.id} to={`/products/${product.id}`}>
                <GlassCard className="p-6 group relative overflow-hidden" data-hover="lift">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                      <Workflow size={24} className="text-white" />
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-white group-hover:text-orange-400 transition">{product.name}</h3>
                    <p className="text-sm text-slate-400 mb-4">{product.description}</p>
                    <Button className="text-sm">Деталі</Button>
                  </div>
                </GlassCard>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Порожній стан */}
      {(!user || myProducts.length === 0) && publicProducts.length === 0 && (
        <div className="text-center text-slate-400 mt-20">
          Немає доступних курсів 😔
        </div>
      )}
    </div>
  );
}

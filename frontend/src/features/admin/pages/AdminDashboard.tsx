// frontend/src/features/admin/pages/AdminDashboard.tsx

import { AdminProduct, useGetAdminProductsQuery } from '@/features/admin/services/admin.api';
import { Button, GlassCard } from '@/ui';
import { Brain, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const { data: products, isLoading } = useGetAdminProductsQuery();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Мої продукти</h1>
        <p className="text-gray-400">Керуйте своїми AI-продуктами</p>
      </div>

      {/* Create Product Button */}
      <div className="max-w-7xl mx-auto mb-8">
        <Button
          onClick={() => navigate('/admin/products/create')}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Створити новий продукт
        </Button>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products?.map((product: AdminProduct) => (
          <GlassCard
            key={product.id}
            className="p-6 cursor-pointer hover:scale-105 transition-transform"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg">
                <Brain className="w-6 h-6 text-purple-400" />
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs ${
                  product.status === 'published'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}
              >
                {product.status === 'published' ? 'Опубліковано' : 'Чернетка'}
              </span>
            </div>

            <h3 className="text-xl font-semibold text-white mb-2">{product.branding.name}</h3>
            <p className="text-gray-400 text-sm mb-4 line-clamp-2">
              {product.branding.description}
            </p>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="text-gray-400">👥 {product.total_users}</span>
                <span className="text-green-400">💰 {product.revenue}€</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/admin/products/${product.id}/edit`)}
                className="w-full"
              >
                Редагувати
              </Button>
            </div>
          </GlassCard>
        ))}

        {/* Empty State */}
        {products?.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Brain className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">У вас ще немає продуктів</p>
            <Button onClick={() => navigate('/admin/products/create')}>
              Створити перший продукт
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

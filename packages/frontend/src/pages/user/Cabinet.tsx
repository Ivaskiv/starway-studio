// src/pages/user/Cabinet.tsx
import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { CabinetResponse } from '@starway/shared/src/types/api';

export default function Cabinet() {
  const [data, setData] = useState<CabinetResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cabinet', { credentials: 'include' })
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8">Завантаження...</div>;
  if (!data) return <Navigate to="/login" />;

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">
        Вітаємо, {data.user.name || 'Користувач'}! 👋
      </h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Мої курси</h2>
        <div className="grid gap-4">
          {data.products.map(p => (
            <div key={p.id} className="border rounded-lg p-4">
              <h3 className="font-medium">{p.title}</h3>
              {p.is_active ? (
                <>
                  <div className="mt-2 bg-gray-200 rounded h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded"
                      style={{ width: `${p.progress}%` }}
                    />
                  </div>
                  <p className="text-sm mt-1">{p.progress}% завершено</p>
                  <a 
                    href={`/course/${p.slug}`}
                    className="mt-2 inline-block text-blue-600"
                  >
                    Продовжити →
                  </a>
                </>
              ) : (
                <a 
                  href={p.payment_url || '#'}
                  className="mt-2 inline-block bg-blue-500 text-white px-4 py-2 rounded"
                >
                  Купити
                </a>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Інструменти</h2>
        <div className="grid grid-cols-2 gap-4">
          {data.miniapps.map(m => (
            <div key={m.id} className="border rounded-lg p-4">
              {m.icon_url && <img src={m.icon_url} alt="" className="w-12 h-12 mb-2" />}
              <h3 className="font-medium">{m.title}</h3>
              {m.status === 'active' ? (
                <a 
                  href={m.url}
                  className="mt-2 inline-block text-blue-600"
                >
                  Відкрити →
                </a>
              ) : (
                <button className="mt-2 text-gray-400">
                  🔒 Заблоковано
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
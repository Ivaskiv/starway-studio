// src/pages/Home.tsx
import { useAuthStore } from '../../store/auth';

export default function Home() {
  const { user } = useAuthStore();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Ласкаво просимо на Starway</h1>
      {!user ? (
        <div className="space-x-4">
          <a href="/login" className="btn btn-primary">Увійти</a>
          <a href="/register" className="btn btn-secondary">Зареєструватися</a>
        </div>
      ) : user.role === 'super_admin' || user.role === 'admin' ? (
        <a href="/admin" className="btn btn-primary">Перейти в адмінку</a>
      ) : (
        <a href="/profile" className="btn btn-primary">Перейти в профіль</a>
      )}
    </div>
  );
}

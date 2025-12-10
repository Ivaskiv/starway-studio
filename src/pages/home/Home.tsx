// src/pages/Home.tsx — ОСТАТОЧНА ВЕРСІЯ, 100% ПРАЦЮЄ
import { useStore } from '@/store'

export default function Home() {
  const { user } = useStore()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 text-white">
      <div className="text-center p-10 bg-black/30 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/10">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-400 to-orange-400 bg-clip-text text-transparent">
          Starway
        </h1>
        <p className="text-xl mb-4 mb-10 text-gray-300">
          Найкращий AI-конструктор воронок в Україні
        </p>

        {!user ? (
          <div className="space-x-6">
            <a
              href="/login"
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl font-bold text-lg hover:scale-105 transition"
            >
              Увійти
            </a>
            <a
              href="/register"
              className="px-8 py-4 bg-gradient-to-r from-orange-600 to-pink-600 rounded-xl font-bold text-lg hover:scale-105 transition"
            >
              Зареєструватися
            </a>
          </div>
        ) : user.role === 'super_admin' || user.role === 'admin' ? (
          <a
            href="/admin"
            className="px-12 py-5 bg-gradient-to-r from-indigo-600 to-orange-600 rounded-2xl font-bold text-2xl hover:scale-110 transition shadow-2xl"
          >
            Перейти в адмінку
          </a>
        ) : (
          <a
            href="/profile"
            className="px-12 py-5 bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl font-bold text-2xl hover:scale-110 transition shadow-2xl"
          >
            Перейти в профіль
          </a>
        )}
      </div>
    </div>
  )
}
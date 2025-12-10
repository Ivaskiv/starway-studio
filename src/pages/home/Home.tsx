// src/pages/Home.tsx
import { useStore } from '@/store'

export default function Home() {
  const { user } = useStore()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center p-8">
      <div className="text-center max-w-4xl">
        <h1 className="text-6xl md:text-8xl font-bold mb-6 bg-gradient-to-r from-indigo-400 to-orange-400 bg-clip-text text-transparent">
          Starway
        </h1>
        <p className="text-2xl md:text-4xl text-gray-300 mb-12">
          Найкращий AI-конструктор воронок в Україні
        </p>

        <div className="space-x-6">
          {!user ? (
            <>
              <a
                href="/login"
                className="inline-block px-12 py-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl font-bold text-2xl hover:scale-110 transition shadow-2xl"
              >
                Увійти
              </a>
              <a
                href="/register"
                className="inline-block px-12 py-6 bg-gradient-to-r from-orange-600 to-pink-600 rounded-2xl font-bold text-2xl hover:scale-110 transition shadow-2xl"
              >
                Зареєструватися
              </a>
            </>
          ) : user.role === 'super_admin' || user.role === 'admin' ? (
            <a
              href="/admin"
              className="inline-block px-16 py- py-8 bg-gradient-to-r from-indigo-600 to-orange-600 rounded-3xl font-bold text-3xl hover:scale-110 transition shadow-2xl"
            >
              В адмінку
            </a>
          ) : (
            <a
              href="/profile"
              className="inline-block px-16 py-8 bg-gradient-to-r from-green-600 to-teal-600 rounded-3xl font-bold text-3xl hover:scale-110 transition shadow-2xl"
            >
              В профіль
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
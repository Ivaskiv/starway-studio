// packages/frontend/src/pages/AuthPage.tsx

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../store/store';
import { signUp, signIn } from '../store/auth/authOperations';
import { clearError } from '../store/auth/authSlice';
import { selectIsLoggedIn, selectUser, selectAuthError } from '../store/auth/authSelectors';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();

  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const user = useAppSelector(selectUser);
  const error = useAppSelector(selectAuthError);

  const from = (location.state as any)?.from?.pathname || '/admin';

  // Показуємо помилку
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  // Редірект після успішного входу
  useEffect(() => {
    if (isLoggedIn && user) {
      const isFirstUser = user.role === 'super_admin';
      
      toast.success(
        mode === 'login'
          ? `Привіт, ${user.name}! 👋`
          : isFirstUser
          ? `🎉 Вітаємо, ${user.name}! Ти тепер Super Admin!`
          : `🎉 Вітаємо, ${user.name}! Акаунт створено!`,
        { duration: 5000 }
      );

      setTimeout(() => {
        navigate(from, { replace: true });
      }, 1000);
    }
  }, [isLoggedIn, user, mode, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'login') {
      dispatch(signIn({
        email: formData.email,
        password: formData.password,
      }));
    } else {
      dispatch(signUp({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 flex items-center justify-center p-4">
      
      <button
        onClick={() => navigate('/')}
        className="fixed top-6 left-6 flex items-center gap-2 text-gray-400 hover:text-white transition z-50"
      >
        <ArrowLeft size={20} />
        <span>На головну</span>
      </button>

      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-pink-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-10 h-10 text-purple-500" />
            <h1 className="text-3xl font-bold text-white">STARWAY STUDIO</h1>
          </div>
          <p className="text-gray-400">
            {mode === 'register' 
              ? 'Створи свій перший AI-конструктор' 
              : 'Увійди до панелі керування'}
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-2 rounded-lg font-medium transition ${
                mode === 'register'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              Реєстрація
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg font-medium transition ${
                mode === 'login'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              Вхід
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Ім'я</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Надя"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="nadya@example.com"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Пароль</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                required
                minLength={8}
              />
              {mode === 'register' && (
                <p className="text-xs text-gray-500 mt-2">Мінімум 8 символів</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-purple-500/50 transition"
            >
              {mode === 'register' ? 'Створити акаунт' : 'Увійти'}
            </button>
          </form>
        </div>

        {mode === 'register' && (
          <div className="mt-6 bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
            <p className="text-purple-300 text-sm">
              🎉 Перший користувач стає <strong>Super Admin</strong> автоматично!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
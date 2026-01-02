// packages/frontend/src/pages/user/AuthPage.tsx

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, ArrowLeft, Zap, User, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '@frontend/store/hooks';
import { signUp, signIn } from '@frontend/store/auth/authOperations';
import { selectIsLoggedIn, selectUser, selectAuthError } from '@frontend/store/auth/authSelectors';
import { clearError } from '@frontend/store/auth/authSlice';
import { Button, Input } from '@starway/shared/ui';

type UserType = 'funnel_admin' | 'user' | 'guest';

const userTypeInfo = {
  funnel_admin: { 
    icon: Zap, 
    title: 'Власник AI-воронок',
    gradient: 'bg-gradient-orange'
  },
  user: { 
    icon: User, 
    title: 'Користувач',
    gradient: 'bg-gradient-green'
  },
  guest: { 
    icon: Eye, 
    title: 'Гість',
    gradient: 'bg-gradient-blue'
  }
};

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [selectedUserType, setSelectedUserType] = useState<UserType>('funnel_admin');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const user = useAppSelector(selectUser);
  const error = useAppSelector(selectAuthError);

  useEffect(() => {
    const source = searchParams.get('source');
    if (source) {
      toast.success(`Привіт з ${source}! 👋`, { duration: 5000 });
      setMode('register');
    }
  }, [searchParams]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (isLoggedIn && user) {
      toast.success(`Привіт, ${user.firstName}! 👋`);
      setTimeout(() => navigate('/dashboard'), 1000);
    }
  }, [isLoggedIn, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'login') {
      dispatch(signIn({ email: formData.email, password: formData.password }));
    } else {
      if (selectedUserType === 'guest') {
        navigate('/');
        return;
      }
      const [firstName, ...rest] = formData.firstName.split(' ');
      await dispatch(signUp({
        firstName,
        lastName: rest.join(' ') || formData.lastName,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.password,
      }));
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" 
             style={{ animationDuration: '4s' }} />
        <div className="absolute -bottom-1/4 -left-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-pulse" 
             style={{ animationDuration: '5s', animationDelay: '1s' }} />
      </div>

      <Button onClick={() => navigate('/')} variant="ghost" className="glass-button fixed top-6 left-6 z-50">
        <ArrowLeft size={20} />
        <span>На головну</span>
      </Button>

      <div className="relative z-10 w-full max-w-4xl">
        
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-orange mb-4 shadow-lg shadow-orange-500/50">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-2">STARWAY STUDIO</h1>
          <p className="text-gray-400 text-lg">
            {mode === 'register' ? 'Створи свою AI-екосистему' : 'Увійди до панелі керування'}
          </p>
        </div>

        {/* User Type Selection */}
        {mode === 'register' && (
          <div className="mb-6 grid grid-cols-3 gap-4 animate-slide-up">
            {(Object.keys(userTypeInfo) as UserType[]).map((type) => {
              const { icon: Icon, title, gradient } = userTypeInfo[type];
              const isSelected = selectedUserType === type;
              return (
                <Button
                  key={type}
                  onClick={() => setSelectedUserType(type)}
                  variant="ghost"
                  className={`glass-card p-6 group h-auto flex-col ${isSelected ? 'ring-2 ring-orange-500' : ''}`}
                >
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl ${gradient} flex items-center justify-center shadow-lg ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <p className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                    {title}
                  </p>
                </Button>
              );
            })}
          </div>
        )}

        {/* Main Form Card */}
        <div className="glass-card p-8 animate-scale-in">
          
          {/* Toggle */}
          <div className="flex gap-3 mb-8">
            <Button onClick={() => setMode('register')} variant={mode === 'register' ? 'primary' : 'ghost'} size="lg" className={mode === 'register' ? 'gradient-button flex-1' : 'glass-button flex-1'}>
              Реєстрація
            </Button>
            <Button onClick={() => setMode('login')} variant={mode === 'login' ? 'primary' : 'ghost'} size="lg" className={mode === 'login' ? 'gradient-button flex-1' : 'glass-button flex-1'}>
              Вхід
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {mode === 'register' && selectedUserType !== 'guest' && (
              <div className="grid grid-cols-2 gap-4">
                <Input type="text" placeholder="Ім'я" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="glass-input" required />
                <Input type="text" placeholder="Прізвище" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="glass-input" required />
              </div>
            )}

            {selectedUserType !== 'guest' && (
              <>
                <Input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="glass-input" required />
                <Input type="password" placeholder="Пароль" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="glass-input" required minLength={8} />
                {mode === 'register' && <p className="text-xs text-gray-500 mt-2">Мінімум 8 символів</p>}
              </>
            )}

            <Button type="submit" variant="primary" size="lg" className="gradient-button w-full">
              {mode === 'register' ? selectedUserType === 'guest' ? '👁️ Увійти як гість' : '✨ Створити акаунт' : '🚀 Увійти'}
            </Button>
          </form>
        </div>

        {/* Info hint */}
        {mode === 'register' && (
          <div className="glass-card p-4 mt-6 text-center animate-fade-in">
            <p className="text-gray-400 text-sm">
              💡 {selectedUserType === 'funnel_admin' ? 'Створюй необмежену кількість AI-воронок' : selectedUserType === 'user' ? 'Доступ до всіх воронок та AI Mentor' : 'Перегляд демо без реєстрації'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
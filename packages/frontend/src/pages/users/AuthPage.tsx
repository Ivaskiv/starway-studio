// packages/frontend/src/pages/user/AuthPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, ArrowLeft, Zap, User, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSignUpMutation, useSignInMutation } from '@/services/auth.api';
import Button from '@/ui/Button';
import Input from '@/ui/Input';

type UserType = 'funnel_admin' | 'user' | 'guest';

const userTypeInfo = {
  funnel_admin: { 
    icon: Zap, 
    title: 'Власник AI-воронок',
    gradient: 'bg-gradient-to-br from-orange-500 to-red-500'
  },
  user: { 
    icon: User, 
    title: 'Користувач',
    gradient: 'bg-gradient-to-br from-green-500 to-emerald-500'
  },
  guest: { 
    icon: Eye, 
    title: 'Гість',
    gradient: 'bg-gradient-to-br from-blue-500 to-cyan-500'
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
  const [signUp, { isLoading: isSignUpLoading }] = useSignUpMutation();
  const [signIn, { isLoading: isSignInLoading }] = useSignInMutation();

  useEffect(() => {
    const source = searchParams.get('source');
    if (source) {
      toast.success(`Привіт з ${source}! 👋`, { duration: 5000 });
      setMode('register');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (mode === 'login') {
        const result = await signIn({ 
          email: formData.email, 
          password: formData.password 
        }).unwrap();
        
        toast.success(`Привіт, ${result.user.firstName}! 👋`);
        setTimeout(() => navigate('/dashboard'), 1000);
      } else {
        if (selectedUserType === 'guest') {
          navigate('/');
          return;
        }
        
        const result = await signUp({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
        }).unwrap();
        
        toast.success(`Привіт, ${result.user.firstName}! 👋`);
        setTimeout(() => navigate('/dashboard'), 1000);
      }
    } catch (error: any) {
      toast.error(error.data?.message || 'Помилка авторизації');
    }
  };

  const isLoading = isSignUpLoading || isSignInLoading;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" 
             style={{ animationDuration: '4s' }} />
        <div className="absolute -bottom-1/4 -left-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-pulse" 
             style={{ animationDuration: '5s', animationDelay: '1s' }} />
      </div>

      <Button 
        onClick={() => navigate('/')} 
        className="fixed top-6 left-6 z-50 glass-card px-4 py-2 flex items-center gap-2 hover:bg-white/20"
      >
        <ArrowLeft size={20} />
        <span>На головну</span>
      </Button>

      <div className="relative z-10 w-full max-w-4xl">
        
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 mb-4 shadow-lg shadow-orange-500/50">
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
                  className={`glass-card p-6 group h-auto flex flex-col items-center ${isSelected ? 'ring-2 ring-orange-500' : ''}`}
                >
                  <div className={`w-16 h-16 mb-4 rounded-2xl ${gradient} flex items-center justify-center shadow-lg transition-transform ${isSelected ? 'scale-110' : 'group-hover:scale-105'}`}>
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
            <Button 
              onClick={() => setMode('register')} 
              data-color="orange"
              size="lg"
              className={`flex-1 ${mode === 'register' ? '' : 'opacity-50'}`}
            >
              Реєстрація
            </Button>
            <Button 
              onClick={() => setMode('login')}
              data-color="orange"
              size="lg"
              className={`flex-1 ${mode === 'login' ? '' : 'opacity-50'}`}
            >
              Вхід
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {mode === 'register' && selectedUserType !== 'guest' && (
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  type="text" 
                  placeholder="Ім'я" 
                  value={formData.firstName} 
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} 
                  required 
                />
                <Input 
                  type="text" 
                  placeholder="Прізвище" 
                  value={formData.lastName} 
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} 
                  required 
                />
              </div>
            )}

            {selectedUserType !== 'guest' && (
              <>
                <Input 
                  type="email" 
                  placeholder="Email" 
                  value={formData.email} 
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                  required 
                />
                <Input 
                  type="password" 
                  placeholder="Пароль" 
                  value={formData.password} 
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
                  required 
                  minLength={8} 
                />
                {mode === 'register' && <p className="text-xs text-gray-500">Мінімум 8 символів</p>}
              </>
            )}

            <Button 
              type="submit" 
              data-color="orange"
              size="lg"
              className="w-full"
              isLoading={isLoading}
              disabled={isLoading}
            >
              {isLoading ? 'Завантаження...' : 
               mode === 'register' ? 
                 selectedUserType === 'guest' ? '👁️ Увійти як гість' : '✨ Створити акаунт' 
               : '🚀 Увійти'}
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
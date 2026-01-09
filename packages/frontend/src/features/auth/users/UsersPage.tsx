// packages/frontend/src/pages/user/UsersPage.tsx
import { useGetMeQuery } from '@/features/auth/services/auth.api';
import { Button, GlassCard, Input } from '@/ui';
import {
  Award,
  Calendar,
  Camera,
  Clock,
  Edit2,
  Mail,
  MapPin,
  Phone,
  Save,
  Shield,
  TrendingUp,
  User,
  X,
  Zap
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const { data: userData, isLoading } = useGetMeQuery();
  const user = userData?.user;

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
    location: '',
    bio: '',
  });

  const handleSave = async () => {
    try {
      // TODO: Implement update user API
      toast.success('Профіль оновлено!');
      setIsEditing(false);
    } catch (error) {
      toast.error('Помилка оновлення профілю');
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: '',
      location: '',
      bio: '',
    });
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <GlassCard className="p-12" data-blur="xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
          <p className="text-white/60">Завантаження профілю...</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Мій профіль</h1>
          <p className="text-sm md:text-base text-slate-400">Керуйте своїми особистими даними</p>
        </div>

        {!isEditing ? (
          <Button
            onClick={() => setIsEditing(true)}
            data-color="orange"
            data-size="md"
            className="group"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Редагувати
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={handleCancel}
              data-variant="ghost"
              data-size="md"
            >
              <X className="w-4 h-4 mr-2" />
              Скасувати
            </Button>
            <Button
              onClick={handleSave}
              data-color="green"
              data-size="md"
            >
              <Save className="w-4 h-4 mr-2" />
              Зберегти
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Avatar & Basic Info */}
          <GlassCard className="p-6 text-center" data-hover="lift">
            <div className="relative inline-block mb-4">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-3xl md:text-4xl font-bold shadow-2xl">
                {user?.firstName?.charAt(0).toUpperCase()}
              </div>
              
              {isEditing && (
                <Button className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                  <Camera className="w-5 h-5 text-white" />
                </Button>
              )}
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-sm text-slate-400 mb-4">{user?.email}</p>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30">
              <Shield className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold text-orange-300">
                {user?.role === 'super_admin' ? 'Super Admin' : 
                 user?.role === 'funnel_admin' ? 'Funnel Admin' : 'User'}
              </span>
            </div>
          </GlassCard>

          {/* Stats */}
          <GlassCard className="p-6" data-hover="lift">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-400" />
              Статистика
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Воронок</p>
                    <p className="text-lg font-bold text-white">0</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
                    <Award className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Продуктів</p>
                    <p className="text-lg font-bold text-white">0</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">На платформі</p>
                    <p className="text-lg font-bold text-white">
                      {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('uk-UA', { 
                        month: 'short', 
                        year: 'numeric' 
                      }) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right Column - Profile Details */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6 md:p-8" data-hover="lift">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <User className="w-5 h-5 text-orange-400" />
              Особиста інформація
            </h3>

            <div className="space-y-6">
              
              {/* First Name & Last Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Ім'я
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="glass-field"
                      placeholder="Введіть ім'я"
                    />
                  ) : (
                    <div className="glass-field flex items-center gap-3">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-white">{user?.firstName || 'Не вказано'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">
                    Прізвище
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="glass-field"
                      placeholder="Введіть прізвище"
                    />
                  ) : (
                    <div className="glass-field flex items-center gap-3">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-white">{user?.lastName || 'Не вказано'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Email
                </label>
                <div className="glass-field flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="text-white">{user?.email}</span>
                  <span className="ml-auto px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold">
                    Підтверджено
                  </span>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Телефон
                </label>
                {isEditing ? (
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="glass-field"
                    placeholder="+380 XX XXX XX XX"
                    type="tel"
                  />
                ) : (
                  <div className="glass-field flex items-center gap-3">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="text-white">{formData.phone || 'Не вказано'}</span>
                  </div>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Місцезнаходження
                </label>
                {isEditing ? (
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="glass-field"
                    placeholder="Київ, Україна"
                  />
                ) : (
                  <div className="glass-field flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-white">{formData.location || 'Не вказано'}</span>
                  </div>
                )}
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Про себе
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="glass-field min-h-[100px] resize-none"
                    placeholder="Розкажіть про себе..."
                  />
                ) : (
                  <div className="glass-field min-h-[100px]">
                    <p className="text-white">
                      {formData.bio || 'Не вказано'}
                    </p>
                  </div>
                )}
              </div>

              {/* Member Since */}
              <div className="pt-6 border-t border-white/10">
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <Calendar className="w-4 h-4" />
                  <span>
                    Учасник з {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('uk-UA', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    }) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
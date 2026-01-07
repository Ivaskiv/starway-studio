// packages/frontend/src/pages/dashboard/Settings.tsx
import { useTheme } from '@/contexts/ThemeContext';
// import { ThemeSelector } from '@/ui/ThemeSelector';
import GlassCard from '@/ui/GlassCard';
import { Settings as SettingsIcon } from 'lucide-react';

const SettingsPage = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-text-primary">Налаштування</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Theme Selector */}
        <GlassCard className="p-6">
          <h3 className="text-xl font-semibold mb-4">Тема оформлення</h3>
          {/* <ThemeSelector value={theme} onChange={setTheme} /> */}
        </GlassCard>

        {/* Other Settings */}
        <GlassCard className="p-12 flex items-center justify-center">
          <div className="text-center">
            <SettingsIcon className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              Інші налаштування
            </h3>
            <p className="text-text-muted">
              Скоро тут з'являться додаткові опції
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default SettingsPage;
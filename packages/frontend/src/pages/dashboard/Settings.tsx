// packages/frontend/src/pages/dashboard/Settings.tsx

import { GlassCard, ThemeSelector } from '@starway-studio/shared';
import { useTheme } from '@frontend/contexts/ThemeContext';
import { Settings as SettingsIcon } from 'lucide-react';

const Settings = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-text-primary">Налаштування</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Theme Selector */}
        <ThemeSelector currentTheme={theme} onThemeChange={setTheme} />

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

export default Settings;
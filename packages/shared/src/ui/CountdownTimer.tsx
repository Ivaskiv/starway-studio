// packages/shared/src/ui/CountdownTimer.tsx

import { useEffect, useState } from 'react';
import { GlassCard } from './GlassCard';

interface CountdownTimerProps {
  targetDate: Date;
  title?: string;
}

export const CountdownTimer = ({ targetDate, title }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance < 0) {
        clearInterval(interval);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <GlassCard className="p-6 animate-fade-in" gradient>
      {title && (
        <h3 className="text-white text-sm font-medium mb-4 text-center">
          {title}
        </h3>
      )}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(timeLeft).map(([key, value]) => (
          <div key={key} className="text-center">
            <div className="text-4xl font-bold text-white mb-1">
              {String(value).padStart(2, '0')}
            </div>
            <div className="text-xs text-white/60 font-medium uppercase tracking-wider">
              {key === 'days' ? 'днів' : 
               key === 'hours' ? 'годин' : 
               key === 'minutes' ? 'хвилин' : 'секунд'}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
};
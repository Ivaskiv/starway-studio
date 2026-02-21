// frontend/src/features/consultation/components/TriggerAlert.tsx
/**
 * TriggerAlert - Show consultation trigger
 */

import { GlassCard, Button } from '@/ui';
import { AlertCircle, Calendar } from 'lucide-react';
import { ConsultationTrigger } from '../types/types';

interface TriggerAlertProps {
  trigger: ConsultationTrigger;
  onBook: () => void;
}

export function TriggerAlert({ trigger, onBook }: TriggerAlertProps) {
  const getSeverityColor = () => {
    switch (trigger.severity) {
      case 'high': return 'from-red-500 to-orange-500';
      case 'medium': return 'from-orange-500 to-yellow-500';
      case 'low': return 'from-yellow-500 to-green-500';
    }
  };

  return (
    <GlassCard className={`p-6 border-2 bg-gradient-to-r ${getSeverityColor()}/20 border-${trigger.severity === 'high' ? 'red' : 'orange'}-500/50`}>
      <div className="flex items-start gap-4">
        <AlertCircle className={`w-8 h-8 flex-shrink-0 ${
          trigger.severity === 'high' ? 'text-red-400' : 'text-orange-400'
        }`} />
        
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white mb-2">
            Рекомендуємо консультацію
          </h3>
          <p className="text-white/90 mb-4">
            {trigger.reason}
          </p>
          
          <div className="flex items-center gap-2 text-white/70 text-sm mb-4">
            <Calendar className="w-4 h-4" />
            <span>Патерн триває {trigger.patternDays} днів</span>
          </div>

          <Button
            onClick={onBook}
            className="bg-white text-purple-900 hover:bg-white/90"
          >
            Записатися на консультацію
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}
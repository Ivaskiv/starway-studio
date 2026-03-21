// frontend/src/features/consultation/components/ConsultationCalendar.tsx
/**
 * ConsultationCalendar - FIXED
 */

import { useGetMyConsultationsQuery } from '../services/consultation.api';
import { GlassCard } from '@/ui';
import { Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';

export function ConsultationCalendar() {
  const { data: consultations, isLoading } = useGetMyConsultationsQuery();

  if (isLoading) {
    return <div className="text-white">Завантаження...</div>;
  }

  if (!consultations || consultations.length === 0) {
    return (
      <GlassCard className="p-6 text-center">
        <Calendar className="w-12 h-12 mx-auto mb-3 text-white/30" />
        <p className="text-white/70">Немає заброньованих консультацій</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {consultations.map((consultation) => (
        <GlassCard key={consultation.id} className="p-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
              {consultation.status === 'COMPLETED' && (
                <CheckCircle className="w-6 h-6 text-green-400" />
              )}
              {consultation.status === 'PENDING' && (
                <Clock className="w-6 h-6 text-yellow-400" />
              )}
              {consultation.status === 'CANCELLED' && (
                <XCircle className="w-6 h-6 text-red-400" />
              )}
              {consultation.status === 'CONFIRMED' && (
                <CheckCircle className="w-6 h-6 text-purple-400" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-white">Консультація</h4>
                <span className={`text-xs px-2 py-1 rounded ${
                  consultation.status === 'COMPLETED' ? 'bg-green-500/20 text-green-300' :
                  consultation.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-300' :
                  consultation.status === 'CONFIRMED' ? 'bg-purple-500/20 text-purple-300' :
                  'bg-red-500/20 text-red-300'
                }`}>
                  {consultation.status}
                </span>
              </div>

              <div className="text-white/70 text-sm mb-2">
                📅 {new Date(consultation.scheduledAt).toLocaleString('uk-UA')}
              </div>

              {consultation.triggerReason && (
                <div className="text-white/60 text-sm">
                  💡 {consultation.triggerReason}
                </div>
              )}

              {consultation.notes && (
                <div className="mt-2 p-2 bg-white/5 rounded text-white/80 text-sm">
                  {consultation.notes}
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}
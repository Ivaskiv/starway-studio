// frontend/src/features/ai-mentor/components/MentorLocked.tsx
/**
 * MentorLocked - No access state
 */

import { Button, GlassCard } from '@/ui';
import { Lock, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MentorLocked() {
  const navigate = useNavigate();

  return (
    <GlassCard className="p-12 text-center">
      <Lock className="w-16 h-16 mx-auto mb-4 text-white/30" />
      <h2 className="text-2xl font-bold text-white mb-3">
        AI-Ментор недоступний
      </h2>
      <p className="text-white/70 mb-6 max-w-md mx-auto">
        Почни безкоштовний 7-денний trial або оформи підписку
      </p>

      <div className="flex gap-4 justify-center">
        <Button
          onClick={() => navigate('/subscription')}
          className="bg-gradient-to-r from-purple-500 to-pink-500"
        >
          <Zap className="w-4 h-4 mr-2" />
          Почати Trial
        </Button>
      </div>
    </GlassCard>
  );
}
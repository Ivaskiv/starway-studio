// frontend/src/features/consultation/components/BookingButton.tsx
/**
 * BookingButton - ПРАВИЛЬНО
 */

import { useState } from 'react';
import { useBookConsultationMutation } from '../services/consultation.api'; 
import { Button } from '@/ui';
import { toast } from 'react-hot-toast';

interface BookingButtonProps {
  triggerReason: string;
  onSuccess?: () => void;
}

export function BookingButton({ triggerReason, onSuccess }: BookingButtonProps) {
  const [scheduledAt, setScheduledAt] = useState('');
  
  // ✅ RTK Query mutation hook (робить HTTP POST до backend)
  const [bookConsultation, { isLoading }] = useBookConsultationMutation();

  const handleBook = async () => {
    if (!scheduledAt) {
      toast.error('Обери дату та час');
      return;
    }

    try {
      // ✅ HTTP POST до /api/consultation/book
      await bookConsultation({
        scheduledAt,
        triggerReason
      }).unwrap();

      toast.success('Консультація заброньована!');
      onSuccess?.();
    } catch (error) {
      toast.error('Помилка бронювання');
    }
  };

  return (
    <Button onClick={handleBook} disabled={isLoading}>
      {isLoading ? 'Бронювання...' : 'Підтвердити'}
    </Button>
  );
}

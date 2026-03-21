// frontend/src/features/zoom/hooks/useZoom.ts
// Хук: агрегує дані сесій, fallback до моків, форматування дат
// Приклад: const { upcoming, history, register, formatDate } = useZoom()

import { useMemo } from 'react';
import {
  MOCK_SESSIONS,
  useGetMySessionsQuery,
  useRegisterAttendeeMutation,
} from '../services/zoom.api';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';
import type { ZoomSessionWithAttendance } from '../types/zoom.types';

export function useZoom() {
  const { user } = useAuth();
  const { openAuthModal } = useSmartNavigation();
  const { data, isLoading, isError } = useGetMySessionsQuery(undefined, { skip: !user });
  const [registerFn, { isLoading: registering }] = useRegisterAttendeeMutation();

  // Fallback до моків
  const allSessions: ZoomSessionWithAttendance[] = useMemo(
    () => (isError || !data?.length ? MOCK_SESSIONS : data),
    [data, isError],
  );

  const upcoming = useMemo(
    () => allSessions.find(s => s.status === 'SCHEDULED' || s.status === 'ACTIVE') ?? null,
    [allSessions],
  );

  const history = useMemo(
    () => allSessions.filter(s => s.status === 'COMPLETED' || s.status === 'CANCELLED')
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()),
    [allSessions],
  );

  const register = (sessionId: string) => {
    if (!user) {
      openAuthModal();
      return Promise.reject({ status: 401, data: { error: 'auth_required' } });
    }
    return registerFn({ sessionId }).unwrap();
  };

  /** Форматує ISO дату в зручний вигляд */
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    return {
      date:     d.toLocaleDateString('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' }),
      time:     d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' }),
      short:    d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' }),
      isPast:   d < now,
      daysLeft: Math.ceil((d.getTime() - now.getTime()) / 86400000),
    };
  };

  return { allSessions, upcoming, history, register, registering, isLoading, isMock: isError || !data?.length, formatDate };
}

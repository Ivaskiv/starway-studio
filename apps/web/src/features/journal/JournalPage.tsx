// apps/web/src/features/journal/JournalPage.tsx
import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useJournal } from './hooks/useJournal';

import { isTelegramMiniAppContext } from '@/features/social/utils/telegramWebApp';
import JournalLayout from '@/features/journal/layout/JournalLayout';

export default function JournalPage({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();

  const journal = useJournal();

  // Перенаправлення для Telegram Mini App
  useEffect(() => {
    if (!isTelegramMiniAppContext(location.pathname)) return;
    navigate('/miniapp/journal', { replace: true });
  }, [location.pathname, navigate]);

  return (
    <main className={compact ? 'min-h-screen p-0' : 'min-h-screen px-4 py-5 sm:px-6'}>
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <JournalLayout
          compact={compact}
          month={journal.month}
          year={journal.year}
          events={journal.events}
          errorMessage={
            journal.isError
              ? 'Не вдалося завантажити журнал. Перевір авторизацію або підключення й онови сторінку.'
              : null
          }
          latestIncompleteDay={journal.latestIncompleteDay}
          dayStatesByDate={journal.daysByDate}
          filter={journal.filter}
          isLoading={journal.isLoading}
          selectedDay={journal.selectedDay}
          selectedDayState={journal.selectedDayState}
          selectedEvents={journal.selectedEvents}
          onFilterChange={journal.setFilter}
          onPrevMonth={journal.prevMonth}
          onNextMonth={journal.nextMonth}
          onSelectDay={journal.setSelectedDay}
        />
      </div>
    </main>
  );
}

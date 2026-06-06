import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGetSummaryQuery } from '@/features/gamification/services/gamification.api'
import JournalDashboardHeader from '@/features/journal/components/JournalDashboardHeader'
import JournalFeed from '@/features/journal/components/JournalFeed'
import { useJournal } from './hooks/useJournal';

import { isTelegramMiniApp } from '@/features/social/utils/telegramWebApp';
import JournalLayout from '@/features/journal/layout/JournalLayout';
import ProgressPanel from '@/components/layout/ProgressPanel';
import { useUserProgress } from '@/features/user/hooks/useUserProgress'

export default function JournalPage({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth()
  const { data: summary } = useGetSummaryQuery(undefined, { skip: !user?.id })
  const { dayNumber } = useUserProgress()

  const journal = useJournal();

  // Перенаправлення для Telegram Mini App
  useEffect(() => {
    if (!isTelegramMiniApp(location.pathname)) return;
    navigate('/miniapp/journal', { replace: true });
  }, [location.pathname, navigate]);

  if (compact) {
    return (
      <main className="min-h-screen p-0">
        <JournalLayout
          compact
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
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[rgba(7,10,18,0.98)] py-4">
      <div className="mx-auto flex w-full max-w-[1390px] min-w-0 items-start gap-3">
        <div className="min-w-0 flex-1 space-y-4">
          <JournalDashboardHeader
            dayNumber={dayNumber}
            totalDays={30}
            streak={summary?.streak.current ?? 0}
            xpTotal={summary?.xp.total ?? 0}
            level={summary?.xp.level ?? 1}
          />
          <div className="flex min-w-0 items-start gap-3">
            <JournalFeed
              dayStatesByDate={journal.daysByDate}
              selectedDay={journal.selectedDay}
              onSelectDay={journal.setSelectedDay}
            />
            <ProgressPanel dayStatesByDate={journal.daysByDate} />
          </div>
        </div>
      </div>
    </main>
  );
}

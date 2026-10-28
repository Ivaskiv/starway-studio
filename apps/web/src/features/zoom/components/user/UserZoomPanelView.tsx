import { ArrowRight, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getSessionMeta } from '../../zoom.utils';
import { fmtDateTime } from '../../utils/userPanelPresentation';
import { SectionLabel } from './UserSessionPieces';
import { UserSessionsView } from './UserSessionsView';
import type { UserZoomPanelModel } from '../../UserZoomPanel';

export function UserZoomPanelView({ model }: { model: UserZoomPanelModel }) {
  const { user, isAccessLoading, zoomAccess, activeTab, activeProgressTab, setActiveProgressTab, accessMessage, activeRewardsTab, setActiveRewardsTab, rewardDetailsOpen, setRewardDetailsOpen, myStats, weeklyZoomPractices, weeklyIndividualSessions, weeklyCompletedBattles, materialSessions, profileName, profileInitials, hasAiMentorAccess, ownedProducts, subscribedProducts, setActiveTab } = model;
  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-center justify-between gap-3 px-0.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-sky-300/25 bg-sky-500/15 text-xs font-semibold text-sky-100 shadow-[0_0_18px_rgba(56,189,248,0.12)]">
            {profileInitials}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-semibold leading-tight text-[var(--text-primary)]">Zoom Календар</h1>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Групові та індивідуальні сесії Starway</p>
          </div>
        </div>
        <span
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sky-200"
          aria-label="Сповіщення"
        >
          <Bell className="h-3.5 w-3.5" />
        </span>
      </header>

      {accessMessage && (
        <p className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/70">
          {accessMessage}
        </p>
      )}

      <UserSessionsView model={model} />

      {activeTab === 'progress' && !zoomAccess?.hasFocus && (
        <section className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] px-4 py-10 text-center">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">Мої цілі</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            {isAccessLoading ? 'Перевіряємо доступ…' : 'Цілі FOCUS недоступні для поточного доступу'}
          </p>
        </section>
      )}

      {activeTab === 'progress' && zoomAccess?.hasFocus && (
        <section className="flex flex-col gap-5">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Мій прогрес</h1>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Твоя активність і результати у Starway</p>
          </div>

          <div className="grid grid-cols-3 gap-1 rounded-xl border border-[var(--border-primary)] bg-[var(--glass-bg)] p-1">
            {([
              { id: 'overview', label: 'Загальний' },
              { id: 'goals', label: 'Цілі' },
              { id: 'statistics', label: 'Статистика' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveProgressTab(tab.id)}
                className={[
                  'rounded-lg px-2 py-2 text-xs font-semibold transition-colors',
                  activeProgressTab === tab.id
                    ? 'bg-[rgb(var(--accent-soft-rgb))]/20 text-[rgb(var(--accent-soft-rgb))]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeProgressTab === 'overview' && (
            <div className="rounded-2xl border border-[rgb(var(--accent-soft-rgb))]/25 bg-[radial-gradient(circle_at_top_right,rgb(var(--accent-soft-rgb)/0.16),transparent_48%),var(--glass-bg)] p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Твій рівень</p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <div>
                  <p className="text-3xl font-semibold text-[var(--text-primary)]">
                    {myStats?.level ?? '—'}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Рівень</p>
                </div>
                <p className="text-sm font-semibold text-[rgb(var(--accent-soft-rgb))]">
                  {myStats?.mindXP ?? 0} XP
                </p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10" aria-label="XP progress">
                <div className="h-full w-0 rounded-full bg-[rgb(var(--accent-soft-rgb))]" />
              </div>
              <p className="mt-2 text-[11px] text-[var(--text-muted)]">Поріг наступного рівня недоступний</p>
            </div>
          )}

          {(activeProgressTab === 'overview' || activeProgressTab === 'statistics') && (
            <>
              <section>
                <SectionLabel label="ЦЬОГО ТИЖНЯ" />
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Zoom-практики', value: weeklyZoomPractices },
                    { label: 'Індивідуальні сесії', value: weeklyIndividualSessions },
                    { label: 'Завдання виконано', value: '—' },
                    { label: 'Battle завершено', value: weeklyCompletedBattles },
                  ].map((metric) => (
                    <div key={metric.label} className="rounded-xl border border-[var(--border-primary)] bg-[var(--glass-bg)] p-3">
                      <p className="text-2xl font-semibold text-[var(--text-primary)]">{metric.value}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{metric.label}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <SectionLabel label="МОЇ РЕЗУЛЬТАТИ" />
                <div className="grid grid-cols-3 gap-2 rounded-xl border border-[var(--border-primary)] bg-[var(--glass-bg)] p-3">
                  {[
                    { label: 'Mind XP', value: myStats?.mindXP ?? 0 },
                    { label: 'Battle wins', value: myStats?.battleWins ?? 0 },
                    { label: 'Рівень', value: myStats?.level ?? '—' },
                  ].map((result) => (
                    <div key={result.label} className="text-center">
                      <p className="text-xl font-semibold text-[var(--text-primary)]">{result.value}</p>
                      <p className="mt-1 text-[10px] text-[var(--text-muted)]">{result.label}</p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {(activeProgressTab === 'overview' || activeProgressTab === 'goals') && (
            <section>
              <SectionLabel label="ПОТОЧНІ ЦІЛІ" />
              <div className="rounded-xl border border-dashed border-[var(--border-primary)] bg-[var(--glass-bg)] p-4 text-center text-xs text-[var(--text-muted)]">
                Немає активних цілей
              </div>
            </section>
          )}

          {activeProgressTab === 'overview' && (
            <section>
              <SectionLabel label="ОСТАННІ ДОСЯГНЕННЯ" />
              <div className="rounded-xl border border-dashed border-[var(--border-primary)] bg-[var(--glass-bg)] p-4 text-center text-xs text-[var(--text-muted)]">
                Досягнення ще не зафіксовані
              </div>
            </section>
          )}
        </section>
      )}

      {activeTab === 'materials' && (
        <section className="flex flex-col gap-4">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Матеріали</h1>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Записи та підсумки твоїх Zoom-сесій</p>
          </div>

          {materialSessions.length > 0 ? (
            <div className="flex flex-col gap-2">
              {materialSessions.map((session) => (
                <article
                  key={session.id}
                  className="rounded-2xl border border-sky-400/15 bg-[linear-gradient(145deg,rgba(15,36,63,0.92),rgba(7,18,35,0.96))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                        {session.topic}
                      </p>
                      <p className="mt-1 text-[11px] text-sky-200/65">
                        {fmtDateTime(session.scheduledAt)} · {getSessionMeta(session)}
                      </p>
                    </div>
                    <span className="flex-shrink-0 rounded-full border border-sky-300/20 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold text-sky-200">
                      Матеріал
                    </span>
                  </div>

                  {session.outcomeTopic && (
                    <p className="mt-3 text-xs font-medium text-[var(--text-secondary)]">
                      {session.outcomeTopic}
                    </p>
                  )}
                  {session.summary && (
                    <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
                      {session.summary}
                    </p>
                  )}
                  {session.recordingUrl && session.canViewRecording === true && (
                    <a
                      href={session.recordingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-sky-300/25 bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-100 transition-colors hover:bg-sky-500/25"
                    >
                      Відкрити запис
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-sky-300/15 bg-[linear-gradient(145deg,rgba(15,36,63,0.72),rgba(7,18,35,0.82))] px-4 py-10 text-center">
              <p className="text-sm font-semibold text-[var(--text-secondary)]">Матеріалів поки немає</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Тут зʼявляться доступні записи та підсумки твоїх сесій
              </p>
            </div>
          )}
        </section>
      )}

      {activeTab === 'ai' && (
        <section className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] px-4 py-10 text-center">
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">AI-агенти</h1>
          {hasAiMentorAccess ? (
            <>
              <p className="mt-2 text-sm text-[var(--text-muted)]">AI-агенти доступні у твоєму продукті</p>
              <Link
                to="/miniapp/mentor"
                className="mt-4 inline-flex rounded-xl border border-sky-300/30 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-100"
              >
                Відкрити AI-агенти
              </Link>
            </>
          ) : (
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {isAccessLoading ? 'Перевіряємо доступ…' : 'AI-агенти недоступні для поточного доступу'}
            </p>
          )}
        </section>
      )}

      {activeTab === 'more' && (
        <section className="flex flex-col gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Ще</h1>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Профіль, налаштування та доступи</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Профіль</p>
            <p className="mt-2 text-sm font-semibold text-white">{profileName}</p>
            {user?.email && <p className="mt-1 text-xs text-white/45">{user.email}</p>}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Налаштування</p>
            <div className="mt-2 grid gap-1 text-xs text-white/55">
              <p>Мова: {user?.settings?.language ?? 'За замовчуванням'}</p>
              <p>Сповіщення: {user?.settings?.notifications?.enabled === false ? 'Вимкнено' : 'Увімкнено'}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Мої доступи</p>
            <div className="mt-2 flex flex-col gap-2 text-sm">
              {zoomAccess?.hasFocus && (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-sky-500/10 px-3 py-2 text-sky-100">
                  <span>FOCUS</span>
                  <span className="text-[11px] font-semibold">Доступ активний</span>
                </div>
              )}
              {ownedProducts.map((product) => (
                <div key={`owned-${product.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.035] px-3 py-2 text-white/75">
                  <span className="min-w-0 truncate">{product.name}</span>
                  <span className="flex-shrink-0 text-[11px] text-white/45">{product.status ?? 'У власності'}</span>
                </div>
              ))}
              {subscribedProducts.map((product) => (
                <div key={`subscribed-${product.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.035] px-3 py-2 text-white/75">
                  <span className="min-w-0 truncate">{product.name}</span>
                  <span className="flex-shrink-0 text-[11px] text-white/45">{product.status}</span>
                </div>
              ))}
              {!isAccessLoading && !zoomAccess?.hasFocus && ownedProducts.length === 0 && subscribedProducts.length === 0 && (
                <p className="rounded-xl border border-dashed border-white/10 px-3 py-3 text-center text-xs text-white/40">
                  Активних продуктових доступів немає
                </p>
              )}
              {isAccessLoading && <p className="text-xs text-white/40">Перевіряємо доступи…</p>}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'rewards' && rewardDetailsOpen && myStats && (
        <section className="flex flex-col gap-5">
          <button
            type="button"
            onClick={() => setRewardDetailsOpen(false)}
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-sky-200"
          >
            <span aria-hidden="true">←</span>
            Назад
          </button>

          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Деталі нагороди</h1>
          </div>

          <div className="flex min-h-52 items-center justify-center rounded-3xl border border-sky-400/20 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.24),transparent_46%),linear-gradient(145deg,rgba(15,36,63,0.96),rgba(7,18,35,0.99))]">
            <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full border border-sky-300/30 bg-sky-400/10 shadow-[0_0_48px_rgba(56,189,248,0.18)]">
              <span className="text-4xl font-semibold text-sky-100">{myStats.level}</span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-sky-200/65">рівень</span>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Рівень {myStats.level}</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">Опис нагороди недоступний</p>
            <p className="mt-2 text-xs font-semibold text-sky-200">{myStats.mindXP} XP</p>
          </div>

          <section>
            <SectionLabel label="ЩО ЦЕ ДАЄ?" />
            <div className="rounded-xl border border-dashed border-sky-400/15 bg-[rgba(8,24,45,0.72)] p-4 text-center text-xs text-[var(--text-muted)]">
              Дані про переваги цієї нагороди відсутні
            </div>
          </section>

          <section>
            <SectionLabel label="РЕКОМЕНДАЦІЇ" />
            <div className="rounded-xl border border-dashed border-sky-400/15 bg-[rgba(8,24,45,0.72)] p-4 text-center text-xs text-[var(--text-muted)]">
              Персональні рекомендації недоступні
            </div>
          </section>

          <button
            type="button"
            onClick={() => {
              setRewardDetailsOpen(false);
              setActiveTab('progress');
            }}
            className="rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(14,165,233,0.22)] transition-colors hover:bg-sky-400"
          >
            До мого прогресу
          </button>
        </section>
      )}

      {activeTab === 'rewards' && !rewardDetailsOpen && (
        <section className="flex flex-col gap-5">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">Нагороди</h1>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Твої досягнення, бонуси та рівні</p>
          </div>

          <div className="grid grid-cols-4 gap-1 rounded-xl border border-[var(--border-primary)] bg-[var(--glass-bg)] p-1">
            {([
              { id: 'all', label: 'Усі' },
              { id: 'achievements', label: 'Досягнення' },
              { id: 'bonuses', label: 'Бонуси' },
              { id: 'levels', label: 'Рівні' },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveRewardsTab(tab.id)}
                className={[
                  'min-w-0 rounded-lg px-1 py-2 text-[11px] font-semibold transition-colors',
                  activeRewardsTab === tab.id
                    ? 'bg-sky-500/20 text-sky-200'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {(activeRewardsTab === 'all' || activeRewardsTab === 'levels') && (
            <button
              type="button"
              onClick={() => setRewardDetailsOpen(true)}
              disabled={!myStats}
              className="w-full rounded-2xl border border-sky-400/20 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_48%),linear-gradient(145deg,rgba(15,36,63,0.94),rgba(7,18,35,0.98))] p-4 text-left disabled:cursor-default"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-sky-200/65">Твій поточний рівень</p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <div>
                  <p className="text-3xl font-semibold text-[var(--text-primary)]">{myStats?.level ?? '—'}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">Рівень</p>
                </div>
                <p className="text-sm font-semibold text-sky-200">{myStats?.mindXP ?? 0} XP</p>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10" aria-label="Rewards XP progress">
                <div className="h-full w-0 rounded-full bg-sky-400" />
              </div>
              <p className="mt-2 text-[11px] text-[var(--text-muted)]">Поріг наступного рівня недоступний</p>
            </button>
          )}

          {(activeRewardsTab === 'all' || activeRewardsTab === 'achievements') && (
            <section>
              <SectionLabel label="ОТРИМАНІ НАГОРОДИ" />
              <div className="rounded-xl border border-dashed border-sky-400/15 bg-[rgba(8,24,45,0.72)] p-4 text-center text-xs text-[var(--text-muted)]">
                Отримані нагороди ще не зафіксовані
              </div>
            </section>
          )}

          {(activeRewardsTab === 'all' || activeRewardsTab === 'achievements' || activeRewardsTab === 'levels') && (
            <section>
              <SectionLabel label="НАСТУПНІ НАГОРОДИ" />
              <div className="rounded-xl border border-white/10 bg-[rgba(8,24,45,0.72)] p-4 text-center">
                <span className="text-lg text-white/35" aria-hidden="true">🔒</span>
                <p className="mt-2 text-xs text-[var(--text-muted)]">Умови наступних нагород недоступні</p>
              </div>
            </section>
          )}

          {(activeRewardsTab === 'all' || activeRewardsTab === 'bonuses') && (
            <section>
              <SectionLabel label="БОНУСИ ДЛЯ ТЕБЕ" />
              <div className="rounded-xl border border-dashed border-sky-400/15 bg-[rgba(8,24,45,0.72)] p-4 text-center text-xs text-[var(--text-muted)]">
                Доступних бонусів немає
              </div>
            </section>
          )}
        </section>
      )}
    </div>
  );
}

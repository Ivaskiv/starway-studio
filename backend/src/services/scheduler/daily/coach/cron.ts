// backend/src/services/scheduler/daily.jobs.ts — daily mentor/streak notification jobs.
// Інструкція: тут щоденні нагадування, streak-логіка, weekly summary та inactive AI checks.


import {
isLastSaturdayOfMonth,
resolveCoachAgentsUrl,
} from '../shared.js'
import {
formatRevenueSummary,
loadDailyCoachBriefingData,
loadMonthlyStrategicSnapshot,
loadWeeklyPlannerSnapshot,
} from './data.js'
import {
buildCoachDailyBriefingText,
buildCoachMonthlyStrategicText,
buildCoachWeeklyReminderText,
sendCoachPanelReport,
} from './report.js'

export async function coachDailyBriefingCron(): Promise<void> {
  const snapshot = await loadDailyCoachBriefingData()
  const text = await buildCoachDailyBriefingText(snapshot)
  const agentsUrl = await resolveCoachAgentsUrl()
  await sendCoachPanelReport(text, [
    [
      { text: 'Контент', callback_data: 'coach-content:planner' },
      { text: 'Продажі', callback_data: 'coach-content:payments' },
      { text: 'Zoom', callback_data: 'coach:schedule' },
    ],
    [
      { text: 'Аналітика', callback_data: 'coach:analytics' },
      { text: 'Планер', callback_data: 'content_os:start_planning' },
    ],
    [
      { text: 'Агенти', url: agentsUrl },
    ],
  ])
}

export async function coachWeeklyPlannerTuesdayCron(): Promise<void> {
  const snapshot = await loadWeeklyPlannerSnapshot()
  const text = buildCoachWeeklyReminderText('Час оновити контент-план тижня.', snapshot)
  await sendCoachPanelReport(text, [
    [{ text: '/planner', callback_data: 'coach-content:planner' }],
  ])
}

export async function coachWeeklyPlannerSaturdayCron(): Promise<void> {
  const snapshot = await loadWeeklyPlannerSnapshot()
  const weekResults = [
    `Ліди: ${snapshot.leads}`,
    `Продажі: ${snapshot.salesCount}`,
    `Сума: ${formatRevenueSummary(snapshot.salesRevenue)}`,
    `Zoom: ${snapshot.zooms.length}`,
    `Контент: ${snapshot.contentPlanReady ? 'готово' : 'ще в роботі'}`,
  ].join('\n• ')
  const text = [
    '🧭 <b>Тиждень завершується. Підготуй наступний.</b>',
    '',
    `• ${weekResults}`,
    '',
    'CTA: /planner',
  ].join('\n')
  await sendCoachPanelReport(text, [
    [{ text: '/planner', callback_data: 'coach-content:planner' }],
  ])
}

export async function coachMonthlyStrategicPlannerCron(): Promise<void> {
  if (!isLastSaturdayOfMonth()) return
  const snapshot = await loadMonthlyStrategicSnapshot()
  const text = buildCoachMonthlyStrategicText(snapshot)
  const agentsUrl = await resolveCoachAgentsUrl()
  await sendCoachPanelReport(text, [
    [
      { text: 'Створити план місяця', callback_data: 'coach-content:monthly' },
    ],
    [
      { text: 'Запустити планер', callback_data: 'coach-content:planner' },
      { text: 'Переглянути аналітику', callback_data: 'coach:analytics' },
    ],
    [
      { text: 'Агенти', url: agentsUrl },
    ],
  ])
}

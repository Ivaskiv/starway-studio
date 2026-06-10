import { absystemButtons, AB_TEST_START_STEP2 } from '@/products/absystem/config/absystem.content.js'

export const abTestContent = {
  meta: {
    productId: 'absystem',
    funnelId: 'ab_test',
  },
  buttons: {
    startTest: absystemButtons.startTest,
    continueTest: absystemButtons.continueTest,
    restoreProgress: absystemButtons.restoreProgress,
    openFocus: absystemButtons.joinFocus,
    payFocus1m: absystemButtons.focusMonthly,
    payFocus3m: absystemButtons.focusQuarterly,
    joinChannel: absystemButtons.joinChannel,
    openZoom: absystemButtons.openZoom,
    openPlatform: absystemButtons.openPlatform,
    continueFlow: absystemButtons.continue,
    answerState: 'Стан',
    answerGoal: 'Ціль',
    answerChoice: 'Вибір',
    answerDecision: 'Рішення',
    answerAction: 'Дія',
  },
  entry: {
    title: '',
    intro: AB_TEST_START_STEP2.split('\n'),
    resume: [],
  },
  progress: {
    label: '',
    stepPrefix: '',
    resumeHint: '',
    completionHint: '',
  },
  restore: {
    title: 'Прогрес збережено',
    body: [
      'Ми відновили останній збережений крок тесту.',
      'Можеш продовжити з того місця, де зупинився/лася.',
    ],
  },
  errors: {
    stale: [
      'Дякую, бачу твою дію.',
      'Повертаю нас до поточного запитання.',
    ],
    invalid: ['Не вдалося розпізнати дію.', 'Повертаюсь до поточного кроку.'],
    retry: ['Спробуй ще раз за кілька секунд.', 'Прогрес уже збережений.'],
  },
  menu: {
    title: '',
    body: [
      'Повертаємось до твоєї діагностики з поточного кроку.',
    ],
  },
} as const

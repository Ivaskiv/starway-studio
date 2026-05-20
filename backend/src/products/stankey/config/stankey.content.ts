//backend/src/products/stankey/config/stankey.content.ts
export const stankeyContent = {
  telegram: {
    buttons: {
      back: '← Повернутись',
      privacy: '🔒 Політика',
      taskCompleted: '✅ Виконано',
      taskSkip: '⏭ Пропустити',
      taskDone: '✅ Зроблено',
      continueInMentor: '💬 Продовжити в Ментор',
      continue: '▶️ Продовжити',
      restart: '🔄 Почати заново',
      openApp: '🌐 Відкрити додаток',
      start: '✨ Розпочати',
      discoverState: '🎯 Дізнатись свій стан',
      trySevenDays: '✨ Спробувати 7 днів',
      myTask: '📋 Моє завдання',
      myState: '📊 Мій стан',
      getAccess: '🚀 Отримати доступ',
      pay: '💳 Оплатити',
      openLidmagnet: '🧭 Знайти точки опори',
      mentor: '🤖 ABsystem',
      aiMentor: '🧠 AI Mentor',
      openCourse: '✨ Відкрити курс',
      practices: '❤️ Практики',
      earlyAccess: '🔥 Early access',
      openOffer: '🚀 Відкрити пропозицію',
      openPaidAccess: '💎 Відкрити доступ',
      continueMaterial: '🎁 Продовжити практикум',
      repeatMaterial: '🎁 Пройти матеріал ще раз',
      openStarway: 'Відкрити Starway',
      restoreAccess: '🚀 Відновити доступ',
    },
    onboarding: {
      waitlistLines: [
        'Ти в early access.',
        '',
        'Доступ відкривається поетапно, тому зараз для тебе активний обмежений rollout.',
        'Як тільки твій доступ буде готовий, ми дамо наступний крок тут.',
      ],
    },
    product: {
      readyLines: [
        'Практикум готовий.',
        '',
        'Відкрий Starway і продовжуй у своєму робочому просторі.',
      ],
      continueFromCurrentLesson: (lesson: string | null | undefined) => lesson
        ? [
            `▶️ Повернись до: ${lesson}`,
            'Твій рух уже готовий до продовження.',
          ]
        : [
            'Твій рух уже готовий до продовження.',
          ],
      activeLeadMagnet: (stage: string, insight: string) =>
        `Практикум активний.${stage}${insight}\n\nПродовжуй із того місця, де ритм уже зібрався.`,
      activeTrial: (trialDay: string | undefined, stage: string, insight: string) =>
        `Сесія активна.\nДень ${trialDay ?? '?'} із 7.${stage}${insight}`,
      activeSubscription: (stage: string, insight: string) =>
        `Сесія активна.${stage}${insight}`,
      pausedAccess: (stage: string, insight: string) =>
        `Твій ритм зараз на паузі.${stage}${insight}\n\nІсторія, звіти й аналіз уже збережені. Щоб повернути ранкові й вечірні сесії, віднови доступ.`,
      activeOnboarding: (stage: string, insight: string) =>
        `Онбординг триває.${stage}${insight}`,
      earlyAccessActive: (insight: string) =>
        `Ранній доступ активний.${insight}\n\nДочекайся відкриття продуктового доступу.`,
      productPriorityLines: [
        'У тебе вже є активний доступ.',
        '',
        'Можеш або продовжити роботу в Starway, або пройти матеріал практикуму ще раз як додаткову практику.',
      ],
      pausedStartLines: (firstName: string) => [
        `${firstName}, твій ритм зараз на паузі.`,
        '',
        'Історія, звіти й аналіз за попередній період уже збережені.',
        'Щоб продовжити ранкові та вечірні сесії, віднови доступ.',
      ],
      lidmagnetAccepted:
        '🎁 Запит прийнято. Гайд скоро прийде наступним повідомленням.',
      paymentSuccessLines: [
        'Оплата пройшла успішно! 🎉',
        '',
        'Тебе чекає практичний міні-курс, який допоможе:',
        '',
        '* зберігати ресурсний стан;',
        '* робити сильніші й точніші кроки у своєму ритмі. 🚀',
        '',
        'Починаємо прямо зараз без зайвого шуму.',
        '',
        'Натискайте кнопку нижче, щоб відкрити перший матеріал.',
      ],
    },
    decision: {
      funnelStepLines: (firstName: string) => [
        `${firstName}, продовжуй свій вхід крок за кроком.`,
        '',
        'Заверши поточний етап, щоб відкрити наступний ритм.',
      ],
      showFunnel: 'Почни з діагностики або відразу переходь до наступного кроку входу.',
      winbackLines: (firstName: string) => [
        `${firstName}, твій доступ завершився.`,
        '',
        'Поверни доступ, щоб відновити ритм, звіти й незавершені кроки без втрати інерції.',
      ],
      offerLines: (firstName: string, isSubscriptionOffer: boolean) => [
        `${firstName}, у тебе вже є база для наступного кроку.`,
        '',
        isSubscriptionOffer
          ? 'Продовж доступ, щоб не втратити темп і зберегти свій прогрес.'
          : 'Активуй 7-денний ритм і подивись, як система працює в повному режимі.',
      ],
      paywall: 'Для цього кроку потрібен активний доступ.',
    },
  },
} as const

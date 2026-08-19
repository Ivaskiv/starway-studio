export type TelegramCallbackKind =
  | 'payment'
  | 'room'
  | 'onboarding'
  | 'mentor'
  | 'reminder'
  | 'lifecycle'
  | 'navigation'
  | 'legacy'

export type TelegramCallbackTransition =
  | 'trial_started'
  | 'paywall_opened'
  | 'checkout_opened'
  | 'status_requested'
  | 'waitlist_requested'
  | 'mentor_resumed'
  | 'mentor_chat_resumed'
  | 'task_opened'
  | 'privacy_opened'
  | 'task_completed'
  | 'task_skipped'
  | 'room_restarted'
  | 'room_diagnostic_opened'
  | 'room_opened'
  | 'room_practices_opened'
  | 'reminder_dismissed'
  | 'leadmagnet_resumed'
  | 'leadmagnet_material_resumed'
  | 'main_menu_opened'
  | 'lifecycle_unknown'

const RESULT_LABEL: Record<string, string> = {
  STATE: 'СТАН',
  GOAL: 'ЦІЛЬ',
  CHOICE: 'ВИБІР',
  DECISION: 'РІШЕННЯ',
  ACTION: 'ДІЯ',
}

const RESULT_FOCUS_CONTEXT: Record<string, string> = {
  STATE: [
    'Система визначила: основна точка блокування — енергетичний',
    'та ресурсний стан. Дія переривається раніше, ніж починається.',
    '',
    'Що це означає в роботі ФОКУС:',
    '— практики будуватимуться від відновлення ресурсного стану',
    '— завдання тижня — мінімальний крок без надриву',
    '— фокус не на результат, а на умови з яких можлива дія',
  ].join('\n'),
  GOAL: [
    'Система визначила: основна точка блокування — відсутність',
    'сформованої внутрішньої цілі. Дія не тримається, бо',
    'напрямок ще не зафіксований.',
    '',
    'Що це означає в роботі ФОКУС:',
    '— на практиках фокус на прояснення реального запиту',
    '— завдання тижня від питання "навіщо", а не "як"',
    '— перший крок — точне формулювання, а не план дій',
  ].join('\n'),
  CHOICE: [
    'Система визначила: основна точка блокування — незакритий',
    'вибір. Паралельні варіанти утримують від руху в будь-який бік.',
    '',
    'Що це означає в роботі ФОКУС:',
    '— практики будуються навколо конкретної ситуації вибору',
    '— завдання тижня — не обрати правильно, а побачити справжню ціну',
    '  кожного варіанту',
    '— фокус на те, що насправді утримує від рішення',
  ].join('\n'),
  DECISION: [
    'Система визначила: основна точка блокування — незафіксоване',
    'рішення. Розуміння є, але внутрішньої фіксації "я це роблю" — немає.',
    '',
    'Що це означає в роботі ФОКУС:',
    '— практики спрямовані на доведення розуміння до рішення',
    '— завдання тижня — конкретна дія що підтверджує рішення',
    '— фокус не на аналіз, а на фіксацію',
  ].join('\n'),
  ACTION: [
    'Система визначила: основна точка блокування — перший крок.',
    'Ціль і рішення є, але дія залишається в голові.',
    '',
    'Що це означає в роботі ФОКУС:',
    '— практики будуються навколо декомпозиції конкретної дії',
    '— завдання тижня — зробити крок меншим до реально виконуваного',
    '— фокус на усунення розриву між "знаю" і "зробив"',
  ].join('\n'),
}

export type TelegramCallbackEvent = {
  action: string
  kind: TelegramCallbackKind
  productId: string | null
  transition: TelegramCallbackTransition
}

const CALLBACK_KIND_BY_ACTION: Record<string, { kind: TelegramCallbackKind; transition: TelegramCallbackTransition; productId?: string | null }> = {
  start_trial: { kind: 'onboarding', transition: 'trial_started' },
  open_paid_checkout: { kind: 'payment', transition: 'paywall_opened', productId: 'stankey' },
  open_status: { kind: 'lifecycle', transition: 'status_requested' },
  waitlist_early_access: { kind: 'onboarding', transition: 'waitlist_requested' },
  continue_ai_mentor: { kind: 'mentor', transition: 'mentor_resumed' },
  resume_morning_session: { kind: 'mentor', transition: 'mentor_resumed' },
  resume_evening_session: { kind: 'mentor', transition: 'mentor_resumed' },
  continue_ai_mentor_chat: { kind: 'mentor', transition: 'mentor_chat_resumed' },
  continue_task: { kind: 'reminder', transition: 'task_opened' },
  open_tasks: { kind: 'reminder', transition: 'task_opened' },
  open_privacy: { kind: 'lifecycle', transition: 'privacy_opened' },
  'privacy:back': { kind: 'navigation', transition: 'main_menu_opened' },
  task_done: { kind: 'reminder', transition: 'task_completed' },
  task_skip: { kind: 'reminder', transition: 'task_skipped' },
  restart_flow: { kind: 'room', transition: 'room_restarted' },
  start_wheel: { kind: 'room', transition: 'room_diagnostic_opened' },
  open_lidmagnet: { kind: 'onboarding', transition: 'trial_started' },
  open_course: { kind: 'room', transition: 'room_opened' },
  open_practices: { kind: 'room', transition: 'room_practices_opened' },
  open_platform: { kind: 'room', transition: 'room_opened' },
  dismiss_task: { kind: 'reminder', transition: 'reminder_dismissed' },
  lm_continue: { kind: 'onboarding', transition: 'leadmagnet_resumed' },
  lm_continue_material: { kind: 'onboarding', transition: 'leadmagnet_material_resumed' },
  return_main_menu: { kind: 'navigation', transition: 'main_menu_opened' },
}

function toProductId(action: string): string | null {
  const match = action.match(/^pay_(stankey|absystem|focus)_/)
  if (match) {
    return match[1]
  }
  return CALLBACK_KIND_BY_ACTION[action]?.productId ?? null
}

export function resolveTelegramCallbackEvent(action: string): TelegramCallbackEvent {
  if (action.startsWith('pay_stankey_')) {
    return {
      action,
      kind: 'payment',
      productId: 'stankey',
      transition: 'checkout_opened',
    }
  }

  const preset = CALLBACK_KIND_BY_ACTION[action]
  if (preset) {
    return {
      action,
      kind: preset.kind,
      productId: preset.productId ?? toProductId(action),
      transition: preset.transition,
    }
  }

  return {
    action,
    kind: 'legacy',
    productId: toProductId(action),
    transition: 'lifecycle_unknown',
  }
}

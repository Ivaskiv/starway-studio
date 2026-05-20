import {
  LexiconPanel,
  type LexItem,
} from '@/features/ai-assistant/pages/LexiconPanel'
import {
  useAddLexiconMutation,
  useDeleteLexiconMutation,
  useGenerateContentMutation,
  useGetLexiconQuery,
} from '@/features/ai-assistant/store/aiAssistant.api'
import { useSessionOrchestrator } from '@/features/auth/context/SessionOrchestratorContext'
import {
  ContentType,
  type GenerationResult,
  type ModelProvider,
} from '@ai/types/salesAssistant.types'
import { Copy, HelpCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

type ContentKey =
  | 'REELS_SCENARIO'
  | 'STORIES'
  | 'WARMUP_3DAYS'
  | 'WEBINAR_SALES'
  | 'STORIES_CHECK'
  | 'BLOG_IDEAS'
  | 'EMAIL'
  | 'CUSTOM_SCRIPT'
type ModelKey = ModelProvider
type ModelState = Record<ModelKey, boolean>
type ResultsByModel = Partial<Record<ModelKey, GenerationResult>>

const PROTOCOLS = [
  {
    key: 'SYSTEM',
    label: 'Оголена правда',
    desc: 'Провокативно, в лоб, зриває маски',
    info: 'Найбільш провокативний рівень. Його мета — "розбити ілюзії аудиторії в лоб" та випалити "хорошу дівчинку".',
  },
  {
    key: 'AUTHOR',
    label: 'Головний Архітектор',
    desc: 'Сила, масштаб, жорсткий варіант А/Б',
    info: 'Позиція сили та масштабу. Використовує жорстку логіку А/Б вибору.',
  },
  {
    key: 'PSYCH',
    label: 'Психологія Дії',
    desc: 'Глибокий психолінгвістичний audit без цензури',
    info: 'Глибокий психолінгвістичний аудит без цензури для пошуку внутрішніх затиків.',
  },
] as const

const CONTENT_TYPES = [
  { key: 'REELS_SCENARIO', label: 'Рілс' },
  { key: 'STORIES', label: 'Сторіс' },
  { key: 'WARMUP_3DAYS', label: 'Прогрів' },
  { key: 'WEBINAR_SALES', label: 'Вебінар' },
  { key: 'STORIES_CHECK', label: 'Аудит' },
  { key: 'BLOG_IDEAS', label: 'Пост' },
  { key: 'EMAIL', label: 'Email' },
  { key: 'CUSTOM_SCRIPT', label: 'Продаж' },
] as const satisfies ReadonlyArray<{ key: ContentKey; label: string }>

const MODEL_LIST = [
  {
    key: 'claude',
    label: 'Claude Sonnet',
    spec: 'Ядро психолінгвістики',
    desc: 'Рубаний ритм, живі емоції',
  },
  {
    key: 'gpt',
    label: 'GPT-4o',
    spec: 'Архітектура & Структури',
    desc: 'Ідеальні конспект-карти та таймінг',
  },
  {
    key: 'gemini',
    label: 'Gemini 1.5',
    spec: 'Валідатор & Аудит',
    desc: 'Безкоштовний No-bullshit фільтр',
  },
] as const satisfies ReadonlyArray<{
  key: ModelKey
  label: string
  spec: string
  desc: string
}>

const DEFAULT_MODEL_STATE: ModelState = {
  gpt: true,
  claude: true,
  gemini: true,
}

const DEFAULT_LEX: LexItem[] = [
  { id: 'r1', word: 'тригер', type: 'REQUIRED' },
  { id: 'r3', word: 'застрягла', type: 'REQUIRED' },
  { id: 'r4', word: 'зливати', type: 'REQUIRED' },
  { id: 'r5', word: 'тупняк', type: 'REQUIRED' },
  { id: 'r6', word: 'внутрішній критик', type: 'REQUIRED' },
  { id: 'r7', word: 'точка опори', type: 'REQUIRED' },
  { id: 'f1', word: 'трансформація', type: 'FORBIDDEN' },
  { id: 'f2', word: 'унікальна можливість', type: 'FORBIDDEN' },
  { id: 'f3', word: 'успішний успех', type: 'FORBIDDEN' },
]

function resolveContentType(contentKey: ContentKey): ContentType {
  if (contentKey === 'STORIES') return ContentType.STORIES_CHECK
  if (contentKey === 'EMAIL' || contentKey === 'CUSTOM_SCRIPT')
    return ContentType.CUSTOM
  return contentKey as ContentType
}

function formatResultMeta(result: GenerationResult): string {
  return `${result.tokensUsed} tokens`
}

export default function SalesAssistantPage() {
  const { appState: sessionStatus } = useSessionOrchestrator()
  const shouldSkipProtectedQueries = sessionStatus !== 'authenticated'
  const [generateContent, { isLoading, error: generationError }] =
    useGenerateContentMutation()
  const { data: lexItems = DEFAULT_LEX, isLoading: isLexLoading } =
    useGetLexiconQuery(undefined, {
      skip: shouldSkipProtectedQueries,
    })

  const [addLex, { isLoading: isAddingLex }] = useAddLexiconMutation()
  const [deleteLex, { isLoading: isDeletingLex }] = useDeleteLexiconMutation()

  const [protocol, setProtocol] =
    useState<(typeof PROTOCOLS)[number]['key']>('SYSTEM')
  const [outputs, setOutputs] = useState<ContentKey[]>([
    'REELS_SCENARIO',
    'WARMUP_3DAYS',
  ])
  const [customTask, setCustomTask] = useState('')
  const [tone, setTone] = useState('Чітко')
  const [models, setModels] = useState<ModelState>(DEFAULT_MODEL_STATE)
  const [pain, setPain] = useState('')
  const [goal, setGoal] = useState('')
  const [results, setResults] = useState<ResultsByModel>({})

  useEffect(() => {
    console.log('[AUTH][frontend] session status', sessionStatus)
    if (shouldSkipProtectedQueries) {
      console.log('[AUTH][frontend] protected queries skipped')
    }
  }, [sessionStatus, shouldSkipProtectedQueries])

  const canGenerate =
    outputs.length > 0 &&
    (pain.trim().length > 0 ||
      goal.trim().length > 0 ||
      customTask.trim().length > 0) &&
    Object.values(models).some(Boolean) &&
    !isLoading

  const toggleOutput = (contentKey: ContentKey) => {
    setOutputs((current) => {
      if (current.includes(contentKey)) {
        const next = current.filter((key) => key !== contentKey)
        return next.length > 0 ? next : current
      }
      return [...current, contentKey]
    })
  }

  const toggleModel = (model: ModelKey) => {
    setModels((current) => {
      const enabledCount = Object.values(current).filter(Boolean).length
      if (current[model] && enabledCount === 1) return current
      return { ...current, [model]: !current[model] }
    })
  }

  const handleGenerate = async () => {
    if (!canGenerate) return
    try {
      const primaryOutput = outputs[0] ?? 'CUSTOM_SCRIPT'
      const userRequest = [pain, goal, customTask, tone ? `Тон: ${tone}` : '']
        .filter(Boolean)
        .join('\n')

      const payload = {
        contentType: resolveContentType(primaryOutput),
        selectedProtocol: protocol,
        selectedOutputs: outputs,
        userContext: `Протокол: ${protocol}`,
        userRequest,
      }

      console.log('[DNA][frontend] submit payload', payload)

      const result = await generateContent(payload).unwrap()

      console.log('[DNA][frontend] api response raw', result)

      setResults((current) => ({ ...current, [result.modelUsed]: result }))
    } catch {
      // Handled via RTK Query state markers
    }
  }

  const handleClear = () => {
    setPain('')
    setGoal('')
    setCustomTask('')
    setResults({})
  }

  const handleCopy = (content?: string) => {
    if (!content) return
    void navigator.clipboard.writeText(content)
  }

  const handleLexAdd = (word: string, type: 'REQUIRED' | 'FORBIDDEN') => {
    void addLex({ word, type })
  }

  const handleLexDelete = (id: string) => {
    void deleteLex(id)
  }

  const applyPreset = (presetType: 'noise' | 'stuck') => {
    if (presetType === 'noise') {
      setPain(
        'Експерти втомилися жити в шумі, постійно пиляти тонни безглуздого контенту, який ніхто не купує.'
      )
      setGoal(
        'Закритий клуб Focus. Щопонеділкові живі Zoom-розбори, випалювання ілюзій, повернення до живих фактів.'
      )
    } else {
      setPain(
        'Люди роками ходять по колу, купують чергові курси про мотивацію, але залишаються в тій самій точці.'
      )
      setGoal(
        'ABSystem Life — повна автоматизована екосистема, яка веде за руку і не дає злитися.'
      )
    }
  }

  const renderErrorMessage = (error: any) => {
    if (!error) return null
    const status = error?.status ?? error?.data?.status
    if (status === 403)
      return 'Доступ обмежено. AI Workspace не ініціалізовано.'
    if (status === 401) return 'Помилка автентифікації. Оновіть сторінку.'
    if (status === 429)
      return 'Щомісячний ліміт вичерпано. Спробуй наступного місяця.'
    const serverMsg = error?.data?.message ?? error?.message
    return serverMsg ?? "Помилка з'єднання з сервером. Перевір логи бекенду."
  }

  // Verify API URL (Step 13)
  if (typeof window !== 'undefined') {
    const apiUrl = import.meta.env.VITE_API_URL
    if (apiUrl?.includes('ngrok'))
      console.warn('[DNA][env] VITE_API_URL uses ngrok! Render might lag.')
  }

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-4 md:p-10 antialiased selection:bg-[rgba(var(--accent-rgb),0.3)]">
      <div className="max-w-[1440px] mx-auto space-y-10">
        {/* ================= BRAND HEADER BLOCK ================= */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-white/5 pb-8 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold bg-white/5 text-[var(--text-muted)] px-3 py-1 rounded uppercase tracking-[0.2em]">
                STARWAY ENGINE
              </span>
              <span className="text-[var(--text-muted)] opacity-40 font-mono text-[11px] select-none tracking-widest uppercase">
                MULTI_MODEL_HYBRID
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight mt-2 text-[var(--text-primary)]">
              ПУЛЬТ УПРАВЛІННЯ КОНТЕНТОМ
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1.5 font-medium max-w-xl uppercase tracking-wide opacity-80">
              Командний центр ліквідації маркетингового шуму та пакування
              високої конверсії.
            </p>
          </div>

          <div className="w-full lg:w-auto dashboard-liquid-card--soft p-4 flex items-center justify-between sm:justify-start gap-8 text-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between text-[var(--text-muted)] gap-8 uppercase tracking-[0.15em] text-[11px] font-bold">
                <span className="font-semibold">Використання квот:</span>
                <span className="font-mono text-[var(--text-primary)]">
                  68%
                </span>
              </div>
              <div className="w-48 bg-white/5 h-1 rounded-full overflow-hidden border border-white/5">
                <div className="bg-[rgb(var(--accent-rgb))] h-full w-[68%] transition-all shadow-[0_0_8px_rgba(var(--accent-rgb),0.5)]" />
              </div>
            </div>
            <div className="border-l border-white/5 pl-5 hidden sm:block font-mono">
              <span className="text-[11px] uppercase text-[var(--text-muted)] tracking-widest block font-bold opacity-50">
                Статус API
              </span>
              <span className="text-[var(--text-secondary)] text-[12px] font-bold flex items-center gap-2 mt-1 uppercase tracking-widest">
                <span className="w-1.5 h-1.5 bg-[rgb(var(--accent-rgb))] rounded-full shadow-[0_0_8px_rgba(var(--accent-rgb),0.6)]" />
                Hybrid Idle
              </span>
            </div>
          </div>
        </header>

        {/* ================= MAIN WORKSPACE GRID ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-4 space-y-8 lg:border-r lg:border-white/5 lg:pr-8">
            <div className="dashboard-liquid-card--soft p-6 space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] flex items-center gap-2">
                  Емоційний протокол
                  <div className="group relative">
                    <HelpCircle
                      size={12}
                      className="cursor-help opacity-50 hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute bottom-full left-0 mb-2 w-56 p-2 bg-[var(--bg-primary)] border border-white/10 rounded-lg text-[10px] normal-case tracking-normal text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[1000] shadow-xl">
                      Визначають фундаментальну позицію АІ-асистента.
                    </div>
                  </div>
                </label>
                <div className="space-y-2">
                  {PROTOCOLS.map((item) => {
                    const isSelected = protocol === item.key
                    return (
                      <label
                        key={item.key}
                        className={`flex items-start gap-4 p-4 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-white/[0.04] border-[rgb(var(--accent-rgb))] text-[var(--text-primary)]'
                            : 'bg-white/[0.01] border-white/5 text-[var(--text-muted)] hover:border-white/20'
                        }`}
                      >
                        <input
                          checked={isSelected}
                          className="mt-1 accent-[rgb(var(--accent-rgb))]"
                          name="protocol"
                          onChange={() => setProtocol(item.key)}
                          type="radio"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <p
                              className={`text-sm font-bold uppercase tracking-wide ${isSelected ? 'text-[rgb(var(--accent-rgb))]' : 'text-[var(--text-primary)]'}`}
                            >
                              {item.label}
                            </p>
                            <div className="group relative">
                              <HelpCircle
                                size={12}
                                className="text-[var(--text-muted)] cursor-help opacity-40 hover:opacity-100 transition-opacity"
                              />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[var(--bg-primary)] border border-white/10 rounded-lg text-[10px] normal-case tracking-normal font-normal text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[1000] shadow-xl">
                                {item.info}
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-[var(--text-muted)] font-medium mt-1 leading-relaxed opacity-90">
                            {item.desc}
                          </p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-white/5">
                <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] flex items-center gap-2">
                  Tone of Voice
                  <div className="group relative">
                    <HelpCircle
                      size={12}
                      className="cursor-help opacity-50 hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute bottom-full left-0 mb-2 w-56 p-2 bg-[var(--bg-primary)] border border-white/10 rounded-lg text-[10px] normal-case tracking-normal text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[1000] shadow-xl">
                      Стилістичний шар, який визначає характер подачі та настрій
                      тексту.
                    </div>
                  </div>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Чітко', 'Тепло', 'Експертно', 'Сміливо'].map((item) => {
                    const isSelected = tone === item
                    return (
                      <button
                        key={item}
                        onClick={() => setTone(item)}
                        className={`py-2.5 px-3 text-xs rounded-xl border font-bold uppercase tracking-wide transition-all ${
                          isSelected
                            ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)] shadow-lg'
                            : 'bg-white/5 border-white/5 text-[var(--text-muted)] hover:bg-white/10 hover:text-[var(--text-secondary)]'
                        }`}
                        type="button"
                      >
                        {item}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="p-0">
              <LexiconPanel
                isLoading={isLexLoading || isAddingLex || isDeletingLex}
                items={lexItems}
                onAdd={handleLexAdd}
                onDelete={handleLexDelete}
              />
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="lg:col-span-8 space-y-8">
            <div className="dashboard-liquid-card--soft p-6 space-y-4">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] flex items-center gap-2">
                Формати контенту
                <div className="group relative">
                  <HelpCircle
                    size={12}
                    className="cursor-help opacity-50 hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-[var(--bg-primary)] border border-white/10 rounded-xl text-[10px] normal-case tracking-normal text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[1000] shadow-xl">
                    Типи контенту, під які ДНК STARWAY адаптує фінальний
                    результат.
                  </div>
                </div>
              </label>
              <div className="flex flex-wrap gap-2">
                {CONTENT_TYPES.map((item) => {
                  const isActive = outputs.includes(item.key)
                  return (
                    <button
                      key={item.key}
                      onClick={() => toggleOutput(item.key)}
                      className={`px-5 py-2.5 text-xs font-bold rounded-xl border transition-all uppercase tracking-wide ${
                        isActive
                          ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]'
                          : 'bg-white/5 border-white/5 text-[var(--text-muted)] hover:border-white/20 hover:text-[var(--text-secondary)]'
                      }`}
                      type="button"
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="dashboard-liquid-card--soft p-8 space-y-6 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
                <div>
                  <h3 className="text-xs font-bold tracking-[0.3em] uppercase text-[rgb(var(--accent-rgb))] flex items-center gap-2">
                    FORMULA OF HONESTY
                    <div className="group relative">
                      <HelpCircle
                        size={14}
                        className="cursor-help opacity-60 hover:opacity-100 transition-opacity"
                      />
                      <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-[var(--bg-primary)] border border-white/10 rounded-xl text-[11px] normal-case tracking-normal font-normal text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[1000] shadow-2xl">
                        Авторський алгоритм Хоменко для перетворення болю
                        аудиторії на чисті продажі.
                      </div>
                    </div>
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1.5 font-bold uppercase tracking-wider">
                    Перетворення сирого клієнтського болю на чисті продажі
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => applyPreset('noise')}
                    className="text-[11px] font-bold uppercase tracking-widest bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] px-4 py-2 rounded-lg border border-white/5 transition"
                    type="button"
                  >
                    Пресет "Шум"
                  </button>
                  <button
                    onClick={() => applyPreset('stuck')}
                    className="text-[11px] font-bold uppercase tracking-widest bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] px-4 py-2 rounded-lg border border-white/5 transition"
                    type="button"
                  >
                    Пресет "Застряг"
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label
                      className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest"
                      htmlFor="sa-pain"
                    >
                      Що зараз реально болить, дратує або виснажує аудиторію?
                    </label>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                      Опиши реальні думки, страхи або тупики людей. Не пиши
                      «хочуть грошей». Пиши так, як вони реально думають.
                    </p>
                  </div>
                  <textarea
                    className="input-glass w-full p-4 text-sm focus:ring-1 focus:ring-[rgba(var(--accent-rgb),0.3)] outline-none resize-none leading-relaxed"
                    id="sa-pain"
                    onChange={(event) => setPain(event.target.value)}
                    placeholder="Наприклад:&#10;• «експерти вже задовбались постити контент без продажів»&#10;• «люди роками вчаться, але бояться підняти ціну»&#10;• «всі роблять вигляд успішності, але вже вигоріли»"
                    rows={5}
                    value={pain}
                  />
                </div>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label
                      className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest"
                      htmlFor="sa-goal"
                    >
                      Що саме ми продаємо або до якої дії ведемо?
                    </label>
                    <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                      Опиши фінальний продукт, оффер або конкретну цільову дію
                      після контенту.
                    </p>
                  </div>
                  <textarea
                    className="input-glass w-full p-4 text-sm focus:ring-1 focus:ring-[rgba(var(--accent-rgb),0.3)] outline-none resize-none leading-relaxed"
                    id="sa-goal"
                    onChange={(event) => setGoal(event.target.value)}
                    placeholder="Наприклад:&#10;• продаж ФОКУСУ&#10;• запис на діагностику&#10;• заявка в mastermind&#10;• написати «СТАРТ» у дірект"
                    rows={5}
                    value={goal}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label
                    className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest"
                    htmlFor="sa-custom-task"
                  >
                    Додаткові вказівки для генерації (необов'язково)
                  </label>
                  <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    Тут можна уточнити стиль, тригер або конкретну задачу для
                    моделей.
                  </p>
                </div>
                <textarea
                  className="input-glass w-full p-4 text-sm focus:ring-1 focus:ring-[rgba(var(--accent-rgb),0.3)] outline-none resize-none"
                  id="sa-custom-task"
                  onChange={(event) => setCustomTask(event.target.value)}
                  placeholder="Наприклад: більше провокації, короткі речення, стиль «оголена правда», акцент на страх втрати часу..."
                  rows={2}
                  value={customTask}
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pt-6 border-t border-white/5">
                <div className="flex flex-wrap gap-6">
                  {MODEL_LIST.map((model) => (
                    <label
                      key={model.key}
                      className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] cursor-pointer select-none"
                    >
                      <input
                        checked={models[model.key]}
                        className="accent-[rgb(var(--accent-rgb))] w-3.5 h-3.5"
                        onChange={() => toggleModel(model.key)}
                        type="checkbox"
                      />
                      <span
                        className={
                          models[model.key]
                            ? 'text-[var(--text-primary)]'
                            : 'opacity-30'
                        }
                      >
                        {model.key.toUpperCase()}
                      </span>
                    </label>
                  ))}
                </div>

                <div className="flex w-full sm:w-auto gap-3 justify-end items-center">
                  <button
                    className="px-5 py-2.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors uppercase tracking-widest"
                    onClick={handleClear}
                    type="button"
                  >
                    Очистити все
                  </button>
                  <button
                    className="hero-cta-primary w-full sm:w-auto px-10 py-3.5 text-xs font-bold uppercase tracking-[0.2em] transition-all disabled:opacity-20 shadow-xl"
                    disabled={!canGenerate}
                    onClick={() => void handleGenerate()}
                    type="button"
                  >
                    {isLoading ? 'ГЕНЕРАЦІЯ...' : 'ГЕНЕРУВАТИ ВИВІД'}
                  </button>
                </div>
              </div>
            </div>

            {/* КОНСОЛЬ РЕЗУЛЬТАТІВ */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] pl-1 opacity-60">
                Консоль паралельних відповідей моделей
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {MODEL_LIST.map((model) => {
                  const result = results[model.key]
                  const isEnabled = models[model.key]

                  if (result) {
                    console.log(
                      `[DNA][frontend] render data for ${model.key}`,
                      {
                        content: result.content,
                        generatedContent: (result as any).generatedContent,
                        hasContent: !!result.content,
                      }
                    )
                  }

                  return (
                    <div
                      key={model.key}
                      className={`rounded-2xl border flex flex-col justify-between transition-all overflow-hidden ${
                        !isEnabled
                          ? 'border-white/5 bg-black/20 opacity-20 select-none'
                          : 'border-white/5 bg-white/[0.02]'
                      }`}
                    >
                      <div className="p-4 border-b border-white/5 bg-white/[0.03] flex justify-between items-center gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold uppercase tracking-widest text-[var(--text-primary)]">
                              {model.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-widest mt-1 opacity-60">
                            {model.spec}
                          </p>
                        </div>
                        <input
                          checked={isEnabled}
                          className="accent-[rgb(var(--accent-rgb))]"
                          onChange={() => toggleModel(model.key)}
                          type="checkbox"
                        />
                      </div>

                      <div className="p-4 flex-1 min-h-[260px] flex flex-col justify-between bg-black/40">
                        {isLoading && !result && isEnabled ? (
                          <div className="flex items-center justify-center h-32 w-full">
                            <div className="flex gap-1.5">
                              <div className="w-1.5 h-1.5 bg-[rgb(var(--accent-rgb))] rounded-full animate-bounce" />
                              <div className="w-1.5 h-1.5 bg-[rgb(var(--accent-rgb))] rounded-full animate-bounce [animation-delay:0.2s]" />
                              <div className="w-1.5 h-1.5 bg-[rgb(var(--accent-rgb))] rounded-full animate-bounce [animation-delay:0.4s]" />
                            </div>
                          </div>
                        ) : generationError && !result && isEnabled ? (
                          <div className="text-[11px] text-[var(--text-muted)] bg-white/5 border border-white/5 p-4 rounded-xl font-mono leading-relaxed">
                            {renderErrorMessage(generationError)}
                          </div>
                        ) : result ? (
                          <div className="space-y-2.5">
                            <div className="flex justify-between items-center text-[11px] text-[var(--text-muted)] font-mono border-b border-white/5 pb-2 uppercase tracking-widest font-bold">
                              <span>STABLE OUTPUT</span>
                              <span>{formatResultMeta(result)}</span>
                            </div>
                            <pre className="text-[13px] text-[var(--text-secondary)] font-mono font-medium leading-relaxed whitespace-pre-wrap tracking-tight max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                              {result.content ||
                                (result as any).generatedContent ||
                                'EMPTY_TEXT_ERROR'}
                            </pre>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center text-center p-4">
                            <span className="text-xs text-[var(--text-muted)] italic font-medium uppercase tracking-wider opacity-40">
                              {isEnabled ? 'Очікування формули' : 'Вимкнено'}
                            </span>
                          </div>
                        )}
                      </div>

                      {result?.content && isEnabled && (
                        <div className="p-3 border-t border-white/5 bg-white/[0.01] flex gap-2">
                          <button
                            className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-[var(--text-secondary)] rounded-xl text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
                            onClick={() => handleCopy(result.content)}
                            type="button"
                          >
                            <Copy size={11} /> Копіювати
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

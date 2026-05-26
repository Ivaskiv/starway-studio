import { HelpCircle } from 'lucide-react'
import {
  AI_ASSISTANT_SECTION_INFO,
  AI_ASSISTANT_TABS,
} from '@/features/sales-assistant/config/contentStudio.config'

interface FormulaSectionProps {
  currentProtocolLabel: string
  pain: string
  goal: string
  customTask: string
  canGenerate: boolean
  isLoading: boolean
  onSetPain: (value: string) => void
  onSetGoal: (value: string) => void
  onSetCustomTask: (value: string) => void
  onApplyPreset: (presetType: 'noise' | 'stuck') => void
  onClear: () => void
  onGenerate: () => void
}

export function FormulaSection(props: FormulaSectionProps) {
  const dnaCoreInfo =
    AI_ASSISTANT_TABS.find((item) => item.id === 'dna')?.info ??
    AI_ASSISTANT_SECTION_INFO.formula
  return (
    <div className="dashboard-liquid-card--soft ai-section-card ai-section-card--core p-8 space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] flex items-center gap-2">
            <h3 className="ai-sidebar-label-heading">Формула Чесності</h3>
            <div className="group relative">
              <HelpCircle
                size={14}
                className="cursor-help opacity-60 hover:opacity-100 transition-opacity"
              />
              <div className="ai-floating-tooltip absolute bottom-full left-0 mb-2 w-72 p-2 bg-[var(--bg-primary)] border border-white/10 rounded-lg text-[10px] normal-case tracking-normal text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl">
                {dnaCoreInfo}
              </div>
            </div>
          </label>
        <p className="text-xs text-[var(--text-muted)] mt-1 font-medium uppercase tracking-wider opacity-70">
            Перетворення сирого клієнтського болю на чисті продажі
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => props.onApplyPreset('noise')}
            className="text-[11px] font-bold uppercase tracking-widest bg-white/5 hover:bg-white/10 text-[rgb(var(--accent-soft-rgb))] px-4 py-2 rounded-lg border border-white/5 transition"
            type="button"
          >
            Пресет "Шум"
          </button>
          <button
            onClick={() => props.onApplyPreset('stuck')}
            className="text-[11px] font-bold uppercase tracking-widest bg-white/5 hover:bg-white/10 text-[rgb(var(--accent-soft-rgb))] px-4 py-2 rounded-lg border border-white/5 transition"
            type="button"
          >
            Пресет "Застряг"
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 ai-formula-dual-grid">
        <div className="space-y-3 ai-formula-dual-col">
          <div className="space-y-1 ai-form-field-copy">
            <label
              className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest"
              htmlFor="sa-pain"
            >
              Що зараз реально болить, дратує або виснажує аудиторію?
            </label>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Опиши реальні думки, страхи або тупики людей. Не пиши «хочуть
              грошей». Пиши так, як вони реально думають.
            </p>
          </div>
          <textarea
            className="input-glass w-full p-4 text-sm focus:ring-1 focus:ring-[rgba(var(--accent-rgb),0.3)] outline-none resize-none leading-relaxed"
            id="sa-pain"
            onChange={(event) => props.onSetPain(event.target.value)}
            placeholder="Наприклад:&#10;• «експерти вже задовбались постити контент без продажів»&#10;• «люди роками вчаться, але бояться підняти ціну»&#10;• «всі роблять вигляд успішності, але вже вигоріли»"
            rows={5}
            value={props.pain}
          />
        </div>
        <div className="space-y-3 ai-formula-dual-col">
          <div className="space-y-1 ai-form-field-copy">
            <label
              className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest"
              htmlFor="sa-goal"
            >
              Що саме ми продаємо або до якої дії ведемо?
            </label>
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Опиши фінальний продукт, оффер або конкретну цільову дію після
              контенту.
            </p>
          </div>
          <textarea
            className="input-glass w-full p-4 text-sm focus:ring-1 focus:ring-[rgba(var(--accent-rgb),0.3)] outline-none resize-none leading-relaxed"
            id="sa-goal"
            onChange={(event) => props.onSetGoal(event.target.value)}
            placeholder="Наприклад:&#10;• продаж ФОКУСУ&#10;• запис на діагностику&#10;• заявка в mastermind&#10;• написати «СТАРТ» у дірект"
            rows={5}
            value={props.goal}
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
            Тут можна уточнити стиль, тригер або конкретну задачу для моделей.
          </p>
        </div>
        <textarea
          className="input-glass w-full p-4 text-sm focus:ring-1 focus:ring-[rgba(var(--accent-rgb),0.3)] outline-none resize-none"
          id="sa-custom-task"
          onChange={(event) => props.onSetCustomTask(event.target.value)}
          placeholder="Наприклад: більше провокації, короткі речення, стиль «оголена правда», акцент на страх втрати часу..."
          rows={2}
          value={props.customTask}
        />
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pt-6 border-t border-white/5">
        <div className="flex w-full sm:w-auto gap-3 justify-end items-center">
          <button
            className="px-5 py-2.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors uppercase tracking-widest"
            onClick={props.onClear}
            type="button"
          >
            Очистити все
          </button>
          <button
            className="hero-cta-primary w-full sm:w-auto px-10 py-3.5 text-xs font-bold uppercase tracking-[0.2em] transition-all disabled:opacity-20 shadow-xl"
            disabled={!props.canGenerate}
            onClick={props.onGenerate}
            type="button"
          >
            {props.isLoading ? 'ГЕНЕРАЦІЯ...' : 'ГЕНЕРУВАТИ ВИВІД'}
          </button>
        </div>
      </div>
    </div>
  )
}

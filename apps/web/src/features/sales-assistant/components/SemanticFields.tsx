import { Mic } from 'lucide-react'

type Props = {
  pain: string
  goal: string
  customTask: string
  dictationField: 'pain' | 'goal' | 'custom' | null
  onPainChange: (value: string) => void
  onGoalChange: (value: string) => void
  onCustomTaskChange: (value: string) => void
  onStartDictation: (field: 'pain' | 'goal' | 'custom') => void
}

export function SemanticFields({
  pain,
  goal,
  customTask,
  dictationField,
  onPainChange,
  onGoalChange,
  onCustomTaskChange,
  onStartDictation,
}: Props) {
  return (
    <div className="dna-input-grid">
      <div className="dna-input-col dna-input-col--focus">
        <label className="dna-input-label dna-input-label--row" htmlFor="sa-pain">
          <span>ЩО РЕАЛЬНО БОЛИТЬ АУДИТОРІЮ?</span>
          <button type="button" title="Продиктувати голосом" aria-label="Продиктувати голосом" className={`dna-dictation-btn ${dictationField === 'pain' ? 'is-recording' : ''}`} onClick={() => onStartDictation('pain')}>
            <Mic size={14} />
          </button>
        </label>
        <p className="dna-input-sub">Опиши сирий біль, напругу, роздратування та вузли опору.</p>
        <textarea id="sa-pain" className="dna-textarea" value={pain} onChange={(e) => onPainChange(e.target.value)} placeholder={'Наприклад:\n• «експерти вже задовбались постити контент без продажів»'} rows={7} maxLength={2000} />
        <span className="dna-textarea-count">{pain.length}/2000</span>
      </div>

      <div className="dna-input-col dna-input-col--focus">
        <label className="dna-input-label dna-input-label--row" htmlFor="sa-goal">
          <span>ДО ЯКОЇ ДІЇ ВЕДЕМО?</span>
          <button type="button" title="Продиктувати голосом" aria-label="Продиктувати голосом" className={`dna-dictation-btn ${dictationField === 'goal' ? 'is-recording' : ''}`} onClick={() => onStartDictation('goal')}>
            <Mic size={14} />
          </button>
        </label>
        <p className="dna-input-sub">Сформулюй один цільовий крок: покупка, запис, заявка, старт.</p>
        <textarea id="sa-goal" className="dna-textarea" value={goal} onChange={(e) => onGoalChange(e.target.value)} placeholder={'Наприклад:\n• продаж ФОКУСУ\n• запис на діагностику'} rows={7} maxLength={1500} />
        <span className="dna-textarea-count">{goal.length}/1500</span>
      </div>

      <div className="dna-input-col dna-input-col--focus">
        <label className="dna-input-label dna-input-label--row" htmlFor="sa-custom">
          <span>AI ДИРЕКТИВИ</span>
          <button type="button" title="Продиктувати голосом" aria-label="Продиктувати голосом" className={`dna-dictation-btn ${dictationField === 'custom' ? 'is-recording' : ''}`} onClick={() => onStartDictation('custom')}>
            <Mic size={14} />
          </button>
        </label>
        <p className="dna-input-sub">Тон, заборони, акценти, структура, довжина, стиль аргументації.</p>
        <textarea id="sa-custom" className="dna-textarea" value={customTask} onChange={(e) => onCustomTaskChange(e.target.value)} placeholder="Наприклад: більше провокації, короткі речення..." rows={7} maxLength={1000} />
        <span className="dna-textarea-count">{customTask.length}/1000</span>
      </div>
    </div>
  )
}

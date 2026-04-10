import { ScoreSlider } from './ScoreSlider';

interface SphereSliderProps {
  title: string;
  description?: string;
  score: number | null;
  comment: string;
  onScoreChange: (value: number) => void;
  onCommentChange: (value: string) => void;
}

export const SphereSlider = ({
  title,
  description,
  score,
  comment,
  onScoreChange,
  onCommentChange,
}: SphereSliderProps) => {
  const safeScore = score ?? 5;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        <p className="text-sm text-white/60">
          {description || 'Оцініть сферу від 1 до 10'}
        </p>
      </div>

      <div className="text-center text-5xl font-bold text-[color:rgb(var(--accent-soft-rgb))] transition-all duration-300">
        {score ?? '—'}
      </div>

      <ScoreSlider value={safeScore} onChange={onScoreChange} />

      <textarea
        value={comment}
        onChange={(event) => onCommentChange(event.target.value)}
        onKeyDown={(event) => event.stopPropagation()}
        placeholder="Коротко: чому така оцінка?"
        rows={3}
        className="w-full rounded-xl border border-[color:rgba(var(--glass-border-rgb),0.28)] bg-[color:rgba(var(--ambient-rgb-2),0.36)] px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none transition-colors focus:border-[color:rgba(var(--accent-rgb),0.55)] focus:ring-2 focus:ring-[color:rgba(var(--accent-rgb),0.2)]"
      />
    </div>
  );
};

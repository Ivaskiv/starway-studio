// frontend/src/features/actions/components/ActionProgress.tsx
// Показує, наскільки дія налаштована / виконана
interface ActionProgressProps {
  value: number; // 0–100
  label?: string;
}

export default function ActionProgress({ value, label }: ActionProgressProps) {
  return (
    <div className="space-y-1">
      {label && (
        <div className="text-xs text-white/60 flex justify-between">
          <span>{label}</span>
          <span>{value}%</span>
        </div>
      )}

      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-orange-500 transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

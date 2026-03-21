// features/ai-mentor/components/OnboardingFlow/OnboardingProgress.tsx
interface Props {
  progress: number;
  stage: string;
}

export default function OnboardingProgress({ progress, stage }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-white/60">
        <span>Онбординг</span>
        <span>{Math.round(progress)}%</span>
      </div>

      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full bg-orange-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <p className="text-xs text-white/40 capitalize">
        Поточний крок: {stage}
      </p>
    </div>
  );
}

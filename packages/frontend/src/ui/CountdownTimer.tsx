// /Users/viravira/Documents/starway-studio/packages/frontend/src/ui/CountdownTimer.tsx
export interface CountdownTimerProps {
  seconds: number;
}

export function CountdownTimer({ seconds }: CountdownTimerProps) {
  return (
    <span className="countdown">
      {Math.max(0, seconds)}s
    </span>
  );
}

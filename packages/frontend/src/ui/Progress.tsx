// /Users/viravira/Documents/starway-studio/packages/frontend/src/ui/Progress.tsx
export interface ProgressProps {
  value: number;
  color?: 'green' | 'olive' | 'red' | 'yellow' | 'orange';
}

export function Progress({ value, color = 'orange' }: ProgressProps) {
  return (
    <div className="progress" data-color={color}>
      <div className="progress-bar" style={{ width: `${value}%` }} />
    </div>
  );
}

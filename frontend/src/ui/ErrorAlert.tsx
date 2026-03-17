// fix style $100k — error alert aligned with liquid-glass system
import { AlertCircle } from 'lucide-react';

interface ErrorAlertProps {
  message: string;
}

export function ErrorAlert({ message }: ErrorAlertProps) {
  if (!message) return null;

  return (
    <div className="liquid-glass surface glass-noise flex items-center gap-3 rounded-[16px] border border-[var(--accent-error-border)] bg-[var(--accent-error-bg)] text-[var(--accent-error-text)] shadow-[0_30px_55px_rgba(var(--accent-rgb),0.25)]">
      <AlertCircle className="w-5 h-5 text-[var(--accent-error-icon)]" />
      <p className="text-sm leading-relaxed">{message}</p>
    </div>
  );
}

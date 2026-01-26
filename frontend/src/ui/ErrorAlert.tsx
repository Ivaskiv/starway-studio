// /Users/viravira/Documents/starway-studio/frontend/src/ui/ErrorAlert.tsx

import { AlertCircle } from 'lucide-react';

interface ErrorAlert {
  message: string;
}

export function ErrorAlert({ message }: ErrorAlert) {
  if (!message) return null;

  return (
    <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 flex items-start gap-2 animate-slide-up">
      <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
      <p className="text-sm text-danger">{message}</p>
    </div>
  );
}
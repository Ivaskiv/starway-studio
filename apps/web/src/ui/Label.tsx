// fix style $100k — premium label using accent-aware text tokens
import { forwardRef } from 'react';
import { cn } from '../lib/utils';

export type LabelColor = 'green' | 'olive' | 'red' | 'yellow' | 'orange';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  color?: LabelColor;
}

const palette: Record<LabelColor, string> = {
  green: 'text-[var(--accent)]',
  olive: 'text-[var(--accent-soft)]',
  red: 'text-[var(--accent)]',
  yellow: 'text-[var(--accent-strong)]',
  orange: 'text-[var(--accent-soft)]',
};

export const Label = forwardRef<HTMLLabelElement, LabelProps>(({ color = 'orange', children, className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn('text-sm font-semibold uppercase tracking-wider', palette[color], className)}
    {...props}
  >
    {children}
  </label>
));

Label.displayName = 'Label';

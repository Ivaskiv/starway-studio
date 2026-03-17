// fix style $100k — premium icon wrapper keeping gradient accents
import { cn } from '../lib/utils';
import { forwardRef, ImgHTMLAttributes } from 'react';

interface IconProps extends ImgHTMLAttributes<HTMLImageElement> {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}

const getIconPath = (name: string): string => `/icons/icons8-${name}.svg`;

export const Icon = forwardRef<HTMLImageElement, IconProps>(({ name, size = 24, color, className = '', ...props }, ref) => {
  const svgPath = getIconPath(name);

  return (
    <span className="liquid-glass surface glass-noise inline-flex items-center justify-center rounded-full border border-[var(--border-primary)] shadow-[0_10px_30px_rgba(var(--accent-rgb),0.25)] p-1">
      <img
        ref={ref}
        src={svgPath}
        alt={name}
        width={size}
        height={size}
        className={cn('block', className)}
        style={{
          filter: color ? `brightness(0) saturate(100%) invert(${color === 'white' ? '1' : '0'})` : undefined,
        }}
        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
          console.warn(`[Icon] "${name}" not found at ${svgPath}`);
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
        {...props}
      />
    </span>
  );
});

Icon.displayName = 'Icon';

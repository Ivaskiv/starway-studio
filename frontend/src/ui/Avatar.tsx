// fix style $100k — premium avatar using gradient glass tokens
import { User } from '@/features/user/types/user.types';
import { cn } from '../lib/utils';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: number;
  user?: User;
  className?: string;
}

const gradientFallback = 'bg-gradient-to-br from-[rgba(var(--accent-soft-rgb),0.85)] to-[rgba(var(--accent-rgb),0.75)]';

export default function Avatar({ src, alt, size = 32, user, className }: AvatarProps) {
  const fallbackLetter = user?.firstName
    ? user.firstName.charAt(0).toUpperCase()
    : user?.name
    ? user.name.charAt(0).toUpperCase()
    : '?';

  const sizeClasses = `w-[${size}px] h-[${size}px]`;
  const containerClasses = cn(
    'flex items-center justify-center rounded-full text-sm font-semibold text-[var(--text-primary)] shadow-[0_12px_30px_rgba(var(--accent-rgb),0.45)]',
    gradientFallback,
    sizeClasses,
    className,
  );

  if (src) {
    return (
      <img
        src={src}
        alt={alt || 'Avatar'}
        className={cn('rounded-full object-cover', sizeClasses, className)}
        width={size}
        height={size}
      />
    );
  }

  return (
    <div className={containerClasses} >
      {fallbackLetter}
    </div>
  );
}

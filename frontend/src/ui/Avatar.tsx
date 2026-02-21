// frontend/src/features/layout/components/Avatar.tsx
import React from 'react';
import { User } from '@/features/user/types/user.types';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: number;
  user?: User;
  className?: string;
  fallback?: string;
}

export default function Avatar({ src, alt, size = 32, user, className }: AvatarProps) {
  const fallbackLetter = user?.firstName
    ? user.firstName.charAt(0).toUpperCase()
    : user?.name
    ? user.name.charAt(0).toUpperCase()
    : '?';

  if (src) {
    return (
      <img
        src={src}
        alt={alt || 'Avatar'}
        className={`rounded-full object-cover ${className}`}
        width={size}
        height={size}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-br from-blue-500 to-purple-500 ${className}`}
      style={{ width: size, height: size }}
    >
      {fallbackLetter}
    </div>
  );
}

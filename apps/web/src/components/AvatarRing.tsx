'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface AvatarRingProps {
  src?: string | null;
  name?: string;
  role?: 'SUPERVISOR' | 'SCHOLAR' | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function AvatarRing({
  src,
  name = 'Scholar',
  role = 'SCHOLAR',
  size = 'md',
  className,
}: AvatarRingProps) {
  const isFaculty = role === 'SUPERVISOR';
  
  const sizeClasses = {
    sm: 'w-7 h-7 text-2xs',
    md: 'w-10 h-10 text-xs',
    lg: 'w-16 h-16 text-lg',
  };

  const ringColor = isFaculty
    ? 'border-brand shadow-sm'
    : 'border-gold shadow-sm';

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className={cn('relative shrink-0 select-none group', className)}>
      <div
        className={cn(
          'rounded-full border-2 p-[2px] transition-all duration-300 group-hover:scale-105',
          ringColor
        )}
      >
        {src ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full rounded-full object-cover bg-blue-50"
          />
        ) : (
          <div className={cn(
            "w-full h-full rounded-full flex items-center justify-center font-bold text-slate-900",
            isFaculty ? "bg-blue-50 text-brand" : "bg-amber-50 text-amber-700"
          )}>
            {initials}
          </div>
        )}
      </div>
      {/* Presence indicator */}
      <span className={cn(
        "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-surface",
        isFaculty ? "bg-brand" : "bg-gold"
      )} />
    </div>
  );
}

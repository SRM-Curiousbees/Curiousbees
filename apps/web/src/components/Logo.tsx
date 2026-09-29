import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  /** `light` renders the wordmark for dark backgrounds. */
  variant?: 'light' | 'dark' | 'auto';
}

/** CuriousBees mark + wordmark. The mark carries the brand colour; the wordmark stays typographic. */
export default function Logo({ className, size = 32, showText = false, variant = 'auto' }: LogoProps) {
  const onDark = variant === 'light';
  return (
    <span className={cn('inline-flex shrink-0 select-none items-center gap-2.5', className)}>
      <span className={cn('inline-flex shrink-0', onDark && 'rounded-lg bg-white p-1 shadow-sm')}>
        <Image
          src="/logo_icon.png"
          alt={showText ? '' : 'CuriousBees'}
          width={size * 2}
          height={size * 2}
          style={{ width: onDark ? size - 8 : size, height: onDark ? size - 8 : size }}
          className="object-contain"
          priority
        />
      </span>
      {showText && (
        <span className="flex flex-col leading-none">
          <span className={cn('text-[17px] font-semibold tracking-tight', onDark ? 'text-white' : 'text-ink')}>
            Curious<span className={onDark ? 'text-gold' : 'text-warning-500'}>Bees</span>
          </span>
          <span className={cn('mt-1 text-2xs font-medium', onDark ? 'text-white/60' : 'text-ink-muted')}>
            SRMIST Research
          </span>
        </span>
      )}
    </span>
  );
}

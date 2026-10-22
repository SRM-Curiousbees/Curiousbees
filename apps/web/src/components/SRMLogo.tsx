'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface SRMLogoProps {
  className?: string;
  variant?: 'full' | 'crest';
  theme?: 'light' | 'dark' | 'auto';
  size?: number; // scale height in px (default 48px)
}

export default function SRMLogo({
  className,
  variant = 'full',
  theme = 'light',
  size = 48,
}: SRMLogoProps) {
  const isLight = theme === 'light';

  // Exact content aspect ratio is 3.31:1 (width / height)
  const height = size;
  const width = Math.round(height * 3.31);

  const imageSrc = isLight ? '/srm_logo_white_transparent.png' : '/srm_logo_transparent.png';

  if (variant === 'crest') {
    // Crest aspect ratio is 1:1
    return (
      <div className={cn("inline-flex items-center shrink-0 select-none", className)}>
        <div 
          className="relative shrink-0 flex items-center justify-center overflow-hidden"
          style={{ width: size, height: size }}
        >
          <Image
            src={imageSrc}
            alt="SRM Crest Seal"
            width={width}
            height={height}
            className="h-full w-auto object-left object-cover max-w-none"
            priority
            unoptimized
          />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("inline-flex items-center shrink-0 select-none", className)}>
      <div 
        className="relative shrink-0 flex items-center justify-center"
        style={{ height: height, width: width }}
      >
        <Image
          src={imageSrc}
          alt="Official SRM Institute of Science & Technology Logo"
          width={width * 2}
          height={height * 2}
          className="w-full h-full object-contain filter drop-shadow-xs"
          priority
          unoptimized
        />
      </div>
    </div>
  );
}

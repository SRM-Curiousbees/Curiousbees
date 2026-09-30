import React from 'react';
import { getProfileImageUrl, handleAvatarError } from '@/lib/avatar';
import { cn } from '@/lib/utils';

export interface UserAvatarProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  user?: {
    image?: string | null;
    imageUrl?: string | null;
    avatarUrl?: string | null;
    name?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
  name?: string | null;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
}

const SIZE_CLASSES = {
  xs: 'size-6',
  sm: 'size-8',
  md: 'size-9',
  lg: 'size-12',
  xl: 'size-14',
  '2xl': 'size-16',
};

export function UserAvatar({
  user,
  name,
  src,
  size = 'md',
  className,
  alt = '',
  ...props
}: UserAvatarProps) {
  const fallbackName = name || user?.name || user?.email || 'User';
  const resolvedSrc = src || getProfileImageUrl(user);

  return (
    <img
      src={resolvedSrc}
      alt={alt || fallbackName}
      referrerPolicy="no-referrer"
      onError={(e) => handleAvatarError(e, fallbackName)}
      className={cn(
        'shrink-0 rounded-full border border-line bg-surface-muted object-cover',
        SIZE_CLASSES[size],
        className
      )}
      {...props}
    />
  );
}

import React from 'react';

/**
 * Generates an instant, offline-safe, crisp SVG data URI with SRMIST branding.
 * Eliminates reliance on external avatar services that can be blocked or rate-limited.
 */
export function getInitialsAvatarSvg(name?: string | null, bg = '0C4DA2'): string {
  const cleanName = (name || 'Researcher').trim();
  const initials = cleanName
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'R';

  const cleanBg = bg.replace('#', '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <rect width="128" height="128" rx="64" fill="#${cleanBg}"/>
  <text x="50%" y="53%" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="50" font-weight="600" fill="#ffffff" dominant-baseline="middle" text-anchor="middle">${initials}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Resolves the primary profile image url using authenticated Supabase/Google data.
 * 
 * Image Priority:
 * 1. Supabase / Google OAuth user image / DB synced image
 * 2. Instant inline SVG initials generator in SRMIST institutional blue (#0C4DA2)
 */
export function getProfileImageUrl(user: {
  image?: string | null;
  imageUrl?: string | null;
  avatarUrl?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
} | null | undefined): string {
  if (!user) {
    return getInitialsAvatarSvg('User');
  }

  // Supabase / Google OAuth dynamic imageUrl / DB cached image
  const primaryUrl = user.imageUrl || user.image || user.avatarUrl;
  if (primaryUrl && primaryUrl.trim() !== '') {
    return primaryUrl;
  }

  // Fallback to initials avatar using first name & last name / name
  const nameParts: string[] = [];
  if (user.firstName) nameParts.push(user.firstName);
  if (user.lastName) nameParts.push(user.lastName);
  
  let displayName = nameParts.join(' ').trim();
  if (!displayName && user.name) {
    displayName = user.name;
  }
  if (!displayName && user.email) {
    displayName = user.email.split('@')[0];
  }
  if (!displayName) {
    displayName = 'Researcher';
  }

  return getInitialsAvatarSvg(displayName);
}

/**
 * Error handler for avatar img elements.
 * If an external image fails to load (e.g. Google CDN rate limit/429 or network error),
 * seamlessly fall back to the inline SVG initials avatar.
 */
export function handleAvatarError(
  event: React.SyntheticEvent<HTMLImageElement>,
  fallbackName?: string | null
) {
  const target = event.currentTarget;
  target.onerror = null; // Prevent infinite loop if fallback fails
  target.src = getInitialsAvatarSvg(fallbackName);
}

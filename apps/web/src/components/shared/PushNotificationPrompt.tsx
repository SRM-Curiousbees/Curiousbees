'use client';

/**
 * Browser push notifications are disabled on the backend (no push provider configured).
 * This component intentionally renders nothing and never emits simulated notifications.
 * Real in-app notifications are served by NotificationDropdown and /notifications.
 */
export function PushNotificationPrompt() {
  return null;
}

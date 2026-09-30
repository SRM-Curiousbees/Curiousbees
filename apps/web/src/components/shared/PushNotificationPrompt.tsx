'use client';

import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';

export function PushNotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { currentUser } = useStore();

  useEffect(() => {
    // Only run on client
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    setPermission(Notification.permission);

    // If we haven't asked yet and the user hasn't dismissed it, show the prompt
    const dismissed = localStorage.getItem('push_prompt_dismissed');
    
    if (Notification.permission === 'default' && !dismissed && currentUser) {
      // Small delay so it doesn't pop up instantly on load
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentUser]);

  // Simulated Push Notification System (Runs when tab is in background)
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (permission !== 'granted') return;

    let intervalId: NodeJS.Timeout;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // When tab goes to background, simulate incoming messages/posts
        intervalId = setInterval(() => {
          const mockEvents = [
            { title: 'New Message', body: 'Dr. Jane Du sent you a message about the AI research project.' },
            { title: 'New Post', body: 'Arjun Kumar published a new paper on Knowledge Graphs.' },
            { title: 'Collaboration Request', body: 'You have a new request from the Computer Science department.' }
          ];
          const randomEvent = mockEvents[Math.floor(Math.random() * mockEvents.length)];
          
          new Notification(randomEvent.title, {
            body: randomEvent.body,
            icon: '/favicon.ico', // Assuming there's a standard favicon
          });
        }, 15000); // Simulate an event every 15 seconds while hidden
      } else {
        // When tab is active, stop simulating background notifications
        clearInterval(intervalId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [permission]);

  const handleEnable = async () => {
    if (!('Notification' in window)) {
      setShowPrompt(false);
      return;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        setShowPrompt(false);
        new Notification('Notifications are on', {
          body: 'You will be alerted to new messages and replies while CuriousBees is in the background.'
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('push_prompt_dismissed', 'true');
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          // A non-modal card: it sits below dialogs so it never covers their actions.
          role="region"
          aria-labelledby="push-prompt-title"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="fixed bottom-20 left-4 right-4 z-dropdown rounded-2xl border border-line bg-surface p-4 shadow-xl sm:bottom-6 sm:left-auto sm:right-6 sm:w-[360px]"
        >
          <div className="flex gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-muted text-ink-secondary">
              <Bell className="size-[18px]" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h3 id="push-prompt-title" className="text-sm font-semibold text-ink">Get notified in this browser?</h3>
              <p className="mt-0.5 text-sm text-ink-secondary">We&apos;ll alert you to new messages and replies while CuriousBees is open in the background.</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={handleEnable}>Turn on</Button>
                <Button size="sm" variant="ghost" onClick={handleDismiss}>Not now</Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

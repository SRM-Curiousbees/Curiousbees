'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { useState } from 'react';
import { productTransition } from '@/lib/motion';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/* Every framer-motion animation follows the OS "reduce motion" setting. */}
      <MotionConfig reducedMotion="user" transition={productTransition}>
        {children}
      </MotionConfig>
    </QueryClientProvider>
  );
}

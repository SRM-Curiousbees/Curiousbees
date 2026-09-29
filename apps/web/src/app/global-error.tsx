'use client';

import { useEffect } from 'react';

// Rendered when the root layout itself fails, so it cannot rely on the app stylesheet.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Root layout error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#F5F6F8', color: '#151A22', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
        <main style={{ maxWidth: 420, width: '100%', background: '#fff', border: '1px solid #E4E7EC', borderRadius: 12, padding: 32 }}>
          <h1 style={{ fontSize: 20, margin: 0 }}>CuriousBees couldn&apos;t load</h1>
          <p style={{ color: '#4D5564', lineHeight: 1.6, fontSize: 15 }}>
            Something went wrong while starting the app. Please try again. If it keeps happening, let the CuriousBees team know.
          </p>
          {error.digest && <p style={{ color: '#6A7383', fontSize: 13 }}>Reference: <code>{error.digest}</code></p>}
          <button
            onClick={() => reset()}
            style={{ marginTop: 8, height: 40, padding: '0 18px', borderRadius: 8, border: 0, background: '#0C4DA2', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}

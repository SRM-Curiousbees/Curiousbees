import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono, Source_Serif_4 } from 'next/font/google';
import QueryProvider from '@/components/QueryProvider';
import './globals.css';

// Interface type: IBM Plex Sans (precise, institutional, highly legible at UI sizes).
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

// Data type: identifiers, dates and numbers in tables.
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

// Editorial type: reserved for research titles and the public headline,
// following the convention of scholarly journals.
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

const description =
  'CuriousBees is the research collaboration platform for SRM Institute of Science and Technology, connecting research supervisors, scholars and institutional research leadership.';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: {
    default: 'CuriousBees | Research collaboration at SRMIST',
    template: '%s | CuriousBees',
  },
  description,
  icons: {
    icon: '/icon.png',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'CuriousBees | Research collaboration at SRMIST',
    description,
    type: 'website',
    images: ['/logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CuriousBees | Research collaboration at SRMIST',
    description,
    images: ['/logo.png'],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5F6F8' },
    { media: '(prefers-color-scheme: dark)', color: '#0C1016' },
  ],
  colorScheme: 'light dark',
};

/**
 * Applies the saved theme before first paint so there is no flash of the wrong
 * theme. Mirrors `setTheme` in store/useStore.ts (key: curiousbees-theme).
 */
const themeScript = `(function(){try{var d=localStorage.getItem('curiousbees-theme')==='dark';var r=document.documentElement;r.classList.toggle('dark',d);r.classList.toggle('light',!d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`light ${plexSans.variable} ${plexMono.variable} ${sourceSerif.variable}`}
      // The theme script adjusts class/style before hydration.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen bg-canvas font-sans text-ink antialiased">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}

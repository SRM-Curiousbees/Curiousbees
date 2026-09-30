import type { Metadata } from 'next';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { NetworkMark } from '@/components/brand/network-mark';
import { buttonVariants } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false },
};

/** 404: one node of the network has come loose. */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas px-4 py-8 sm:px-6">
      <Link href="/" className="mx-auto w-fit rounded-lg sm:mx-0" aria-label="CuriousBees home">
        <Logo showText size={30} />
      </Link>
      <main id="main-content" className="mx-auto my-auto w-full max-w-lg py-16 text-center">
        <NetworkMark variant="broken" size={112} className="mx-auto animate-fade-in" />
        <p className="mt-8 font-mono text-xs text-ink-muted">Error 404</p>
        <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-ink sm:text-5xl">This page isn&apos;t connected.</h1>
        <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-ink-secondary">
          The link may be out of date, or the page may have moved. Check the address, or go back into CuriousBees from here.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
          <Link href="/feed" className={buttonVariants({ size: 'lg' })}>
            Go to CuriousBees
          </Link>
          <Link href="/" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}

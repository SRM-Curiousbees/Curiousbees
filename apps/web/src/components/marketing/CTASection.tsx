import React from 'react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function CTASection() {
  return (
    <section aria-labelledby="cta-title" className="border-t border-line bg-brand-50/60">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center">
        <div>
          <h2 id="cta-title" className="font-serif text-2xl font-semibold tracking-tight text-ink md:text-3xl">Already registered?</h2>
          <p className="mt-2 max-w-xl text-[15px] text-ink-secondary">
            Sign in with your Google account. New to CuriousBees? Your department or the research office can add you.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/login" className={buttonVariants({ size: 'lg' })}>Sign in</Link>
          <Link href="/contact" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>Request access</Link>
        </div>
      </div>
    </section>
  );
}

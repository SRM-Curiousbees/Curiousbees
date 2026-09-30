import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Reveal } from '@/components/motion/reveal';
import ResearchNetwork from './ResearchNetwork';

/** Final scene — action. */
export default function CTASection() {
  return (
    <section aria-labelledby="cta-title" className="relative isolate overflow-hidden border-b border-line">
      <div aria-hidden className="pointer-events-none absolute -right-24 top-1/2 -z-10 hidden w-[620px] -translate-y-1/2 opacity-50 lg:block">
        <ResearchNetwork idPrefix="cbnet-cta" labels={false} className="h-auto w-full" />
      </div>
      <div className="mx-auto max-w-6xl px-4 py-28 sm:px-6 md:py-40">
        <Reveal>
          <h2 id="cta-title" className="max-w-2xl font-serif text-5xl font-semibold leading-[1.05] tracking-[-0.025em] text-ink md:text-6xl">
            Enter the research <em className="font-normal italic text-brand">network.</em>
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-secondary">
            Already registered? Sign in with Google. New to CuriousBees? Your department or the research office can add you.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/login" className={cn(buttonVariants({ size: 'lg' }), 'group')}>
              Sign in
              <ArrowRight aria-hidden className="transition-transform duration-fast group-hover:translate-x-0.5" />
            </Link>
            <Link href="/contact" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
              Request access
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

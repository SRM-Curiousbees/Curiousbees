import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-line bg-surface">
      <div
        aria-hidden
        className="honeycomb-bg pointer-events-none absolute inset-y-0 right-0 w-full [mask-image:linear-gradient(to_left,black_20%,transparent_75%)] lg:w-2/3"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <p className="animate-rise-in text-sm font-medium text-brand-700">SRM Institute of Science and Technology</p>
          <h1 className="mt-4 animate-rise-in pb-1 font-serif text-[40px] font-semibold leading-[1.1] tracking-tight text-ink [animation-delay:60ms] sm:text-5xl lg:text-[58px]">
            Research at SRMIST, <em className="font-normal italic text-brand-800">in one place.</em>
          </h1>
          <p className="mt-5 max-w-xl animate-rise-in text-lg text-ink-secondary [animation-delay:120ms]">
            Supervisors, scholars and research leadership share their work, follow doctoral progress and find collaborators across faculties.
          </p>
          <div className="mt-8 flex animate-rise-in flex-wrap gap-3 [animation-delay:180ms]">
            <Link href="/login" className={buttonVariants({ size: 'lg' })}>
              Sign in
            </Link>
            <a href="#how-it-works" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
              How it works
            </a>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[400px] animate-fade-in [animation-delay:120ms]">
          <div className="flex aspect-square items-center justify-center rounded-3xl border border-line bg-brand-50/60 shadow-sm">
            <Image
              src="/logo_icon.png"
              alt="CuriousBees emblem: a bee inside a magnifying glass beside an open book"
              width={560}
              height={560}
              priority
              className="w-[70%] object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

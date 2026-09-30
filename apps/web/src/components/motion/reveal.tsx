'use client';

import * as React from 'react';

/**
 * Reveals its content when it scrolls into view (public site only).
 *
 * The content is always rendered and in the accessibility tree; CSS hides it only
 * after the pre-paint script marks `html.js`, so without JavaScript nothing is lost.
 * Styles live in globals.css ([data-reveal]); reduced motion drops the movement.
 */
export function Reveal({
  as: Tag = 'div',
  variant = 'up',
  delay = 0,
  className,
  children,
  style,
  ...rest
}: {
  as?: React.ElementType;
  /** up: fade + rise · fade: opacity only · line: horizontal rule drawing in */
  variant?: 'up' | 'fade' | 'line';
  /** Milliseconds, for staggering siblings (e.g. index * 80). */
  delay?: number;
  className?: string;
  children?: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, 'children'>) {
  const ref = React.useRef<HTMLElement>(null);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal={variant}
      data-shown={shown ? '' : undefined}
      className={className}
      style={{ '--reveal-delay': `${delay}ms`, ...style } as React.CSSProperties}
      {...rest}
    >
      {children}
    </Tag>
  );
}

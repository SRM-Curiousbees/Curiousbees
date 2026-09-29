import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Button — the only button style in the product.
 * primary: the one main action in a view · secondary: supporting actions
 * ghost: toolbar/low-emphasis · danger: destructive confirmations · link: inline navigation
 */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-fast select-none disabled:pointer-events-none disabled:opacity-50 active:translate-y-px [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-white shadow-xs hover:bg-brand-strong',
        secondary: 'bg-surface text-ink border border-line-strong shadow-xs hover:bg-surface-muted hover:border-neutral-400',
        ghost: 'text-ink-secondary hover:bg-neutral-100 hover:text-ink',
        danger: 'bg-danger text-white shadow-xs hover:bg-danger-strong',
        link: 'text-brand underline-offset-4 hover:underline px-0 h-auto',
      },
      size: {
        sm: 'h-8 rounded-lg px-3 text-sm [&_svg]:size-4',
        md: 'h-9 rounded-lg px-3.5 text-sm [&_svg]:size-4',
        lg: 'h-11 rounded-lg px-5 text-base [&_svg]:size-[18px]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

/** Icon-only control. `label` is required: it is the accessible name and the tooltip. */
export const IconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; size?: 'sm' | 'md' }
>(({ className, label, size = 'md', type = 'button', children, ...props }, ref) => (
  <button
    ref={ref}
    type={type}
    aria-label={label}
    title={label}
    className={cn(
      'inline-flex items-center justify-center rounded-lg text-ink-secondary transition-colors duration-fast hover:bg-neutral-100 hover:text-ink disabled:opacity-50 [&_svg]:shrink-0',
      size === 'sm' ? 'size-8 [&_svg]:size-4' : 'size-9 [&_svg]:size-[18px]',
      className,
    )}
    {...props}
  >
    {children}
  </button>
));
IconButton.displayName = 'IconButton';

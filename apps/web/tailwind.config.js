/**
 * CuriousBees design system — Tailwind theme.
 *
 * All values resolve to the CSS custom properties defined in
 * src/app/globals.css (section "Design tokens"). Do not add raw hex values
 * here or in components: add or adjust a token instead.
 *
 * The standard Tailwind palettes the app already uses (slate, blue, emerald,
 * amber, rose, ...) are re-pointed at the CuriousBees scales, so every screen
 * shares one neutral scale, one brand accent and one set of status colours.
 */

/** rgb(var(--token) / alpha) so opacity modifiers like bg-brand/10 keep working. */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
const scale = (family) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((step) => [step, v(`${family}-${step}`)]),
  );

const neutral = scale('neutral');
const brand = scale('brand');
const success = scale('success');
const warning = scale('warning');
const danger = scale('danger');
const sea = scale('sea');
const plum = scale('plum');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Scales (existing utility names re-pointed at CuriousBees scales) ──
        slate: neutral,
        gray: neutral,
        neutral,
        blue: brand,
        indigo: brand,
        sky: brand,
        emerald: success,
        green: success,
        amber: warning,
        yellow: warning,
        orange: warning,
        rose: danger,
        red: danger,
        teal: sea,
        cyan: sea,
        purple: plum,
        violet: plum,
        // Fixed near-black for scrims and overlays (does not flip in dark mode).
        black: v('black'),

        // ── Semantic tokens (prefer these in new code) ──
        canvas: v('canvas'),
        surface: {
          DEFAULT: v('surface'),
          muted: v('surface-muted'),
          sunken: v('surface-sunken'),
        },
        line: {
          DEFAULT: v('line'),
          strong: v('line-strong'),
        },
        ink: {
          DEFAULT: v('ink'),
          secondary: v('ink-secondary'),
          muted: v('ink-muted'),
          inverse: v('ink-inverse'),
        },
        brand: {
          ...brand,
          DEFAULT: v('brand-700'),
          strong: v('brand-800'),
          soft: v('brand-50'),
        },
        gold: {
          DEFAULT: v('gold'),
          soft: v('gold-soft'),
          ink: v('gold-ink'),
        },
        success: { ...success, DEFAULT: v('success-600'), soft: v('success-50') },
        warning: { ...warning, DEFAULT: v('warning-600'), soft: v('warning-50') },
        danger: { ...danger, DEFAULT: v('danger-600'), soft: v('danger-50') },
        info: { DEFAULT: v('brand-600'), soft: v('brand-50') },
        sea: { ...sea, DEFAULT: v('sea-600'), soft: v('sea-50') },
        plum: { ...plum, DEFAULT: v('plum-600'), soft: v('plum-50') },

        // ── Legacy names still referenced by pages, mapped onto the tokens ──
        primary: { DEFAULT: v('brand-700'), foreground: v('surface') },
        'on-primary': v('surface'),
        secondary: v('gold'),
        error: v('danger-600'),
        destructive: v('danger-600'),
        background: v('canvas'),
        foreground: v('ink'),
        card: { DEFAULT: v('surface'), foreground: v('ink') },
        border: v('line'),
        input: v('line-strong'),
        ring: v('brand-600'),
        muted: v('surface-muted'),
        'on-surface': v('ink'),
        'on-surface-variant': v('ink-secondary'),
        'on-background': v('ink'),
        outline: v('line-strong'),
        'outline-variant': v('line'),
        'surface-container': v('neutral-100'),
        'surface-container-low': v('neutral-50'),
        'surface-container-high': v('neutral-100'),
        'surface-container-highest': v('neutral-200'),
        'srm-crimson': v('danger-800'),
        darkBg: v('canvas'),
        darkSurfaceMuted: v('surface-muted'),
        textPrimary: v('ink'),
        textSecondary: v('ink-secondary'),
        borderStroke: v('line'),
      },

      // Solid fills that carry white text. `bg-brand` resolves to a fill tuned for
      // white text in both themes, while `text-brand`/`border-brand` use the
      // readable tone of the scale. `-strong` is the hover/pressed fill.
      backgroundColor: {
        brand: { DEFAULT: v('brand-solid'), strong: v('brand-solid-hover') },
        primary: { DEFAULT: v('brand-solid'), strong: v('brand-solid-hover') },
        info: { DEFAULT: v('brand-solid'), strong: v('brand-solid-hover') },
        success: { DEFAULT: v('success-solid'), strong: v('success-solid-hover') },
        warning: { DEFAULT: v('warning-solid'), strong: v('warning-solid-hover') },
        danger: { DEFAULT: v('danger-solid'), strong: v('danger-solid-hover') },
        sea: { DEFAULT: v('sea-solid'), strong: v('sea-solid-hover') },
        plum: { DEFAULT: v('plum-solid'), strong: v('plum-solid-hover') },
        error: v('danger-solid'),
        destructive: v('danger-solid'),
      },

      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'ui-serif', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },

      // One type scale for the whole product (sizes / line-heights in px for precision).
      fontSize: {
        '2xs': ['11px', { lineHeight: '16px', letterSpacing: '0.01em' }],
        xs: ['12px', { lineHeight: '16px' }],
        sm: ['13.5px', { lineHeight: '20px' }],
        base: ['15px', { lineHeight: '24px' }],
        lg: ['17px', { lineHeight: '26px' }],
        xl: ['19px', { lineHeight: '28px', letterSpacing: '-0.01em' }],
        '2xl': ['23px', { lineHeight: '30px', letterSpacing: '-0.015em' }],
        '3xl': ['28px', { lineHeight: '34px', letterSpacing: '-0.02em' }],
        '4xl': ['34px', { lineHeight: '40px', letterSpacing: '-0.022em' }],
        '5xl': ['42px', { lineHeight: '48px', letterSpacing: '-0.025em' }],
        '6xl': ['52px', { lineHeight: '56px', letterSpacing: '-0.028em' }],
        '7xl': ['60px', { lineHeight: '64px', letterSpacing: '-0.03em' }],
        // Named roles kept for existing markup
        'display-lg': ['42px', { lineHeight: '48px', letterSpacing: '-0.025em', fontWeight: '600' }],
        'headline-xl': ['28px', { lineHeight: '34px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'headline-xl-mobile': ['23px', { lineHeight: '30px', fontWeight: '600' }],
        'headline-md': ['19px', { lineHeight: '28px', fontWeight: '600' }],
        'body-lg': ['17px', { lineHeight: '26px' }],
        'body-md': ['15px', { lineHeight: '24px' }],
        'body-sm': ['13.5px', { lineHeight: '20px' }],
        'label-md': ['13.5px', { lineHeight: '16px', fontWeight: '500' }],
        'label-caps': ['11px', { lineHeight: '16px', letterSpacing: '0.06em', fontWeight: '600' }],
      },

      letterSpacing: {
        tighter: '-0.03em',
        tight: '-0.015em',
        wide: '0.02em',
        wider: '0.04em',
        widest: '0.07em',
      },

      // Radius rule: controls 8px (lg), cards/panels 12px (xl/2xl), dialogs 14px (3xl), pills full.
      borderRadius: {
        none: '0',
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
        xl: '10px',
        '2xl': '12px',
        '3xl': '14px',
        full: '9999px',
      },

      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
        inner: 'inset 0 1px 2px rgb(var(--neutral-900) / 0.06)',
        none: 'none',
      },

      backdropBlur: {
        sm: '2px',
        DEFAULT: '6px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        '2xl': '14px',
        '3xl': '16px',
      },

      spacing: {
        unit: '4px',
        'container-max': '1440px',
        gutter: '24px',
        'margin-desktop': '40px',
        'margin-tablet': '24px',
        'margin-mobile': '16px',
        'stack-xs': '4px',
        'stack-sm': '8px',
        'stack-md': '16px',
        'stack-lg': '32px',
        'stack-xl': '64px',
        sidebar: 'var(--layout-sidebar)',
        header: 'var(--layout-header)',
      },

      maxWidth: {
        content: 'var(--layout-content)',
        prose: '68ch',
      },

      zIndex: {
        raised: '10',
        sticky: '20',
        header: '30',
        sidebar: '40',
        dropdown: '50',
        overlay: '60',
        modal: '70',
        toast: '80',
        tooltip: '90',
      },

      transitionTimingFunction: {
        DEFAULT: 'var(--ease-out)',
        out: 'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
        expressive: 'var(--ease-expressive)',
      },
      transitionDuration: {
        DEFAULT: 'var(--duration-base)',
        fast: 'var(--duration-fast)',
        base: 'var(--duration-base)',
        slow: 'var(--duration-slow)',
        scene: 'var(--duration-scene)',
      },

      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'rise-in': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        shimmer: { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } },
        'pulse-fast': { '0%, 100%': { opacity: '0.35' }, '50%': { opacity: '0.8' } },
        shake: { '0%, 100%': { transform: 'rotate(0deg)' }, '25%, 75%': { transform: 'rotate(-8deg)' }, '50%': { transform: 'rotate(8deg)' } },
        marquee: { '0%': { transform: 'translateX(0%)' }, '100%': { transform: 'translateX(-50%)' } },
        flow: { '0%': { 'stroke-dashoffset': '20' }, '100%': { 'stroke-dashoffset': '0' } },
      },
      animation: {
        // `backwards` (not `both`): once finished, the animation stops applying,
        // so page wrappers don't keep a stacking context that would trap modals.
        'fade-in': 'fade-in var(--duration-base) var(--ease-out) backwards',
        'rise-in': 'rise-in var(--duration-slow) var(--ease-out) backwards',
        shimmer: 'shimmer 1.6s linear infinite',
        'pulse-fast': 'pulse-fast 2s ease-in-out infinite',
        'pulse-slow': 'pulse-fast 6s ease-in-out infinite',
        shake: 'shake 0.4s ease-in-out',
        marquee: 'marquee 35s linear infinite',
        flow: 'flow 2s linear infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

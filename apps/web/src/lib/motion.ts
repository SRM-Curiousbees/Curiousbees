/**
 * Motion tokens for framer-motion. Mirrors the CSS custom properties in
 * globals.css (--duration-*, --ease-*) so CSS and JS animations share one timing system.
 *
 * Product screens use fast/base/slow with `standard`. Marketing scenes may use
 * `scene` with `expressive`. Nothing else: no one-off durations.
 */
export const duration = {
  fast: 0.12,
  base: 0.18,
  slow: 0.28,
  scene: 0.7,
} as const;

export const ease = {
  standard: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
  expressive: [0.16, 1, 0.3, 1],
} as const;

/** Default transition for product UI (dialogs, menus, content changes). */
export const productTransition = { duration: duration.base, ease: ease.standard };

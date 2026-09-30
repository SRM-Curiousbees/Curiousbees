# CuriousBees design system

"Research infrastructure, elevated." Calm, precise and institutional; editorial where it
earns attention (research titles, the public site), quiet everywhere else.

Source of truth: `apps/web/src/app/globals.css` (tokens) and `apps/web/tailwind.config.js`
(utilities). Components live in `apps/web/src/components/ui`. Do not add raw hex values or
one-off durations in components: add or adjust a token.

## 1. Principles

1. **The user's work comes first.** Product screens are for scanning and acting; motion and
   ornament are reserved for the public site.
2. **One component per job.** One button system, one dialog, one badge, one page header.
3. **Hierarchy by type, not by boxes.** Prefer headings, spacing and dividers to nested cards.
4. **Honest content.** Never show fabricated data, statuses or claims. Empty is better than fake.
5. **Both themes, always.** Every screen must work in light and dark (see §9).

## 2. Colour

Colours are CSS custom properties holding RGB channels, consumed as
`rgb(var(--token) / <alpha>)`, so opacity modifiers work (`bg-brand/10`).

### Semantic tokens (use these first)

| Token | Utility | Use |
|---|---|---|
| `--canvas` | `bg-canvas` | Page background |
| `--surface` | `bg-surface` | Cards, dialogs, sidebar, inputs |
| `--surface-muted` | `bg-surface-muted` | Table headers, hover rows, footers of dialogs |
| `--surface-sunken` | `bg-surface-sunken` | Wells, code |
| `--line`, `--line-strong` | `border-line`, `border-line-strong` | Dividers; input borders |
| `--ink`, `--ink-secondary`, `--ink-muted` | `text-ink`, `text-ink-secondary`, `text-ink-muted` | Primary text, body, metadata |
| `--ink-inverse` | `text-ink-inverse` | Text on `bg-ink` |
| `--gold` | `bg-gold` | Brand accent: active nav bar, small highlights. Never a large fill |

### Scales

`neutral`, `brand` (SRM blue, anchored at 700 = #0C4DA2), `success`, `warning`, `danger`,
`sea`, `plum`, each 50–950. Legacy Tailwind names are re-pointed: `slate/gray → neutral`,
`blue/indigo/sky → brand`, `emerald/green → success`, `amber/yellow/orange → warning`,
`rose/red → danger`, `teal/cyan → sea`, `purple/violet → plum`.

Rules of thumb:

- Tinted chip: `bg-{scale}-50 text-{scale}-700 ring-{scale}-200` (the `Badge` component).
- Links and emphasis: `text-brand` (brand-700 in light, a light blue in dark).
- Solid fills that carry white text: `bg-brand`, `bg-success`, `bg-warning`, `bg-danger`,
  `bg-sea`, `bg-plum`, with `hover:bg-{name}-strong`. These resolve to `--{name}-solid`
  tokens tuned for white text in both themes. Never use `bg-blue-600 text-white` directly.
- Neutral solid (inverse): `bg-ink text-ink-inverse`.
- Scrims: `bg-black/45` (`black` is fixed in both themes).

### Categories

Event and post categories use the categorical scales: conferences brand, workshops sea,
seminars/talks plum, thesis/PhD warning, competitions success (`lib/event-categories.ts`).

## 3. Typography

| Family | Token | Use |
|---|---|---|
| IBM Plex Sans | `font-sans` | All interface text |
| Source Serif 4 | `font-serif` | Research titles, the public headline and section titles. Never for UI labels |
| IBM Plex Mono | `font-mono` | Identifiers, keyboard hints, scene indices on the public site |

Scale (px, line height): `2xs` 11/16 · `xs` 12/16 · `sm` 13.5/20 · `base` 15/24 · `lg` 17/26 ·
`xl` 19/28 · `2xl` 23/30 · `3xl` 28/34 · `4xl` 34/40 · `5xl` 42/48 · `6xl` 52/56 · `7xl` 60/64.

- Page title: `PageHeader` → `text-2xl sm:text-3xl font-semibold`.
- Card title: `text-base font-semibold`.
- Body: `text-sm` (dense product UI) or `text-base` (reading).
- Metadata: `text-xs text-ink-muted`.
- Weights: 400, 500, 600 only. No uppercase labels, no letter-spaced micro caps.
- Sentence case everywhere, including buttons and headings.

## 4. Space, layout, shape

- Spacing uses the Tailwind 4px scale. Page gutters `px-4 sm:px-6 lg:px-8`; section rhythm
  `space-y-6` in product, `py-20 md:py-28` on the public site.
- Content width: `max-w-content` (1240px) for the portal, `max-w-6xl` for marketing,
  `max-w-prose` (68ch) for reading text.
- Shell: sidebar `w-sidebar` (256px, persistent from `lg`), header `h-header` (60px).
- Radius rule: controls 8px (`rounded-lg`), cards and panels 12px (`rounded-2xl`), dialogs
  14px (`rounded-3xl`), chips and avatars full.
- Elevation: `shadow-xs` on cards, `shadow-lg` on menus, `shadow-2xl` on dialogs. Shadows
  are ink-tinted in light and black-based in dark.
- z-index: raised 10 · sticky 20 · header 30 · sidebar 40 · dropdown 50 · overlay 60 ·
  modal 70 · toast 80 · tooltip 90.
- Grids: always give the first column `minmax(0, 1fr)` (`grid-cols-1`) so wide content
  scrolls inside its container instead of widening the page.

## 5. Components

| Component | File | Notes |
|---|---|---|
| `Button`, `IconButton`, `buttonVariants` | `ui/button.tsx` | Variants primary, secondary, ghost, danger, link; sizes sm/md/lg; `loading`. `IconButton` requires `label` |
| `Badge`, `StatusBadge` | `ui/badge.tsx` | `StatusBadge` maps workflow enums to human labels; never render raw enums |
| `Card`, `CardHeader`, `CardBody` | `ui/card.tsx` | Use only when a group is self-contained |
| `PageHeader` | `ui/page-header.tsx` | Every product page starts with it: meta, title, description, actions |
| `EmptyState` | `ui/empty-state.tsx` | What is missing, why, what to do next |
| `Skeleton` | `ui/skeleton.tsx` | Match the final layout's shape |
| `Dialog` | `ui/dialog.tsx` | Portal-rendered, focus-trapped, stackable; `side="right"` for long forms; footer for actions |
| `ActionMenu` | `ui/action-menu.tsx` | Row "more actions" menu, keyboard navigable, portal-positioned |
| `Field`, `DetailItem` | `ui/field.tsx` | Label + control + hint/error; read-only label/value pairs |
| `StatusScreen` | `ui/status-screen.tsx` | Full-page access and error states |
| `NetworkMark` | `brand/network-mark.tsx` | The node-network motif (loader, 404, public site) |
| `Reveal` | `motion/reveal.tsx` | Scroll-entry reveal for the public site |

Form controls use the `cb-input` class. Tabs use `role="tablist"`/`role="tab"` with
`aria-selected`: underline tabs for page sections, segmented tabs for view switches.

## 6. States

- **Loading:** skeletons shaped like the content; the portal shows the branded loader
  (network mark, progress bar, "Still connecting…" after 5s, retry after 15s).
- **Empty:** `EmptyState` with a next action when the user can do something about it.
- **Error:** say what failed and what to do; never show stack traces or internal codes.
- **Permission:** `/unauthorized` (with context) for wrong-role visits; admins are sent to
  their dashboard from research routes.
- **Focus:** one outline for every control: 2px `brand-600`, 2px offset, keyboard only.
- **Disabled:** 50% opacity, no pointer events, plus a `title`/hint explaining why when
  the reason is not obvious.

## 7. Motion

Tokens (CSS in `globals.css`, JS mirror in `lib/motion.ts`):

| Token | Value | Use |
|---|---|---|
| `--duration-fast` / `duration.fast` | 120ms | Hover, press, colour changes |
| `--duration-base` / `duration.base` | 180ms | Menus, dialogs, content swaps |
| `--duration-slow` / `duration.slow` | 280ms | Side panels, page entrance |
| `--duration-scene` / `duration.scene` | 700ms | Public-site reveals only |
| `--ease-out` / `ease.standard` | cubic-bezier(.22,1,.36,1) | Default |
| `--ease-in-out` / `ease.inOut` | cubic-bezier(.65,0,.35,1) | Indeterminate progress, looping indicators |
| `--ease-expressive` / `ease.expressive` | cubic-bezier(.16,1,.3,1) | Public-site scenes |

Two intensities:

- **Public site:** composed opening sequence, scroll reveals, scroll-linked scenes, the
  animated network motif. Still: transform and opacity only, no scroll hijacking.
- **Product:** short entrances for pages, dialogs and menus; no loops except loaders.

Rules: animate `transform` and `opacity` only; never delay navigation; content is always in
the DOM before it animates; everything honours `prefers-reduced-motion` (CSS media query
and `MotionConfig reducedMotion="user"`), falling back to opacity or no motion.

## 8. Responsive

Test at 1440, 1280, 1024, 768, 430, 390 and 375px. Below `lg` the sidebar becomes a drawer;
below `sm`, tables collapse secondary columns into the first cell and row actions move into
the `ActionMenu`; dialogs become bottom sheets; the feed gets a bottom tab bar. No page may
scroll horizontally.

## 9. Dark mode

Dark mode re-tunes every scale, so ordinary utilities adapt without `dark:` variants.

- Use `bg-surface`, never `bg-white`, for surfaces. `bg-white` means "white in both themes"
  (toggle knobs, the logo tile).
- Solid fills with white text use the solid tokens (`bg-brand`, `bg-success`, …).
- Panels that must look identical in both themes (the login brand panel, deep navy heroes,
  code blocks, yellow fills with dark text) take the `theme-static` class, which restores
  the light palette inside them.
- Do not add `dark:` variants; fix the token instead.

## 10. Content

Plain, specific, sentence case. Say what happened and what to do next. Use the product's
real nouns: scholar, supervisor, research leadership, workspace, milestone, progress report,
supervision request, Curious Nexus. Never invent capabilities, numbers or endorsements.

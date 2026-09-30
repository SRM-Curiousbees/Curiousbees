import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * The CuriousBees motif: points on a hexagon (the honeycomb) joined to a centre,
 * i.e. many researchers connected through one place. Pure SVG + CSS, no JavaScript.
 *
 * variant
 *  - static:  drawn, no motion
 *  - cycle:   assembles, holds, fades, repeats (loading)
 *  - broken:  one node has come loose (not found / disconnected)
 */
const CENTER = { x: 32, y: 32 };
const RING = [
  { x: 32, y: 12 },
  { x: 49.3, y: 22 },
  { x: 49.3, y: 42 },
  { x: 32, y: 52 },
  { x: 14.7, y: 42 },
  { x: 14.7, y: 22 },
];
const LOOSE = { x: 58, y: 53 };

export function NetworkMark({
  size = 40,
  variant = 'static',
  className,
  label,
}: {
  size?: number;
  variant?: 'static' | 'cycle' | 'broken';
  className?: string;
  /** Accessible name. Omit when the mark is decorative. */
  label?: string;
}) {
  const nodes = RING.map((p, i) => (variant === 'broken' && i === 2 ? LOOSE : p));
  const spokes = nodes.map((p, i) => ({ d: `M${CENTER.x} ${CENTER.y}L${p.x} ${p.y}`, loose: variant === 'broken' && i === 2 }));
  const rim = [
    [0, 1],
    [3, 4],
    [4, 5],
    [5, 0],
  ].map(([a, b]) => `M${nodes[a].x} ${nodes[a].y}L${nodes[b].x} ${nodes[b].y}`);

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn('shrink-0 overflow-visible', variant === 'cycle' && 'cb-net-cycle', className)}
    >
      <g strokeWidth={1.6}>
        {rim.map((d, i) => (
          <path key={`r${i}`} d={d} pathLength={1} className="cb-net-edge stroke-line-strong" style={{ '--seq': `${400 + i * 90}ms` } as React.CSSProperties} />
        ))}
        {spokes.map((s, i) => (
          <path
            key={`s${i}`}
            d={s.d}
            pathLength={s.loose ? undefined : 1}
            strokeDasharray={s.loose ? '2 3' : undefined}
            className={cn(s.loose ? 'fill-none stroke-neutral-400' : 'cb-net-edge stroke-brand-400')}
            style={{ '--seq': `${i * 70}ms` } as React.CSSProperties}
          />
        ))}
      </g>
      {nodes.map((p, i) => (
        <circle
          key={`n${i}`}
          cx={p.x}
          cy={p.y}
          r={i === 0 ? 4 : 3.2}
          className={cn('cb-net-node', i === 0 ? 'fill-gold' : variant === 'broken' && i === 2 ? 'fill-neutral-400' : 'fill-brand-600')}
          style={{ '--seq': `${120 + i * 70}ms` } as React.CSSProperties}
        />
      ))}
      <circle cx={CENTER.x} cy={CENTER.y} r={6} className="cb-net-node fill-surface stroke-brand-600" strokeWidth={2.2} />
    </svg>
  );
}

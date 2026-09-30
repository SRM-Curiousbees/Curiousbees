import * as React from 'react';

/**
 * Hero figure: an illustrative research network. Four clusters (supervisors,
 * scholars, publications, events) connect through a shared workspace. It
 * illustrates how the product is organised; it is not data.
 *
 * Server-rendered SVG. The drawing sequence is CSS; the travelling signals are SVG
 * <animateMotion>; both are hidden or stilled for reduced motion (globals.css).
 */
type Node = { x: number; y: number; r: number; key?: boolean };

const CLUSTERS: { label: string; labelAt: [number, number]; nodes: Node[]; edges: [number, number][] }[] = [
  {
    label: 'Supervisors',
    labelAt: [150, 186],
    nodes: [{ x: 150, y: 150, r: 6, key: true }, { x: 95, y: 118, r: 3 }, { x: 112, y: 202, r: 3 }, { x: 204, y: 108, r: 3.5 }, { x: 208, y: 190, r: 3 }],
    edges: [[0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [3, 4]],
  },
  {
    label: 'Scholars',
    labelAt: [472, 172],
    nodes: [{ x: 472, y: 136, r: 6, key: true }, { x: 420, y: 92, r: 3 }, { x: 532, y: 100, r: 3.5 }, { x: 548, y: 176, r: 3 }, { x: 420, y: 176, r: 3 }],
    edges: [[0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [2, 3]],
  },
  {
    label: 'Publications',
    labelAt: [160, 442],
    nodes: [{ x: 160, y: 406, r: 5, key: true }, { x: 100, y: 380, r: 3 }, { x: 108, y: 462, r: 3 }, { x: 214, y: 468, r: 3.5 }, { x: 226, y: 374, r: 3 }],
    edges: [[0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [3, 4]],
  },
  {
    label: 'Events',
    labelAt: [476, 456],
    nodes: [{ x: 476, y: 420, r: 5, key: true }, { x: 420, y: 378, r: 3 }, { x: 540, y: 380, r: 3 }, { x: 548, y: 462, r: 3.5 }, { x: 424, y: 470, r: 3 }],
    edges: [[0, 1], [0, 2], [0, 3], [0, 4], [1, 4], [2, 3]],
  },
];

const HUB = { x: 320, y: 282 };

// Curved bridges from each cluster's key node to the shared workspace.
const BRIDGES = [
  'M150 150 Q 252 188 320 282',
  'M472 136 Q 388 186 320 282',
  'M160 406 Q 242 334 320 282',
  'M476 420 Q 398 336 320 282',
];

// Faint links between clusters: collaboration across groups.
const CROSSLINKS = ['M204 108 Q 312 64 420 92', 'M214 468 Q 320 520 424 470'];

const seq = (ms: number) => ({ '--seq': `${ms}ms` }) as React.CSSProperties;

export default function ResearchNetwork({
  className,
  idPrefix = 'cbnet',
  labels = true,
}: {
  className?: string;
  idPrefix?: string;
  /** Hide the text labels when the figure is used as a background. */
  labels?: boolean;
}) {
  const id = (name: string) => `${idPrefix}-${name}`;
  return (
    <svg viewBox="0 0 640 560" className={className} aria-hidden focusable="false">
      <defs>
        <pattern id={id('dots')} width="16" height="16" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.9" className="fill-neutral-300" />
        </pattern>
        <radialGradient id={id('fade')} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id={id('mask')}>
          <rect width="640" height="560" fill={`url(#${id('fade')})`} />
        </mask>
      </defs>

      <rect width="640" height="560" fill={`url(#${id('dots')})`} mask={`url(#${id('mask')})`} className="cb-seq-fade" style={seq(0)} />

      <g className="cb-net-float">
        {/* Links between groups */}
        <g strokeWidth={1} strokeDasharray="3 5" className="stroke-neutral-300">
          {CROSSLINKS.map((d, i) => (
            <path key={d} d={d} fill="none" className="cb-seq-fade" style={seq(1500 + i * 150)} />
          ))}
        </g>

        {/* Bridges into the shared workspace */}
        <g strokeWidth={1.4} className="stroke-brand-400">
          {BRIDGES.map((d, i) => (
            <path key={d} d={d} pathLength={1} className="cb-net-edge cb-net-draw" style={seq(900 + i * 140)} />
          ))}
        </g>

        {CLUSTERS.map((cluster, ci) => (
          <g key={cluster.label}>
            <g strokeWidth={1} className="stroke-line-strong">
              {cluster.edges.map(([a, b], ei) => {
                const p = cluster.nodes[a];
                const q = cluster.nodes[b];
                return (
                  <path
                    key={`${a}-${b}`}
                    d={`M${p.x} ${p.y}L${q.x} ${q.y}`}
                    pathLength={1}
                    className="cb-net-edge cb-net-draw"
                    style={seq(300 + ci * 120 + ei * 45)}
                  />
                );
              })}
            </g>
            {cluster.nodes.map((n, ni) =>
              n.key ? (
                <g key={ni}>
                  <circle cx={n.x} cy={n.y} r={n.r * 3} className="cb-net-halo fill-brand-500" style={seq(1800 + ci * 600)} />
                  <circle cx={n.x} cy={n.y} r={n.r} className="cb-net-pop fill-brand-600" style={seq(250 + ci * 120)} />
                </g>
              ) : (
                <circle key={ni} cx={n.x} cy={n.y} r={n.r} className="cb-net-pop fill-neutral-400" style={seq(320 + ci * 120 + ni * 50)} />
              ),
            )}
            {labels && (
              <text
                x={cluster.labelAt[0]}
                y={cluster.labelAt[1]}
                textAnchor="middle"
                className="cb-seq-fade fill-ink-muted font-mono text-[11px]"
                style={seq(1350 + ci * 90)}
              >
                {cluster.label}
              </text>
            )}
          </g>
        ))}

        {/* The shared workspace */}
        <g>
          <circle cx={HUB.x} cy={HUB.y} r={22} className="cb-net-halo fill-gold" style={seq(1600)} />
          <circle cx={HUB.x} cy={HUB.y} r={11} strokeWidth={2.4} className="cb-net-pop fill-surface stroke-brand-600" style={seq(1100)} />
          <circle cx={HUB.x} cy={HUB.y} r={4.5} className="cb-net-pop fill-gold" style={seq(1250)} />
          {labels && (
            <text x={HUB.x} y={HUB.y + 44} textAnchor="middle" className="cb-seq-fade fill-ink font-mono text-[11px] font-medium" style={seq(1500)}>
              Shared workspace
            </text>
          )}
        </g>

        {/* Signals travelling into the workspace */}
        {BRIDGES.slice(0, 3).map((d, i) => (
          <circle key={`sig-${i}`} r={2.6} className="cb-net-signal fill-gold" opacity={0}>
            <animateMotion dur={`${6 + i * 1.3}s`} begin={`${2.2 + i * 1.1}s`} repeatCount="indefinite" path={d} />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              keyTimes="0;0.12;0.85;1"
              dur={`${6 + i * 1.3}s`}
              begin={`${2.2 + i * 1.1}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </g>
    </svg>
  );
}

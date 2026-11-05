import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Paleta categórica dos gráficos — derivada da marca e validada para
 * separação em daltonismo (scripts de dataviz). Sempre acompanhada de
 * rótulo direto + traço distinto, nunca cor isolada.
 */
export const SERIES = ['#B8864A', '#4F7A45', '#3D5A80'] as const
const DASH = ['', '5 4', '1.5 3.5']

export interface Series {
  name: string
  values: number[]
}

export function LineChart({ labels, series, height = 240, className }: { labels: string[]; series: Series[]; height?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [W, setW] = useState(720)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const H = height
  const pad = { l: 30, r: W < 420 ? 74 : 104, t: 12, b: 26 }
  const max = Math.max(1, ...series.flatMap((s) => s.values))
  const niceMax = Math.ceil(max / 5) * 5 || 5
  const x = (i: number) => pad.l + (labels.length <= 1 ? 0 : (i * (W - pad.l - pad.r)) / (labels.length - 1))
  const y = (v: number) => pad.t + (1 - v / niceMax) * (H - pad.t - pad.b)
  const ticks = [0, niceMax / 2, niceMax]
  // rótulos diretos sem colisão
  const ends = useMemo(() => {
    const raw = series.map((s, i) => ({ i, y: y(s.values[s.values.length - 1] ?? 0) })).sort((a, b) => a.y - b.y)
    for (let k = 1; k < raw.length; k++) if (raw[k].y - raw[k - 1].y < 14) raw[k].y = raw[k - 1].y + 14
    return Object.fromEntries(raw.map((r) => [r.i, r.y]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, niceMax, W])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <div className="mb-4 flex flex-wrap gap-5 text-[11.5px] text-muted">
        {series.map((s, i) => (
          <span key={s.name} className="flex items-center gap-2">
            <svg width="20" height="6">
              <line x1="0" y1="3" x2="20" y2="3" stroke={SERIES[i]} strokeWidth="2" strokeDasharray={DASH[i]} />
            </svg>
            {s.name}
          </span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        className="block overflow-visible"
        role="img"
        aria-label={`Gráfico: ${series.map((s) => s.name).join(', ')}`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect()
          const px = ((e.clientX - r.left) / r.width) * W
          const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (labels.length - 1))
          setHover(Math.max(0, Math.min(labels.length - 1, i)))
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="rgb(var(--nb-line))" strokeWidth="1" />
            <text x={pad.l - 10} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="rgb(var(--nb-muted))">
              {t}
            </text>
          </g>
        ))}
        {labels.map((l, i) =>
          labels.length <= 8 || i % Math.ceil(labels.length / 8) === 0 || i === labels.length - 1 ? (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="rgb(var(--nb-muted))">
              {l}
            </text>
          ) : null,
        )}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="rgb(var(--nb-ink) / .25)" strokeWidth="1" />}
        {series.map((s, si) => (
          <g key={s.name}>
            <path d={s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ')} fill="none" stroke={SERIES[si]} strokeWidth="2" strokeDasharray={DASH[si]} strokeLinejoin="round" strokeLinecap="round" />
            <text x={W - pad.r + 10} y={ends[si] + 3.5} fontSize="10.5" fill="rgb(var(--nb-ink))">
              {s.name} · {s.values[s.values.length - 1] ?? 0}
            </text>
            {hover !== null && <circle cx={x(hover)} cy={y(s.values[hover] ?? 0)} r="4" fill={SERIES[si]} stroke="#fff" strokeWidth="2" />}
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-8 z-10 min-w-[150px] border border-line bg-white px-3 py-2.5 text-[11.5px] shadow-lg"
          style={{ left: `clamp(0px, calc(${(x(hover) / W) * 100}% + 12px), calc(100% - 170px))` }}
        >
          <p className="mb-1.5 text-muted">{labels[hover]}</p>
          {series.map((s, si) => (
            <p key={s.name} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: SERIES[si] }} />
                {s.name}
              </span>
              <span className="tabular-nums">{s.values[hover]}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

/** Barras horizontais com rótulo e valor — distribuição por categoria. */
export function BarList({ items, total, className }: { items: { label: string; value: number }[]; total?: number; className?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  const sum = total ?? items.reduce((a, b) => a + b.value, 0)
  return (
    <div className={cn('space-y-3', className)}>
      {items.map((it) => (
        <div key={it.label} className="group" title={`${it.label}: ${it.value} (${sum ? Math.round((it.value / sum) * 100) : 0}%)`}>
          <div className="mb-1 flex items-baseline justify-between gap-4 text-[12px]">
            <span className="truncate text-ink/85">{it.label}</span>
            <span className="tabular-nums text-muted">
              {it.value} <span className="text-[10.5px]">· {sum ? Math.round((it.value / sum) * 100) : 0}%</span>
            </span>
          </div>
          <div className="h-[6px] bg-mineral/70">
            <div className="h-full rounded-r-[3px] bg-wood transition-all duration-700 group-hover:bg-olive" style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

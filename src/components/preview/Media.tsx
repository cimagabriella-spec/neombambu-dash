import { ImageOff } from 'lucide-react'
import type { MouseEvent } from 'react'
import type { Asset, Comment } from '@/lib/types'
import { cn } from '@/lib/utils'

export interface PinProps {
  pins?: (Comment & { index: number })[]
  annotate?: boolean
  onPin?: (assetId: string, x: number, y: number) => void
  activePin?: string | null
  onPinClick?: (id: string) => void
}

/** Mídia com proporção fixa, sem distorção (object-cover dentro do frame da rede). */
export function Media({ asset, ratio, className, fit = 'cover', pins, annotate, onPin, activePin, onPinClick, autoPlay }: { asset?: Asset; ratio: number; className?: string; fit?: 'cover' | 'contain'; autoPlay?: boolean } & PinProps) {
  const click = (e: MouseEvent<HTMLDivElement>) => {
    if (!annotate || !asset || !onPin) return
    const r = e.currentTarget.getBoundingClientRect()
    onPin(asset.id, +(((e.clientX - r.left) / r.width) * 100).toFixed(2), +(((e.clientY - r.top) / r.height) * 100).toFixed(2))
  }
  return (
    <div className={cn('relative w-full overflow-hidden bg-[#efefef]', annotate && 'cursor-crosshair', className)} style={{ aspectRatio: String(ratio) }} onClick={click}>
      {!asset ? (
        <div className="grain absolute inset-0 grid place-items-center text-ink/30">
          <div className="text-center">
            <ImageOff className="mx-auto h-6 w-6" strokeWidth={1} />
            <p className="mt-2 text-[11px]">Arte ainda não anexada</p>
          </div>
        </div>
      ) : asset.kind === 'video' ? (
        <video src={asset.url} className={cn('absolute inset-0 h-full w-full', fit === 'cover' ? 'object-cover' : 'object-contain')} muted loop playsInline autoPlay={autoPlay} controls={!annotate} />
      ) : (
        <img src={asset.url} alt={asset.name} draggable={false} className={cn('absolute inset-0 h-full w-full select-none', fit === 'cover' ? 'object-cover' : 'object-contain')} />
      )}
      {asset &&
        pins
          ?.filter((p) => p.pin?.assetId === asset.id)
          .map((p) => (
            <button
              key={p.id}
              onClick={(e) => {
                e.stopPropagation()
                onPinClick?.(p.id)
              }}
              className={cn(
                'absolute z-10 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 text-[10px] font-medium shadow-md transition-transform',
                p.resolved ? 'border-white bg-olive/80 text-white' : 'border-white bg-ink text-paper',
                activePin === p.id && 'scale-125 ring-2 ring-sand',
              )}
              style={{ left: `${p.pin!.x}%`, top: `${p.pin!.y}%` }}
              title={p.body}
            >
              {p.index}
            </button>
          ))}
      {annotate && <div className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-sand/80" />}
    </div>
  )
}

/** Proporção real da arte, limitada ao que cada rede aceita. */
export function clampRatio(a: Asset | undefined, min: number, max: number, fallback: number) {
  if (!a?.width || !a?.height) return fallback
  return Math.min(max, Math.max(min, a.width / a.height))
}

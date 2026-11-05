import { Film, ImageOff, Instagram, Layers, Linkedin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { channelLabel, formatLabel, STATUS_TONE, statusLabel } from '@/lib/constants'
import type { Channel, Content, Status } from '@/lib/types'
import { cn, fmtDate } from '@/lib/utils'
import { useApp } from '@/store/app'

export function Logo({ className, light = true }: { className?: string; light?: boolean }) {
  // Wordmark provisório — substituir pelo SVG oficial da marca em /public
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <svg viewBox="0 0 24 28" className="h-6 w-5" aria-hidden>
        <g stroke={light ? '#D8CFBF' : '#1C1C1A'} strokeWidth="1.3" fill="none">
          <line x1="5" y1="3" x2="5" y2="25" />
          <line x1="12" y1="1" x2="12" y2="27" />
          <line x1="19" y1="3" x2="19" y2="25" />
          <line x1="3.5" y1="10" x2="6.5" y2="10" />
          <line x1="10.5" y1="17" x2="13.5" y2="17" />
          <line x1="17.5" y1="8" x2="20.5" y2="8" />
        </g>
      </svg>
      <span className={cn('font-display text-[15px] font-light tracking-brand', light ? 'text-paper' : 'text-ink')}>NEOBAMBU</span>
    </div>
  )
}

export function StatusBadge({ status, className, size = 'md' }: { status: Status; className?: string; size?: 'sm' | 'md' }) {
  const t = STATUS_TONE[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap font-normal', size === 'sm' ? 'text-[10.5px]' : 'text-[11.5px]', t.text, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', t.dot)} />
      {statusLabel(status)}
    </span>
  )
}

export function ChannelIcon({ channel, className }: { channel: Channel; className?: string }) {
  const I = channel === 'instagram' ? Instagram : Linkedin
  return <I className={cn('h-3.5 w-3.5', className)} strokeWidth={1.4} aria-label={channelLabel(channel)} />
}

export function Thumb({ content, className, rounded, badges = true }: { content: Content; className?: string; rounded?: boolean; badges?: boolean }) {
  const a = content.assets[0]
  return (
    <div className={cn('relative overflow-hidden bg-mineral', rounded && 'rounded-sm', className)}>
      {a ? (
        a.kind === 'video' ? (
          <video src={a.url} className="h-full w-full object-cover" muted preload="metadata" />
        ) : (
          <img src={a.url} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
        )
      ) : (
        <div className="grain grid h-full w-full place-items-center text-ink/25">
          <ImageOff className="h-4 w-4" strokeWidth={1.2} />
        </div>
      )}
      {badges && content.assets.length > 1 && (
        <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center bg-ink/60 text-white">
          <Layers className="h-2.5 w-2.5" />
        </span>
      )}
      {badges && (content.format === 'reels' || content.format === 'video') && (
        <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center bg-ink/60 text-white">
          <Film className="h-2.5 w-2.5" />
        </span>
      )}
    </div>
  )
}

/** Card de publicação usado no calendário, kanban e listas. */
export function ContentCard({ content, compact, draggable, className, showDate = true }: { content: Content; compact?: boolean; draggable?: boolean; className?: string; showDate?: boolean }) {
  const { lookup } = useApp()
  const campaign = lookup.campaign(content.campaignId)
  const t = STATUS_TONE[content.status]
  if (compact)
    return (
      <Link
        to={`/conteudos/${content.id}`}
        draggable={draggable}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/content-id', content.id)
          e.dataTransfer.effectAllowed = 'move'
        }}
        className={cn('group flex items-center gap-2 border-l-2 bg-white px-1.5 py-1 text-left shadow-[0_0_0_1px_rgb(var(--nb-line))] transition hover:shadow-[0_0_0_1px_rgb(var(--nb-ink)/.3)]', t.ring.replace('border-', 'border-l-'), draggable && 'cursor-grab active:cursor-grabbing', className)}
        title={`${content.title} · ${statusLabel(content.status)}`}
      >
        <Thumb content={content} className="h-7 w-6 shrink-0" badges={false} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] leading-tight text-ink">{content.title}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted">
            <ChannelIcon channel={content.channel} className="h-2.5 w-2.5" /> {content.publishTime}
          </p>
        </div>
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', t.dot)} />
      </Link>
    )
  return (
    <Link
      to={`/conteudos/${content.id}`}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/content-id', content.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      className={cn('group block border border-line bg-white transition hover:border-ink/30', draggable && 'cursor-grab active:cursor-grabbing', className)}
    >
      <Thumb content={content} className="aspect-[4/3] w-full" />
      <div className="space-y-2 p-3">
        <p className="line-clamp-2 text-[13px] leading-snug text-ink">{content.title}</p>
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <ChannelIcon channel={content.channel} />
          <span>{formatLabel(content.format)}</span>
          {showDate && (
            <>
              <span className="text-line">|</span>
              <span>
                {fmtDate(content.publishDate, 'd MMM')} · {content.publishTime}
              </span>
            </>
          )}
        </div>
        {campaign && <p className="truncate text-[11px] text-wood">{campaign.name}</p>}
        <div className="flex items-center justify-between pt-1">
          <StatusBadge status={content.status} size="sm" />
          <span className="text-[10.5px] text-muted">v{content.version}</span>
        </div>
      </div>
    </Link>
  )
}

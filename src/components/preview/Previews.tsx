import { Bookmark, ChevronLeft, ChevronRight, Globe2, Heart, MessageCircle, MoreHorizontal, Music2, Repeat2, Send, ThumbsUp } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Asset, ContentFields } from '@/lib/types'
import { cn } from '@/lib/utils'
import { clampRatio, Media, type PinProps } from './Media'

export type PreviewMode = 'ig-feed' | 'ig-carrossel' | 'ig-reels' | 'ig-stories' | 'li-desktop' | 'li-mobile'

const HANDLE = 'neobambu'

function BrandAvatar({ size = 32, ring }: { size?: number; ring?: boolean }) {
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-full bg-[#1C1C1A]', ring && 'ring-2 ring-offset-2 ring-[#c9b48f]')} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 28" style={{ width: size * 0.42, height: size * 0.5 }}>
        <g stroke="#D8CFBF" strokeWidth="1.6" fill="none">
          <line x1="5" y1="3" x2="5" y2="25" />
          <line x1="12" y1="1" x2="12" y2="27" />
          <line x1="19" y1="3" x2="19" y2="25" />
        </g>
      </svg>
    </span>
  )
}

/** Legenda com quebra de linhas, hashtags/menções destacadas e "mais". */
function Caption({ text, prefix, lines = 2, linkClass = 'text-[#00376b]', moreLabel = 'mais', className }: { text: string; prefix?: ReactNode; lines?: number; linkClass?: string; moreLabel?: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const rich = text.split(/(\s+)/).map((w, i) => (/^[#@][\p{L}\p{N}_]+/u.test(w) ? <span key={i} className={linkClass}>{w}</span> : w))
  const long = text.length > 120 || text.split('\n').length > lines
  return (
    <div className={className}>
      <p className={cn('whitespace-pre-line break-words', !open && long && 'line-clamp-2')} style={!open && long ? { WebkitLineClamp: lines } : undefined}>
        {prefix}
        {rich}
      </p>
      {long && !open && (
        <button className="text-[#737373]" onClick={() => setOpen(true)}>
          {moreLabel}
        </button>
      )}
    </div>
  )
}

const fullCaption = (c: ContentFields) => [c.caption, c.cta && !c.caption.includes(c.cta) ? c.cta : '', c.hashtags].filter(Boolean).join('\n\n')

export function PhoneFrame({ children, dark, className }: { children: ReactNode; dark?: boolean; className?: string }) {
  return (
    <div className={cn('mx-auto w-[360px] max-w-full rounded-[44px] bg-[#111] p-[9px] shadow-[0_30px_60px_-20px_rgba(28,28,26,.45)]', className)}>
      <div className={cn('relative overflow-hidden rounded-[36px]', dark ? 'bg-black text-white' : 'bg-white text-[#0f0f0f]')}>
        <div className={cn('relative z-20 flex h-9 items-center justify-between px-7 text-[12px] font-semibold', dark && 'absolute inset-x-0 top-0')}>
          <span>9:41</span>
          <span className="absolute left-1/2 top-2 h-[22px] w-[88px] -translate-x-1/2 rounded-full bg-black" />
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-4 rounded-[3px] border border-current opacity-80" />
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}

function Carousel({ assets, ratio, pins, dots = 'ig', index, setIndex }: { assets: Asset[]; ratio: number; dots?: 'ig' | 'li'; index: number; setIndex: (i: number) => void } & { pins: PinProps }) {
  const n = Math.max(1, assets.length)
  return (
    <div className="relative">
      <div className="overflow-hidden">
        <div className="flex transition-transform duration-500 ease-[cubic-bezier(.2,.7,.2,1)]" style={{ transform: `translateX(-${index * 100}%)` }}>
          {(assets.length ? assets : [undefined]).map((a, i) => (
            <div key={a?.id ?? i} className="w-full shrink-0">
              <Media asset={a} ratio={ratio} {...pins} />
            </div>
          ))}
        </div>
      </div>
      {n > 1 && (
        <>
          {index > 0 && (
            <button onClick={() => setIndex(index - 1)} className="absolute left-2 top-1/2 z-20 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-black shadow" aria-label="Anterior">
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {index < n - 1 && (
            <button onClick={() => setIndex(index + 1)} className="absolute right-2 top-1/2 z-20 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-black shadow" aria-label="Próxima">
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
          {dots === 'ig' ? (
            <span className="absolute right-3 top-3 z-20 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
              {index + 1}/{n}
            </span>
          ) : (
            <span className="absolute bottom-3 right-3 z-20 rounded bg-black/70 px-2 py-0.5 text-[11px] text-white">
              {index + 1} / {n}
            </span>
          )}
        </>
      )}
    </div>
  )
}

export function InstagramFeed({ c, pins, carousel }: { c: ContentFields; pins: PinProps; carousel?: boolean }) {
  const [i, setI] = useState(0)
  const assets = carousel ? c.assets : c.assets.slice(0, 1)
  useEffect(() => setI((x) => Math.min(x, Math.max(0, assets.length - 1))), [assets.length])
  const ratio = clampRatio(assets[0], 0.8, 1.91, 0.8)
  return (
    <PhoneFrame>
      <div className="flex h-11 items-center justify-between border-b border-black/5 px-4">
        <span className="text-[17px] font-semibold tracking-tight">Instagram</span>
        <span className="flex gap-4">
          <Heart className="h-5 w-5" strokeWidth={1.6} />
          <Send className="h-5 w-5" strokeWidth={1.6} />
        </span>
      </div>
      <div className="no-scrollbar h-[600px] overflow-y-auto text-[13px] leading-[18px]">
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <BrandAvatar ring />
          <div className="flex-1 leading-tight">
            <p className="text-[13px] font-semibold">{HANDLE}</p>
            <p className="text-[11px] text-[#737373]">São Paulo, Brasil</p>
          </div>
          <MoreHorizontal className="h-5 w-5" />
        </div>
        <Carousel assets={assets} ratio={ratio} pins={pins} index={i} setIndex={setI} />
        <div className="relative flex items-center px-3 pt-2.5">
          <div className="flex flex-1 gap-4">
            <Heart className="h-6 w-6" strokeWidth={1.6} />
            <MessageCircle className="h-6 w-6 -scale-x-100" strokeWidth={1.6} />
            <Send className="h-6 w-6" strokeWidth={1.6} />
          </div>
          {assets.length > 1 && (
            <div className="absolute left-1/2 flex -translate-x-1/2 gap-1">
              {assets.map((_, k) => (
                <span key={k} className={cn('h-1.5 w-1.5 rounded-full', k === i ? 'bg-[#0095f6]' : 'bg-black/20')} />
              ))}
            </div>
          )}
          <Bookmark className="h-6 w-6" strokeWidth={1.6} />
        </div>
        <div className="space-y-1 px-3 pb-6 pt-2">
          <p className="font-semibold">Pré-visualização</p>
          {fullCaption(c) ? (
            <Caption text={fullCaption(c)} prefix={<span className="mr-1 font-semibold">{HANDLE}</span>} />
          ) : (
            <p className="italic text-[#737373]">Legenda ainda não preenchida.</p>
          )}
          <p className="pt-1 text-[10.5px] uppercase text-[#737373]">Agora</p>
        </div>
      </div>
    </PhoneFrame>
  )
}

export function InstagramReels({ c, pins }: { c: ContentFields; pins: PinProps }) {
  const a = c.assets[0]
  return (
    <PhoneFrame dark>
      <div className="relative">
        <Media asset={a} ratio={9 / 16} {...pins} autoPlay />
        <div className="pointer-events-none absolute inset-x-0 top-10 z-10 flex items-center justify-between px-4">
          <span className="text-[19px] font-bold">Reels</span>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-3 pb-5 pt-24 text-[13px] leading-[18px]">
          <div className="flex items-end gap-3">
            <div className="min-w-0 flex-1 space-y-2.5">
              <div className="flex items-center gap-2">
                <BrandAvatar size={30} />
                <span className="font-semibold">{HANDLE}</span>
                <span className="rounded-md border border-white/70 px-2 py-0.5 text-[11px] font-semibold">Seguir</span>
              </div>
              <div className="pointer-events-auto">
                {c.caption || c.hashtags ? <Caption text={fullCaption(c)} linkClass="font-semibold" moreLabel="mais" /> : <p className="italic opacity-70">Legenda ainda não preenchida.</p>}
              </div>
              <p className="flex items-center gap-1.5 text-[12px]">
                <Music2 className="h-3.5 w-3.5" /> {HANDLE} · Áudio original
              </p>
            </div>
            <div className="flex flex-col items-center gap-5 pb-1">
              <Heart className="h-7 w-7" strokeWidth={1.6} />
              <MessageCircle className="h-7 w-7 -scale-x-100" strokeWidth={1.6} />
              <Send className="h-7 w-7" strokeWidth={1.6} />
              <MoreHorizontal className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>
    </PhoneFrame>
  )
}

export function InstagramStories({ c, pins }: { c: ContentFields; pins: PinProps }) {
  const [i, setI] = useState(0)
  const n = Math.max(1, c.assets.length)
  useEffect(() => setI((x) => Math.min(x, n - 1)), [n])
  return (
    <PhoneFrame dark>
      <div className="relative">
        <Media asset={c.assets[i]} ratio={9 / 16} {...pins} autoPlay />
        {!pins.annotate && (
          <>
            <button className="absolute inset-y-0 left-0 z-10 w-1/3" onClick={() => setI(Math.max(0, i - 1))} aria-label="Story anterior" />
            <button className="absolute inset-y-0 right-0 z-10 w-1/3" onClick={() => setI(Math.min(n - 1, i + 1))} aria-label="Próximo story" />
          </>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-10 z-10 space-y-2.5 px-2.5">
          <div className="flex gap-1">
            {Array.from({ length: n }, (_, k) => (
              <span key={k} className="h-[2px] flex-1 overflow-hidden rounded bg-white/35">
                <span className={cn('block h-full bg-white', k <= i ? 'w-full' : 'w-0')} />
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            <BrandAvatar size={30} />
            <span className="font-semibold">{HANDLE}</span>
            <span className="text-white/70">2 h</span>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center gap-3 px-3 pb-4">
          <span className="flex-1 rounded-full border border-white/60 px-4 py-2.5 text-[13px] text-white/80">Enviar mensagem</span>
          <Heart className="h-6 w-6" strokeWidth={1.6} />
          <Send className="h-6 w-6" strokeWidth={1.6} />
        </div>
      </div>
    </PhoneFrame>
  )
}

function LinkedInPost({ c, pins, mobile }: { c: ContentFields; pins: PinProps; mobile?: boolean }) {
  const [i, setI] = useState(0)
  const isDoc = c.format === 'documento'
  const assets = isDoc ? c.assets : c.assets.slice(0, 1)
  const ratio = isDoc ? clampRatio(assets[0], 0.7, 1.4, 0.8) : clampRatio(assets[0], 0.56, 1.91, c.format === 'video' ? 16 / 9 : 1.91)
  const text = [c.caption, c.hashtags].filter(Boolean).join('\n\n')
  return (
    <div className={cn('bg-white text-[rgba(0,0,0,.9)]', mobile ? 'text-[14px]' : 'rounded-lg border border-[#e0dfdc] text-[14px]')}>
      <div className="flex gap-2 px-4 pb-2 pt-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center bg-[#1C1C1A]">
          <svg viewBox="0 0 24 28" className="h-6 w-5">
            <g stroke="#D8CFBF" strokeWidth="1.5" fill="none">
              <line x1="5" y1="3" x2="5" y2="25" />
              <line x1="12" y1="1" x2="12" y2="27" />
              <line x1="19" y1="3" x2="19" y2="25" />
            </g>
          </svg>
        </span>
        <div className="min-w-0 flex-1 leading-[18px]">
          <p className="text-[14px] font-semibold">NEOBAMBU</p>
          <p className="text-[12px] text-[rgba(0,0,0,.6)]">Arquitetura de superfícies</p>
          <p className="flex items-center gap-1 text-[12px] text-[rgba(0,0,0,.6)]">
            Agora • <Globe2 className="h-3 w-3" />
          </p>
        </div>
        <MoreHorizontal className="h-5 w-5 text-[rgba(0,0,0,.6)]" />
      </div>
      <div className="px-4 pb-2 leading-[20px]">
        {text ? <Caption text={text} lines={3} linkClass="font-semibold text-[#0a66c2]" moreLabel="…mais" /> : <p className="italic text-[rgba(0,0,0,.5)]">Texto ainda não preenchido.</p>}
      </div>
      {isDoc ? (
        <div className="border-y border-[#e0dfdc]">
          <div className="bg-[#f3f2ef] px-4 py-2 text-[12px] font-semibold">{c.title} · {assets.length} páginas</div>
          <Carousel assets={assets} ratio={ratio} pins={pins} dots="li" index={i} setIndex={setI} />
        </div>
      ) : (
        <Media asset={assets[0]} ratio={ratio} {...pins} />
      )}
      <div className="flex items-center justify-between px-4 py-2 text-[12px] text-[rgba(0,0,0,.6)]">
        <span className="flex items-center gap-1">
          <span className="grid h-4 w-4 place-items-center rounded-full bg-[#378fe9]">
            <ThumbsUp className="h-2.5 w-2.5 fill-white text-white" />
          </span>
          Pré-visualização
        </span>
        <span>0 comentários</span>
      </div>
      <div className="mx-4 flex justify-between border-t border-[#e0dfdc] py-1 text-[13px] font-semibold text-[rgba(0,0,0,.6)]">
        {[
          [ThumbsUp, 'Gostei'],
          [MessageCircle, 'Comentar'],
          [Repeat2, 'Compartilhar'],
          [Send, 'Enviar'],
        ].map(([I, l]) => {
          const Icon = I as typeof ThumbsUp
          return (
            <span key={l as string} className={cn('flex items-center gap-1.5 px-2 py-2.5', mobile && 'flex-col gap-0.5 text-[11px]')}>
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} /> {l as string}
            </span>
          )
        })}
      </div>
    </div>
  )
}

export function LinkedInDesktop({ c, pins }: { c: ContentFields; pins: PinProps }) {
  return (
    <div className="mx-auto w-[555px] max-w-full rounded-md bg-[#f4f2ee] p-3 shadow-[0_20px_50px_-25px_rgba(28,28,26,.35)] sm:p-6">
      <LinkedInPost c={c} pins={pins} />
    </div>
  )
}

export function LinkedInMobile({ c, pins }: { c: ContentFields; pins: PinProps }) {
  return (
    <PhoneFrame>
      <div className="flex h-11 items-center gap-3 border-b border-black/10 px-3">
        <span className="h-7 w-7 rounded-full bg-[#e9e5df]" />
        <span className="flex-1 rounded bg-[#edf3f8] px-3 py-1.5 text-[13px] text-[rgba(0,0,0,.6)]">Pesquisar</span>
      </div>
      <div className="no-scrollbar h-[600px] overflow-y-auto bg-[#f4f2ee] pt-2">
        <LinkedInPost c={c} pins={pins} mobile />
      </div>
    </PhoneFrame>
  )
}

export function Preview({ mode, c, pins }: { mode: PreviewMode; c: ContentFields; pins: PinProps }) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div ref={ref} className="animate-fade-in" key={mode}>
      {mode === 'ig-feed' && <InstagramFeed c={c} pins={pins} />}
      {mode === 'ig-carrossel' && <InstagramFeed c={c} pins={pins} carousel />}
      {mode === 'ig-reels' && <InstagramReels c={c} pins={pins} />}
      {mode === 'ig-stories' && <InstagramStories c={c} pins={pins} />}
      {mode === 'li-desktop' && <LinkedInDesktop c={c} pins={pins} />}
      {mode === 'li-mobile' && <LinkedInMobile c={c} pins={pins} />}
    </div>
  )
}

export function defaultMode(c: ContentFields): PreviewMode {
  if (c.channel === 'linkedin') return 'li-desktop'
  return c.format === 'carrossel' ? 'ig-carrossel' : c.format === 'reels' ? 'ig-reels' : c.format === 'stories' ? 'ig-stories' : 'ig-feed'
}

export const PREVIEW_MODES: { id: PreviewMode; label: string; group: 'Instagram' | 'LinkedIn' }[] = [
  { id: 'ig-feed', label: 'Feed', group: 'Instagram' },
  { id: 'ig-carrossel', label: 'Carrossel', group: 'Instagram' },
  { id: 'ig-reels', label: 'Reels', group: 'Instagram' },
  { id: 'ig-stories', label: 'Stories', group: 'Instagram' },
  { id: 'li-desktop', label: 'Desktop', group: 'LinkedIn' },
  { id: 'li-mobile', label: 'Mobile', group: 'LinkedIn' },
]

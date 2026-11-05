import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react'
import { addMonths, format, parseISO, startOfMonth } from 'date-fns'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Select } from '@/components/ui'
import { CHANNELS, STATUSES } from '@/lib/constants'
import type { Content } from '@/lib/types'
import { cn, fmtDate } from '@/lib/utils'
import { useApp } from '@/store/app'

export interface FilterState {
  month: string // yyyy-MM
  channel: string
  campaign: string
  status: string
  owner: string
}

/** Filtros persistidos na URL — compartilháveis entre páginas. */
export function useFilters() {
  const [sp, setSp] = useSearchParams()
  const f: FilterState = {
    month: sp.get('mes') ?? format(new Date(), 'yyyy-MM'),
    channel: sp.get('rede') ?? '',
    campaign: sp.get('campanha') ?? '',
    status: sp.get('status') ?? '',
    owner: sp.get('resp') ?? '',
  }
  const keys: Record<keyof FilterState, string> = { month: 'mes', channel: 'rede', campaign: 'campanha', status: 'status', owner: 'resp' }
  const set = (patch: Partial<FilterState>) => {
    const next = new URLSearchParams(sp)
    for (const [k, v] of Object.entries(patch)) {
      const key = keys[k as keyof FilterState]
      if (v) next.set(key, v)
      else next.delete(key)
    }
    setSp(next, { replace: true })
  }
  const match = (c: Content, opts: { ignoreMonth?: boolean; ignoreStatus?: boolean } = {}) =>
    (opts.ignoreMonth || c.publishDate.startsWith(f.month)) &&
    (!f.channel || c.channel === f.channel) &&
    (!f.campaign || c.campaignId === f.campaign) &&
    (opts.ignoreStatus || !f.status || c.status === f.status) &&
    (!f.owner || c.ownerId === f.owner)
  return { f, set, match }
}

export function FilterBar({ f, set, showMonth = true, showStatus = true, className }: { f: FilterState; set: (p: Partial<FilterState>) => void; showMonth?: boolean; showStatus?: boolean; className?: string }) {
  const { ws } = useApp()
  const [open, setOpen] = useState(false)
  const monthDate = useMemo(() => parseISO(f.month + '-01'), [f.month])
  const shift = (n: number) => set({ month: format(addMonths(startOfMonth(monthDate), n), 'yyyy-MM') })
  const active = [f.channel, f.campaign, f.status, f.owner].filter(Boolean).length
  const selects = (
    <>
      <Select value={f.channel} onChange={(e) => set({ channel: e.target.value })} className="h-9 w-full text-[12.5px] md:w-[140px]" aria-label="Rede social">
        <option value="">Todas as redes</option>
        {CHANNELS.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </Select>
      <Select value={f.campaign} onChange={(e) => set({ campaign: e.target.value })} className="h-9 w-full text-[12.5px] md:w-[180px]" aria-label="Campanha">
        <option value="">Todas as campanhas</option>
        {ws.campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      {showStatus && (
        <Select value={f.status} onChange={(e) => set({ status: e.target.value })} className="h-9 w-full text-[12.5px] md:w-[170px]" aria-label="Status">
          <option value="">Todos os status</option>
          {STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
      )}
      <Select value={f.owner} onChange={(e) => set({ owner: e.target.value })} className="h-9 w-full text-[12.5px] md:w-[190px]" aria-label="Responsável">
        <option value="">Todos os responsáveis</option>
        {ws.profiles
          .filter((p) => p.role !== 'diretoria')
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
      </Select>
      {active > 0 && (
        <button onClick={() => set({ channel: '', campaign: '', status: '', owner: '' })} className="flex h-9 items-center gap-1 px-2 text-[12px] text-muted hover:text-ink">
          <X className="h-3.5 w-3.5" /> Limpar
        </button>
      )}
    </>
  )
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {showMonth && (
        <div className="flex h-9 items-center border border-line bg-white">
          <button onClick={() => shift(-1)} className="grid h-full w-9 place-items-center text-muted hover:text-ink" aria-label="Mês anterior">
            <ChevronLeft className="h-4 w-4" strokeWidth={1.4} />
          </button>
          <input
            type="month"
            value={f.month}
            onChange={(e) => e.target.value && set({ month: e.target.value })}
            className="absolute h-0 w-0 opacity-0"
            id="nb-month"
          />
          <label htmlFor="nb-month" className="min-w-[128px] cursor-pointer px-1 text-center text-[12.5px] capitalize">
            {fmtDate(monthDate, 'MMMM yyyy')}
          </label>
          <button onClick={() => shift(1)} className="grid h-full w-9 place-items-center text-muted hover:text-ink" aria-label="Próximo mês">
            <ChevronRight className="h-4 w-4" strokeWidth={1.4} />
          </button>
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} className="flex h-9 items-center gap-2 border border-line bg-white px-3 text-[12.5px] md:hidden">
        <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.4} /> Filtros {active > 0 && `(${active})`}
      </button>
      <div className="hidden flex-wrap items-center gap-2 md:flex">{selects}</div>
      {open && <div className="grid w-full grid-cols-1 gap-2 md:hidden">{selects}</div>}
    </div>
  )
}

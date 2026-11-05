import { addDays, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek } from 'date-fns'
import { CalendarDays, ChevronLeft, ChevronRight, Columns3, LayoutList, Plus, Rows3 } from 'lucide-react'
import { useMemo, useState, type DragEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChannelIcon, ContentCard, StatusBadge, Thumb } from '@/components/content/bits'
import { FilterBar, useFilters } from '@/components/content/Filters'
import { buttonVariants, Empty, PageHeader, Segmented } from '@/components/ui'
import { formatLabel, STATUS_TONE, STATUSES } from '@/lib/constants'
import type { Content, Status } from '@/lib/types'
import { cn, fmtDate } from '@/lib/utils'
import { can } from '@/lib/workflow'
import { useApp } from '@/store/app'

type View = 'mes' | 'semana' | 'lista' | 'kanban'
const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']

export default function Calendar() {
  const { ws, user, provider, run } = useApp()
  const { f, set, match } = useFilters()
  const [sp, setSp] = useSearchParams()
  const view = (sp.get('view') as View) || 'mes'
  const setView = (v: View) => {
    const n = new URLSearchParams(sp)
    n.set('view', v)
    setSp(n, { replace: true })
  }
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [over, setOver] = useState<string | null>(null)
  const editable = !!user && can.editContent(user.role)
  const nav = useNavigate()

  const monthDate = parseISO(f.month + '-01')
  const inMonth = useMemo(() => ws.contents.filter((c) => match(c)), [ws, match])
  const byDay = useMemo(() => {
    const m = new Map<string, Content[]>()
    ws.contents
      .filter((c) => match(c, { ignoreMonth: true }))
      .sort((a, b) => a.publishTime.localeCompare(b.publishTime))
      .forEach((c) => m.set(c.publishDate, [...(m.get(c.publishDate) ?? []), c]))
    return m
  }, [ws, match])

  const moveTo = (id: string, date: string) => {
    const c = ws.contents.find((x) => x.id === id)
    if (!c || c.publishDate === date) return
    run(() => provider.updateContent(id, { publishDate: date }), `“${c.title}” reagendado para ${fmtDate(date, "d 'de' MMMM")}`)
  }
  const dropZone = (key: string, onDrop: (id: string) => void) =>
    editable
      ? {
          onDragOver: (e: DragEvent) => {
            e.preventDefault()
            setOver(key)
          },
          onDragLeave: () => setOver((o) => (o === key ? null : o)),
          onDrop: (e: DragEvent) => {
            e.preventDefault()
            setOver(null)
            const id = e.dataTransfer.getData('text/content-id')
            if (id) onDrop(id)
          },
        }
      : {}

  return (
    <div>
      <PageHeader
        kicker="Planejamento"
        title="Calendário editorial"
        subtitle={editable ? 'Arraste os cards para reorganizar datas. No Kanban, arraste entre colunas para avançar o status.' : 'Visão do planejamento editorial.'}
        actions={
          editable && (
            <Link to="/conteudos?novo=1" className={buttonVariants({ variant: 'primary' })}>
              <Plus className="h-4 w-4" strokeWidth={1.4} /> Novo conteúdo
            </Link>
          )
        }
      />

      <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        {view === 'semana' ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-9 items-center border border-line bg-white">
              <button className="grid h-full w-9 place-items-center text-muted hover:text-ink" onClick={() => setWeekStart((w) => addWeeks(w, -1))} aria-label="Semana anterior">
                <ChevronLeft className="h-4 w-4" strokeWidth={1.4} />
              </button>
              <span className="min-w-[170px] text-center text-[12.5px]">
                {fmtDate(weekStart, 'd MMM')} – {fmtDate(addDays(weekStart, 6), 'd MMM yyyy')}
              </span>
              <button className="grid h-full w-9 place-items-center text-muted hover:text-ink" onClick={() => setWeekStart((w) => addWeeks(w, 1))} aria-label="Próxima semana">
                <ChevronRight className="h-4 w-4" strokeWidth={1.4} />
              </button>
            </div>
            <button className="h-9 border border-line bg-white px-3 text-[12px] text-muted hover:text-ink" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
              Hoje
            </button>
            <FilterBar f={f} set={set} showMonth={false} />
          </div>
        ) : (
          <FilterBar f={f} set={set} showStatus={view !== 'kanban'} />
        )}
        <Segmented
          value={view}
          onChange={setView}
          items={[
            { id: 'mes', label: <><CalendarDays className="h-3.5 w-3.5" strokeWidth={1.4} /> Mês</> },
            { id: 'semana', label: <><Columns3 className="h-3.5 w-3.5" strokeWidth={1.4} /> Semana</> },
            { id: 'lista', label: <><LayoutList className="h-3.5 w-3.5" strokeWidth={1.4} /> Lista</> },
            { id: 'kanban', label: <><Rows3 className="h-3.5 w-3.5 rotate-90" strokeWidth={1.4} /> Kanban</> },
          ]}
        />
      </div>

      <Legend />

      {view === 'mes' && (
        <div className="overflow-x-auto">
          <div className="min-w-[860px] border-l border-t border-line bg-white">
            <div className="grid grid-cols-7">
              {WEEKDAYS.map((d) => (
                <div key={d} className="label border-b border-r border-line px-3 py-2.5">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {eachDayOfInterval({ start: startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 }) }).map((day) => {
                const key = format(day, 'yyyy-MM-dd')
                const items = byDay.get(key) ?? []
                const outside = !isSameMonth(day, monthDate)
                return (
                  <div
                    key={key}
                    {...dropZone(key, (id) => moveTo(id, key))}
                    className={cn('group/day relative min-h-[132px] border-b border-r border-line p-1.5 transition-colors', outside && 'bg-paper/70', over === key && 'bg-sand/30')}
                  >
                    <div className="mb-1.5 flex items-center justify-between px-1">
                      <span className={cn('text-[11.5px] tabular-nums', outside ? 'text-muted/50' : 'text-muted', isToday(day) && 'grid h-5 w-5 place-items-center rounded-full bg-ink text-paper')}>{format(day, 'd')}</span>
                      {editable && (
                        <button onClick={() => nav(`/conteudos?novo=1&data=${key}`)} className="text-muted opacity-0 transition-opacity hover:text-ink group-hover/day:opacity-100" aria-label="Novo conteúdo neste dia">
                          <Plus className="h-3.5 w-3.5" strokeWidth={1.4} />
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {items.slice(0, 4).map((c) => (
                        <ContentCard key={c.id} content={c} compact draggable={editable && c.status !== 'publicado'} />
                      ))}
                      {items.length > 4 && (
                        <button onClick={() => { set({ month: key.slice(0, 7) }); setView('lista') }} className="px-1 text-[10.5px] text-muted hover:text-ink">
                          + {items.length - 4} conteúdos
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {view === 'semana' && (
        <div className="overflow-x-auto">
          <div className="grid min-w-[980px] grid-cols-7 border-l border-t border-line bg-white">
            {Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((day) => {
              const key = format(day, 'yyyy-MM-dd')
              const items = byDay.get(key) ?? []
              return (
                <div key={key} {...dropZone(key, (id) => moveTo(id, key))} className={cn('min-h-[520px] border-b border-r border-line transition-colors', over === key && 'bg-sand/30')}>
                  <div className={cn('flex items-baseline gap-2 border-b border-line px-3 py-3', isToday(day) && 'bg-ink text-paper')}>
                    <span className="font-display text-[22px] font-extralight leading-none">{format(day, 'd')}</span>
                    <span className={cn('text-[11px] uppercase tracking-label', isToday(day) ? 'text-paper/60' : 'text-muted')}>{fmtDate(day, 'EEE')}</span>
                  </div>
                  <div className="space-y-2 p-2">
                    {items.map((c) => (
                      <ContentCard key={c.id} content={c} draggable={editable && c.status !== 'publicado'} showDate={false} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {view === 'lista' && (
        <div className="border border-line bg-white">
          {inMonth.length === 0 && <div className="p-6"><Empty title="Nenhum conteúdo para os filtros selecionados" /></div>}
          {[...new Set(inMonth.map((c) => c.publishDate))].sort().map((d) => (
            <div key={d}>
              <div className="sticky top-16 z-[1] border-b border-line bg-paper px-5 py-2 text-[11px] uppercase tracking-label text-muted">{fmtDate(d, "EEEE, d 'de' MMMM")}</div>
              {inMonth
                .filter((c) => c.publishDate === d)
                .sort((a, b) => a.publishTime.localeCompare(b.publishTime))
                .map((c) => (
                  <Link key={c.id} to={`/conteudos/${c.id}`} className="grid grid-cols-[48px_1fr_auto] items-center gap-4 border-b border-line px-5 py-3 transition-colors last:border-b-0 hover:bg-paper md:grid-cols-[56px_64px_1fr_170px_170px]">
                    <Thumb content={c} className="h-14 w-12" />
                    <span className="hidden text-[12.5px] tabular-nums text-muted md:block">{c.publishTime}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px]">{c.title}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted md:hidden">
                        <ChannelIcon channel={c.channel} /> {formatLabel(c.format)} · {c.publishTime}
                      </span>
                    </span>
                    <span className="hidden items-center gap-1.5 text-[12px] text-muted md:flex">
                      <ChannelIcon channel={c.channel} /> {formatLabel(c.format)}
                    </span>
                    <StatusBadge status={c.status} />
                  </Link>
                ))}
            </div>
          ))}
        </div>
      )}

      {view === 'kanban' && (
        <div className="scroll-thin -mx-4 overflow-x-auto px-4 pb-4 md:-mx-10 md:px-10">
          <div className="flex gap-3">
            {STATUSES.map((s) => {
              const items = inMonth.filter((c) => c.status === s.id)
              return (
                <div
                  key={s.id}
                  {...dropZone(s.id, (id) => {
                    const c = ws.contents.find((x) => x.id === id)
                    if (c && c.status !== s.id) run(() => provider.setStatus(id, s.id as Status), `Status alterado para “${s.label}”`)
                  })}
                  className={cn('w-[248px] shrink-0 border border-line bg-mineral/30 transition-colors', over === s.id && 'bg-sand/40')}
                >
                  <div className={cn('flex items-center justify-between border-b-2 bg-white px-3 py-3', STATUS_TONE[s.id].ring)}>
                    <StatusBadge status={s.id} />
                    <span className="text-[11px] tabular-nums text-muted">{items.length}</span>
                  </div>
                  <div className="min-h-[420px] space-y-2 p-2">
                    {items.map((c) => (
                      <ContentCard key={c.id} content={c} draggable={editable} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Legend(): ReactNode {
  return (
    <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1.5">
      {STATUSES.map((s) => (
        <StatusBadge key={s.id} status={s.id} size="sm" className="opacity-80" />
      ))}
    </div>
  )
}

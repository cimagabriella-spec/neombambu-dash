import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { eachDayOfInterval, endOfMonth, format, isBefore, parseISO, startOfDay } from 'date-fns'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ChannelIcon, StatusBadge, Thumb } from '@/components/content/bits'
import { FilterBar, useFilters } from '@/components/content/Filters'
import { LineChart } from '@/components/content/Charts'
import { Section } from '@/components/layout/Shell'
import { buttonVariants, Empty, PageHeader, Progress } from '@/components/ui'
import { formatLabel } from '@/lib/constants'
import type { Status } from '@/lib/types'
import { cn, fmtDate } from '@/lib/utils'
import { useApp } from '@/store/app'

export default function Overview() {
  const { ws, user, lookup } = useApp()
  const { f, set, match } = useFilters()
  const list = useMemo(() => ws.contents.filter((c) => match(c)), [ws, match])
  const count = (...s: Status[]) => list.filter((c) => s.includes(c.status)).length
  const done = count('aprovado', 'programado', 'publicado')
  const pct = list.length ? Math.round((done / list.length) * 100) : 0

  const kpis = [
    { label: 'Planejados', value: list.length, status: '' },
    { label: 'Em produção', value: count('ideia', 'producao', 'revisao'), status: 'producao' },
    { label: 'Aguardando aprovação', value: count('aguardando'), status: 'aguardando', emphasis: true },
    { label: 'Ajustes solicitados', value: count('ajustes'), status: 'ajustes' },
    { label: 'Aprovados', value: count('aprovado', 'programado'), status: 'aprovado' },
    { label: 'Publicados', value: count('publicado'), status: 'publicado' },
  ]

  const chart = useMemo(() => {
    const m = parseISO(f.month + '-01')
    const days = eachDayOfInterval({ start: m, end: endOfMonth(m) })
    const approvedAt = new Map<string, string>()
    ws.approvals.filter((e) => e.action === 'approved').forEach((e) => approvedAt.set(e.contentId, e.createdAt))
    const ok = (s: Status) => ['aprovado', 'programado', 'publicado'].includes(s)
    return {
      labels: days.map((d) => format(d, 'dd')),
      series: [
        { name: 'Planejados', values: days.map((d) => list.filter((c) => c.publishDate <= format(d, 'yyyy-MM-dd')).length) },
        {
          name: 'Aprovados',
          values: days.map((d) => list.filter((c) => ok(c.status) && (approvedAt.get(c.id) ?? c.approvedAt ?? '') <= format(d, "yyyy-MM-dd'T'23:59")).length),
        },
        { name: 'Publicados', values: days.map((d) => list.filter((c) => c.status === 'publicado' && c.publishDate <= format(d, 'yyyy-MM-dd')).length) },
      ],
    }
  }, [list, ws.approvals, f.month])

  const upcoming = useMemo(
    () =>
      ws.contents
        .filter((c) => match(c, { ignoreMonth: true }) && c.status !== 'publicado' && !isBefore(parseISO(c.publishDate), startOfDay(new Date())))
        .sort((a, b) => (a.publishDate + a.publishTime).localeCompare(b.publishDate + b.publishTime))
        .slice(0, 7),
    [ws, match],
  )
  const pendingAll = ws.contents.filter((c) => c.status === 'aguardando')
  const isBoard = user?.role === 'diretoria'

  return (
    <div>
      <PageHeader kicker={fmtDate(parseISO(f.month + '-01'), 'MMMM yyyy')} title="Marketing Overview" subtitle="Planejamento, conteúdo e aprovações em um único espaço." />

      {isBoard && pendingAll.length > 0 && (
        <Link to="/aprovacoes" className="group mb-8 flex items-center justify-between gap-6 bg-ink px-6 py-5 text-paper transition hover:bg-graphite md:px-8 animate-fade-in">
          <div className="flex items-center gap-5">
            <div className="flex -space-x-3">
              {pendingAll.slice(0, 4).map((c) => (
                <Thumb key={c.id} content={c} className="h-12 w-10 ring-2 ring-ink" />
              ))}
            </div>
            <div>
              <p className="font-display text-[17px] font-extralight">
                {pendingAll.length} {pendingAll.length === 1 ? 'conteúdo aguarda' : 'conteúdos aguardam'} sua aprovação
              </p>
              <p className="text-[12px] text-paper/50">Revise, aprove em lote ou solicite ajustes.</p>
            </div>
          </div>
          <span className="hidden items-center gap-2 text-[12px] uppercase tracking-label text-sand md:flex">
            Abrir central <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.3} />
          </span>
        </Link>
      )}

      <FilterBar f={f} set={set} className="mb-8" />

      <div className="grid grid-cols-2 border-l border-t border-line bg-white md:grid-cols-3 xl:grid-cols-7">
        {kpis.map((k) => (
          <Link
            key={k.label}
            to={`/calendario?view=lista&mes=${f.month}${k.status ? `&status=${k.status}` : ''}`}
            className={cn('group border-b border-r border-line px-5 py-6 transition-colors hover:bg-paper', k.emphasis && k.value > 0 && 'bg-st-aguardando/[0.06]')}
          >
            <p className="label">{k.label}</p>
            <p className="mt-4 font-display text-[34px] font-extralight leading-none tabular-nums">{k.value}</p>
          </Link>
        ))}
        <div className="col-span-2 border-b border-r border-line px-5 py-6 md:col-span-3 xl:col-span-1">
          <p className="label">Conclusão do plano</p>
          <p className="mt-4 font-display text-[34px] font-extralight leading-none tabular-nums">
            {pct}
            <span className="text-[18px] text-muted">%</span>
          </p>
          <Progress value={pct} className="mt-4" />
        </div>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1.55fr_1fr]">
        <Section title="Evolução das entregas" action={<span className="text-[11.5px] text-muted">acumulado no mês</span>}>
          {list.length ? <LineChart labels={chart.labels} series={chart.series} height={300} /> : <Empty title="Nenhum conteúdo no período">Ajuste os filtros ou crie um novo conteúdo.</Empty>}
        </Section>

        <Section
          title="Próximos conteúdos"
          action={
            <Link to="/calendario" className="flex items-center gap-1 text-[12px] text-muted hover:text-ink">
              Calendário <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.4} />
            </Link>
          }
          className="[&>div:last-child]:p-0 md:[&>div:last-child]:p-0"
        >
          {upcoming.length === 0 && <p className="px-6 py-10 text-center text-[13px] text-muted">Nada programado.</p>}
          <ul className="divide-y divide-line">
            {upcoming.map((c) => (
              <li key={c.id}>
                <Link to={`/conteudos/${c.id}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-paper md:px-6">
                  <div className="w-11 shrink-0 text-center">
                    <p className="font-display text-[20px] font-extralight leading-none">{fmtDate(c.publishDate, 'dd')}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-label text-muted">{fmtDate(c.publishDate, 'MMM')}</p>
                  </div>
                  <Thumb content={c} className="h-12 w-10 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px]">{c.title}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11.5px] text-muted">
                      <ChannelIcon channel={c.channel} /> {formatLabel(c.format)} · {c.publishTime}
                      {lookup.campaign(c.campaignId) && <span className="truncate text-wood">· {lookup.campaign(c.campaignId)!.name}</span>}
                    </p>
                  </div>
                  <StatusBadge status={c.status} size="sm" className="hidden sm:inline-flex" />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {!isBoard && (
        <div className="mt-8 flex flex-wrap gap-2">
          <Link to="/conteudos?novo=1" className={buttonVariants({ variant: 'primary' })}>
            Novo conteúdo
          </Link>
          <Link to="/calendario" className={buttonVariants({ variant: 'outline' })}>
            Organizar calendário
          </Link>
        </div>
      )}
    </div>
  )
}

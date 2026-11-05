import { Download, Printer } from 'lucide-react'
import { eachMonthOfInterval, endOfMonth, format, parseISO, startOfMonth, startOfYear, subMonths } from 'date-fns'
import { useMemo, useState } from 'react'
import { BarList } from '@/components/content/Charts'
import { Section } from '@/components/layout/Shell'
import { Button, Input, PageHeader, Segmented } from '@/components/ui'
import { channelLabel, formatLabel, statusLabel } from '@/lib/constants'
import { downloadText, fmtDate, toCsv } from '@/lib/utils'
import { useApp } from '@/store/app'

type Preset = 'mes' | 'trimestre' | 'semestre' | 'ano' | 'custom'

export default function Reports() {
  const { ws, lookup } = useApp()
  const today = new Date()
  const [preset, setPreset] = useState<Preset>('trimestre')
  const [from, setFrom] = useState(format(subMonths(startOfMonth(today), 2), 'yyyy-MM'))
  const [to, setTo] = useState(format(today, 'yyyy-MM'))
  const applyPreset = (p: Preset) => {
    setPreset(p)
    const n = { mes: 0, trimestre: 2, semestre: 5 }[p as 'mes']
    if (p === 'ano') setFrom(format(startOfYear(today), 'yyyy-MM'))
    else if (n !== undefined) setFrom(format(subMonths(startOfMonth(today), n), 'yyyy-MM'))
    if (p !== 'custom') setTo(format(today, 'yyyy-MM'))
  }
  const start = `${from}-01`
  const end = format(endOfMonth(parseISO(`${to}-01`)), 'yyyy-MM-dd')

  const r = useMemo(() => {
    const list = ws.contents.filter((c) => c.publishDate >= start && c.publishDate <= end)
    const ids = new Set(list.map((c) => c.id))
    const ev = ws.approvals.filter((e) => ids.has(e.contentId))
    const approved = list.filter((c) => ['aprovado', 'programado', 'publicado'].includes(c.status)).length
    const published = list.filter((c) => c.status === 'publicado').length
    const revisions = ev.filter((e) => e.action === 'changes_requested').length
    const newVersions = ev.filter((e) => e.action === 'new_version').length
    // tempo médio: envio → aprovação da mesma versão
    const durations: number[] = []
    ev.filter((e) => e.action === 'approved').forEach((a) => {
      const sub = ev.filter((e) => e.contentId === a.contentId && e.action === 'submitted' && e.createdAt <= a.createdAt).pop()
      if (sub) durations.push((new Date(a.createdAt).getTime() - new Date(sub.createdAt).getTime()) / 36e5)
    })
    const avgH = durations.length ? durations.reduce((x, y) => x + y, 0) / durations.length : null
    const now = format(today, 'yyyy-MM-dd')
    const due = list.filter((c) => c.publishDate < now)
    const onTime = due.filter((c) => c.status === 'publicado').length
    const compliance = due.length ? Math.round((onTime / due.length) * 100) : null
    const months = eachMonthOfInterval({ start: parseISO(start), end: parseISO(end) }).map((m) => {
      const key = format(m, 'yyyy-MM')
      const items = list.filter((c) => c.publishDate.startsWith(key))
      return { key, label: fmtDate(m, 'MMM yy'), total: items.length, published: items.filter((c) => c.status === 'publicado').length }
    })
    const byLine = ws.editorialLines.map((l) => ({ label: l.name, value: list.filter((c) => c.editorialLineId === l.id).length })).filter((x) => x.value).sort((a, b) => b.value - a.value)
    const noLine = list.filter((c) => !c.editorialLineId).length
    if (noLine) byLine.push({ label: 'Sem linha editorial', value: noLine })
    const byChannel = (['instagram', 'linkedin'] as const).map((ch) => ({ label: channelLabel(ch), value: list.filter((c) => c.channel === ch).length }))
    const byFormat = [...new Set(list.map((c) => c.format))].map((f) => ({ label: formatLabel(f), value: list.filter((c) => c.format === f).length })).sort((a, b) => b.value - a.value)
    return { list, approved, published, revisions, newVersions, avgH, compliance, due: due.length, onTime, months, byLine, byChannel, byFormat }
  }, [ws, start, end]) // eslint-disable-line react-hooks/exhaustive-deps

  const exportCsv = () => {
    const rows = [
      ['Título', 'Data', 'Horário', 'Rede', 'Formato', 'Campanha', 'Linha editorial', 'Status', 'Versão', 'Responsável', 'Aprovado por', 'Aprovado em', 'Ajustes solicitados'],
      ...r.list.map((c) => [
        c.title, c.publishDate, c.publishTime, channelLabel(c.channel), formatLabel(c.format), lookup.campaign(c.campaignId)?.name, lookup.line(c.editorialLineId)?.name,
        statusLabel(c.status), c.version, lookup.profile(c.ownerId)?.name, lookup.profile(c.approvedBy)?.name, c.approvedAt ?? '',
        ws.approvals.filter((e) => e.contentId === c.id && e.action === 'changes_requested').length,
      ]),
    ]
    downloadText(`neobambu-relatorio-${from}-a-${to}.csv`, toCsv(rows))
  }

  const max = Math.max(1, ...r.months.map((m) => m.total))
  const stat = (label: string, value: string | number, hint?: string) => (
    <div className="border-b border-r border-line px-5 py-6">
      <p className="label">{label}</p>
      <p className="mt-4 font-display text-[32px] font-extralight leading-none tabular-nums">{value}</p>
      {hint && <p className="mt-2 text-[11px] text-muted">{hint}</p>}
    </div>
  )

  return (
    <div>
      <PageHeader
        kicker="Operação"
        title="Relatórios"
        subtitle="Acompanhamento operacional do calendário editorial e do fluxo de aprovação."
        actions={
          <>
            <Button onClick={exportCsv}>
              <Download className="h-4 w-4" strokeWidth={1.4} /> Exportar CSV
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4" strokeWidth={1.4} /> PDF
            </Button>
          </>
        }
      />
      <div className="no-print mb-8 flex flex-wrap items-center gap-3">
        <Segmented
          value={preset}
          onChange={applyPreset}
          items={[
            { id: 'mes', label: 'Mês atual' },
            { id: 'trimestre', label: '3 meses' },
            { id: 'semestre', label: '6 meses' },
            { id: 'ano', label: 'Ano' },
            { id: 'custom', label: 'Personalizado' },
          ]}
        />
        {preset === 'custom' && (
          <div className="flex items-center gap-2 text-[12px] text-muted">
            <Input type="month" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} className="h-9 w-40" /> até
            <Input type="month" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} className="h-9 w-40" />
          </div>
        )}
        <span className="text-[12px] text-muted">
          {fmtDate(start, "d 'de' MMM yyyy")} – {fmtDate(end, "d 'de' MMM yyyy")}
        </span>
      </div>

      <div className="grid grid-cols-2 border-l border-t border-line bg-white md:grid-cols-3 xl:grid-cols-6">
        {stat('Publicações', r.list.length, 'no período')}
        {stat('Aprovadas', r.approved)}
        {stat('Publicadas', r.published)}
        {stat('Revisões', r.revisions, `${r.newVersions} novas versões`)}
        {stat('Tempo médio de aprovação', r.avgH === null ? '—' : r.avgH < 48 ? `${Math.round(r.avgH)}h` : `${(r.avgH / 24).toFixed(1)}d`, 'do envio à aprovação')}
        {stat('Cumprimento do calendário', r.compliance === null ? '—' : `${r.compliance}%`, `${r.onTime} de ${r.due} já vencidos publicados`)}
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        <Section title="Publicações por mês" action={<span className="text-[11.5px] text-muted">total · publicadas</span>}>
          <div className="flex h-[220px] items-end gap-3 border-b border-line">
            {r.months.map((m) => (
              <div key={m.key} className="flex h-full flex-1 flex-col justify-end" title={`${m.label}: ${m.total} planejadas, ${m.published} publicadas`}>
                <span className="mb-1.5 text-center text-[11px] tabular-nums">{m.total}</span>
                <div className="relative mx-auto w-full max-w-[44px] rounded-t-[4px] bg-sand" style={{ height: `${(m.total / max) * 82}%` }}>
                  <div className="absolute inset-x-0 bottom-0 rounded-t-[4px] bg-olive" style={{ height: m.total ? `${(m.published / m.total) * 100}%` : 0 }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-3">
            {r.months.map((m) => (
              <span key={m.key} className="flex-1 text-center text-[10.5px] capitalize text-muted">
                {m.label}
              </span>
            ))}
          </div>
          <div className="mt-4 flex gap-5 text-[11.5px] text-muted">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 bg-sand" /> Planejadas
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 bg-olive" /> Publicadas
            </span>
          </div>
        </Section>
        <Section title="Distribuição por rede social">
          <BarList items={r.byChannel} />
          <p className="label mb-3 mt-8">Por formato</p>
          <BarList items={r.byFormat} />
        </Section>
        <Section title="Distribuição por linha editorial" className="xl:col-span-2">
          <div className="grid gap-x-12 md:grid-cols-2">
            <BarList items={r.byLine.slice(0, Math.ceil(r.byLine.length / 2))} total={r.list.length} />
            <BarList items={r.byLine.slice(Math.ceil(r.byLine.length / 2))} total={r.list.length} className="mt-3 md:mt-0" />
          </div>
        </Section>
      </div>
    </div>
  )
}

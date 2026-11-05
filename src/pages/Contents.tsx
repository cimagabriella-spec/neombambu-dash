import { Plus, Search } from 'lucide-react'
import { format } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChannelIcon, StatusBadge, Thumb } from '@/components/content/bits'
import { FilterBar, useFilters } from '@/components/content/Filters'
import { Button, Dialog, Empty, Field, Input, PageHeader, Select } from '@/components/ui'
import { CHANNELS, formatLabel, formatsFor } from '@/lib/constants'
import type { Channel, Format } from '@/lib/types'
import { fmtDate } from '@/lib/utils'
import { can } from '@/lib/workflow'
import { useApp } from '@/store/app'

export default function Contents() {
  const { ws, user, lookup } = useApp()
  const { f, set, match } = useFilters()
  const [q, setQ] = useState('')
  const [all, setAll] = useState(true)
  const [sp, setSp] = useSearchParams()
  const creating = sp.get('novo') === '1'
  const list = useMemo(
    () =>
      ws.contents
        .filter((c) => match(c, { ignoreMonth: all }))
        .filter((c) => !q || `${c.title} ${c.caption} ${c.hashtags}`.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => b.publishDate.localeCompare(a.publishDate)),
    [ws, match, q, all],
  )

  return (
    <div>
      <PageHeader
        kicker="Produção"
        title="Conteúdos"
        subtitle="Todas as publicações, com versões, artes e status de aprovação."
        actions={
          user &&
          can.createContent(user.role) && (
            <Button variant="primary" onClick={() => setSp({ novo: '1' })}>
              <Plus className="h-4 w-4" strokeWidth={1.4} /> Novo conteúdo
            </Button>
          )
        }
      />
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative lg:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.4} />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por título, legenda, hashtag" className="h-9 pl-9 text-[12.5px]" />
        </div>
        <label className="flex items-center gap-2 text-[12.5px] text-muted">
          <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} className="accent-ink" /> Todos os meses
        </label>
        <FilterBar f={f} set={set} showMonth={!all} />
      </div>

      {list.length === 0 ? (
        <Empty title="Nenhum conteúdo encontrado">Ajuste a busca ou os filtros.</Empty>
      ) : (
        <div className="border border-line bg-white">
          <div className="label hidden grid-cols-[56px_1fr_160px_150px_120px_170px] gap-4 border-b border-line px-5 py-3 lg:grid">
            <span />
            <span>Título</span>
            <span>Canal · formato</span>
            <span>Linha editorial</span>
            <span>Data</span>
            <span>Status</span>
          </div>
          {list.map((c) => (
            <Link key={c.id} to={`/conteudos/${c.id}`} className="grid grid-cols-[48px_1fr_auto] items-center gap-4 border-b border-line px-5 py-3 transition-colors last:border-b-0 hover:bg-paper lg:grid-cols-[56px_1fr_160px_150px_120px_170px]">
              <Thumb content={c} className="h-14 w-12" />
              <span className="min-w-0">
                <span className="block truncate text-[13.5px]">{c.title}</span>
                <span className="mt-0.5 block truncate text-[11.5px] text-muted">
                  {lookup.campaign(c.campaignId)?.name ?? 'Sem campanha'} · v{c.version} · {lookup.profile(c.ownerId)?.name}
                </span>
              </span>
              <span className="hidden items-center gap-1.5 text-[12px] text-muted lg:flex">
                <ChannelIcon channel={c.channel} /> {formatLabel(c.format)}
              </span>
              <span className="hidden truncate text-[12px] text-muted lg:block">{lookup.line(c.editorialLineId)?.name ?? '—'}</span>
              <span className="hidden text-[12px] tabular-nums text-muted lg:block">
                {fmtDate(c.publishDate, 'dd/MM/yy')} {c.publishTime}
              </span>
              <StatusBadge status={c.status} />
            </Link>
          ))}
        </div>
      )}
      <NewContentDialog open={creating} onClose={() => setSp({})} initialDate={sp.get('data') ?? undefined} />
    </div>
  )
}

export function NewContentDialog({ open, onClose, initialDate }: { open: boolean; onClose: () => void; initialDate?: string }) {
  const { provider, run, ws } = useApp()
  const nav = useNavigate()
  const [title, setTitle] = useState('')
  const [channel, setChannel] = useState<Channel>('instagram')
  const [fmt, setFmt] = useState<Format>('feed')
  const [date, setDate] = useState(initialDate ?? format(new Date(), 'yyyy-MM-dd'))
  const [time, setTime] = useState('10:00')
  const [campaignId, setCampaignId] = useState('')
  useEffect(() => {
    if (open) {
      setTitle('')
      setDate(initialDate ?? format(new Date(), 'yyyy-MM-dd'))
    }
  }, [open, initialDate])
  const submit = async () => {
    const c = await run(() => provider.createContent({ title: title.trim(), channel, format: fmt, publishDate: date, publishTime: time, campaignId: campaignId || null }), 'Conteúdo criado')
    if (c) nav(`/conteudos/${c.id}`)
  }
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Novo conteúdo"
      description="Comece pelo essencial. Os demais campos são preenchidos na página do conteúdo."
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={!title.trim() || !date} onClick={submit}>
            Criar e editar
          </Button>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Título interno" className="sm:col-span-2">
          <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: ThermoWood® · Do tratamento ao projeto" onKeyDown={(e) => e.key === 'Enter' && title.trim() && submit()} />
        </Field>
        <Field label="Rede social">
          <Select
            value={channel}
            onChange={(e) => {
              const ch = e.target.value as Channel
              setChannel(ch)
              setFmt(formatsFor(ch)[0].id)
            }}
          >
            {CHANNELS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Formato">
          <Select value={fmt} onChange={(e) => setFmt(e.target.value as Format)}>
            {formatsFor(channel).map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Data de publicação">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Horário">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
        <Field label="Campanha" className="sm:col-span-2">
          <Select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
            <option value="">Sem campanha</option>
            {ws.campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Dialog>
  )
}

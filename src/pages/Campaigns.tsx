import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { ChannelIcon, StatusBadge, Thumb } from '@/components/content/bits'
import { Link } from 'react-router-dom'
import { Badge, Button, Dialog, Empty, Field, Input, PageHeader, Progress, Segmented, Select, Textarea } from '@/components/ui'
import { CAMPAIGN_STATUSES } from '@/lib/constants'
import type { Campaign } from '@/lib/types'
import { cn, fmtDate } from '@/lib/utils'
import { can } from '@/lib/workflow'
import { useApp } from '@/store/app'

export default function Campaigns() {
  const { ws, user, lookup } = useApp()
  const [edit, setEdit] = useState<Partial<Campaign> | null>(null)
  const [filter, setFilter] = useState<'todas' | Campaign['status']>('todas')
  const [open, setOpen] = useState<string | null>(null)
  const editable = !!user && can.manageCampaigns(user.role)
  const list = ws.campaigns.filter((c) => filter === 'todas' || c.status === filter)

  return (
    <div>
      <PageHeader
        kicker="Planejamento"
        title="Campanhas"
        subtitle="Campanhas institucionais e comerciais, com o andamento de cada entrega."
        actions={
          editable && (
            <Button variant="primary" onClick={() => setEdit({ kind: 'comercial', status: 'planejamento', productIds: [] })}>
              <Plus className="h-4 w-4" strokeWidth={1.4} /> Nova campanha
            </Button>
          )
        }
      />
      <Segmented value={filter} onChange={setFilter} items={[{ id: 'todas', label: 'Todas' }, ...CAMPAIGN_STATUSES.map((s) => ({ id: s.id, label: s.label }))]} className="mb-6" />
      {list.length === 0 && <Empty title="Nenhuma campanha" />}
      <div className="space-y-4">
        {list.map((c) => {
          const items = ws.contents.filter((x) => x.campaignId === c.id)
          const done = items.filter((x) => ['aprovado', 'programado', 'publicado'].includes(x.status)).length
          const pub = items.filter((x) => x.status === 'publicado').length
          const pct = items.length ? Math.round((done / items.length) * 100) : 0
          const isOpen = open === c.id
          return (
            <article key={c.id} className="border border-line bg-white animate-fade-in">
              <button onClick={() => setOpen(isOpen ? null : c.id)} className="grid w-full gap-6 p-5 text-left md:grid-cols-[1.6fr_1fr_220px] md:p-7">
                <div>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="label">{c.kind === 'institucional' ? 'Institucional' : 'Comercial'}</span>
                    <span className="text-line">|</span>
                    <span className={cn('text-[11px]', c.status === 'ativa' ? 'text-olive' : 'text-muted')}>{CAMPAIGN_STATUSES.find((s) => s.id === c.status)?.label}</span>
                  </div>
                  <h3 className="font-display text-[20px] font-extralight tracking-tight">{c.name}</h3>
                  <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-muted">{c.objective}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.productIds.map((p) => (
                      <Badge key={p}>{lookup.product(p)?.name}</Badge>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 text-[12.5px]">
                  <p>
                    <span className="label mr-2">Período</span>
                    {c.startDate ? fmtDate(c.startDate, 'dd/MM/yy') : '—'} – {c.endDate ? fmtDate(c.endDate, 'dd/MM/yy') : '—'}
                  </p>
                  <p>
                    <span className="label mr-2">Responsável</span>
                    {lookup.profile(c.ownerId)?.name ?? '—'}
                  </p>
                  <p>
                    <span className="label mr-2">Conteúdos</span>
                    {items.length} · {pub} publicados
                  </p>
                </div>
                <div>
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className="label">Execução</span>
                    <span className="font-display text-[26px] font-extralight tabular-nums">{pct}%</span>
                  </div>
                  <Progress value={pct} />
                  <p className="mt-2 text-[11px] text-muted">
                    {done} de {items.length} aprovados ou publicados
                  </p>
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-line bg-paper/50 p-5 md:p-7">
                  {c.description && <p className="mb-5 max-w-2xl text-[13px] leading-relaxed">{c.description}</p>}
                  {items.length === 0 ? (
                    <p className="text-[12.5px] text-muted">Nenhum conteúdo associado ainda.</p>
                  ) : (
                    <div className="divide-y divide-line border border-line bg-white">
                      {items
                        .sort((a, b) => a.publishDate.localeCompare(b.publishDate))
                        .map((x) => (
                          <Link key={x.id} to={`/conteudos/${x.id}`} className="flex items-center gap-4 px-4 py-2.5 hover:bg-paper">
                            <Thumb content={x} className="h-11 w-9 shrink-0" />
                            <span className="min-w-0 flex-1 truncate text-[13px]">{x.title}</span>
                            <ChannelIcon channel={x.channel} className="text-muted" />
                            <span className="w-16 text-[12px] tabular-nums text-muted">{fmtDate(x.publishDate, 'dd/MM')}</span>
                            <StatusBadge status={x.status} size="sm" className="w-36" />
                          </Link>
                        ))}
                    </div>
                  )}
                  {editable && (
                    <Button size="sm" className="mt-4" onClick={() => setEdit(c)}>
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.4} /> Editar campanha
                    </Button>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </div>
      {edit && <CampaignDialog value={edit} onClose={() => setEdit(null)} />}
    </div>
  )
}

function CampaignDialog({ value, onClose }: { value: Partial<Campaign>; onClose: () => void }) {
  const { ws, provider, run, user } = useApp()
  const [c, setC] = useState<Partial<Campaign>>({ ownerId: user?.id, ...value })
  const set = <K extends keyof Campaign>(k: K, v: Campaign[K]) => setC((x) => ({ ...x, [k]: v }))
  return (
    <Dialog
      open
      onClose={onClose}
      title={c.id ? 'Editar campanha' : 'Nova campanha'}
      className="max-w-2xl"
      footer={
        <>
          {c.id && (
            <Button
              variant="danger"
              className="mr-auto"
              onClick={async () => {
                if (!confirm('Excluir campanha? Os conteúdos permanecem, sem campanha.')) return
                onClose()
                await run(() => provider.deleteCampaign(c.id!), 'Campanha excluída')
              }}
            >
              Excluir
            </Button>
          )}
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            disabled={!c.name?.trim() || (!!c.startDate && !!c.endDate && c.endDate < c.startDate)}
            onClick={async () => {
              onClose()
              await run(() => provider.saveCampaign(c as Campaign), 'Campanha salva')
            }}
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nome" className="sm:col-span-2">
          <Input value={c.name ?? ''} onChange={(e) => set('name', e.target.value)} autoFocus />
        </Field>
        <Field label="Tipo">
          <Select value={c.kind} onChange={(e) => set('kind', e.target.value as Campaign['kind'])}>
            <option value="institucional">Institucional</option>
            <option value="comercial">Comercial</option>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={c.status} onChange={(e) => set('status', e.target.value as Campaign['status'])}>
            {CAMPAIGN_STATUSES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Início">
          <Input type="date" value={c.startDate ?? ''} onChange={(e) => set('startDate', e.target.value)} />
        </Field>
        <Field label="Término">
          <Input type="date" value={c.endDate ?? ''} onChange={(e) => set('endDate', e.target.value)} />
        </Field>
        <Field label="Responsável">
          <Select value={c.ownerId ?? ''} onChange={(e) => set('ownerId', e.target.value)}>
            {ws.profiles
              .filter((p) => p.role !== 'diretoria')
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Objetivo" className="sm:col-span-2">
          <Textarea value={c.objective ?? ''} onChange={(e) => set('objective', e.target.value)} className="min-h-[64px]" />
        </Field>
        <Field label="Descrição" className="sm:col-span-2">
          <Textarea value={c.description ?? ''} onChange={(e) => set('description', e.target.value)} className="min-h-[80px]" />
        </Field>
        <Field label="Produtos relacionados" className="sm:col-span-2">
          <div className="flex flex-wrap gap-1.5">
            {ws.products
              .filter((p) => p.active)
              .map((p) => {
                const on = c.productIds?.includes(p.id)
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => set('productIds', on ? c.productIds!.filter((x) => x !== p.id) : [...(c.productIds ?? []), p.id])}
                    className={cn('border px-3 py-1.5 text-[12px]', on ? 'border-ink bg-ink text-paper' : 'border-line text-ink/75')}
                  >
                    {p.name}
                  </button>
                )
              })}
          </div>
        </Field>
      </div>
    </Dialog>
  )
}

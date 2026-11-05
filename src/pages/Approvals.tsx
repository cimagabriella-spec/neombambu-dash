import { Check, Eye, Inbox, PenLine } from 'lucide-react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChannelIcon, StatusBadge, Thumb } from '@/components/content/bits'
import { PreviewStudio } from '@/components/preview/PreviewStudio'
import { useNumberedPins } from '@/components/comments/Comments'
import { Button, buttonVariants, Checkbox, Dialog, Empty, Field, PageHeader, Segmented, Textarea } from '@/components/ui'
import { formatLabel } from '@/lib/constants'
import type { Content } from '@/lib/types'
import { cn, fmtDate, fromNow } from '@/lib/utils'
import { can, pickFields } from '@/lib/workflow'
import { useApp } from '@/store/app'

type Group = 'pendentes' | 'ajustes' | 'aprovados'

export default function Approvals() {
  const { ws, user, provider, run, lookup } = useApp()
  const [group, setGroup] = useState<Group>('pendentes')
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState(false)
  const [preview, setPreview] = useState<Content | null>(null)
  const [changesFor, setChangesFor] = useState<Content | null>(null)
  const [msg, setMsg] = useState('')
  const decider = !!user && can.approve(user.role)

  const lists = useMemo(() => {
    const by = (s: Content['status'][]) => ws.contents.filter((c) => s.includes(c.status)).sort((a, b) => (a.publishDate + a.publishTime).localeCompare(b.publishDate + b.publishTime))
    return { pendentes: by(['aguardando']), ajustes: by(['ajustes']), aprovados: by(['aprovado', 'programado']).reverse().slice(0, 30) }
  }, [ws])
  const list = lists[group]
  const selected = lists.pendentes.filter((c) => sel.has(c.id))
  const allSel = group === 'pendentes' && list.length > 0 && selected.length === list.length
  const toggle = (id: string) =>
    setSel((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  const submittedAt = (c: Content) => [...ws.approvals].reverse().find((e) => e.contentId === c.id && (e.action === 'submitted' || e.action === 'new_version'))?.createdAt

  return (
    <div className="pb-28">
      <PageHeader
        kicker="Diretoria"
        title="Central de Aprovações"
        subtitle={decider ? 'Revise as publicações pendentes, abra o preview e aprove em lote.' : 'Acompanhe o que está com a diretoria.'}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Segmented
          value={group}
          onChange={(g) => {
            setGroup(g)
            setSel(new Set())
          }}
          items={[
            { id: 'pendentes', label: `Pendentes · ${lists.pendentes.length}` },
            { id: 'ajustes', label: `Em ajuste · ${lists.ajustes.length}` },
            { id: 'aprovados', label: 'Aprovados recentes' },
          ]}
        />
        {decider && group === 'pendentes' && list.length > 0 && (
          <label className="flex cursor-pointer items-center gap-2.5 text-[12.5px] text-muted">
            <Checkbox checked={allSel} onChange={(v) => setSel(v ? new Set(list.map((c) => c.id)) : new Set())} label="Selecionar todos" /> Selecionar todos
          </label>
        )}
      </div>

      {list.length === 0 ? (
        <Empty icon={<Inbox className="h-6 w-6" strokeWidth={1} />} title={group === 'pendentes' ? 'Nenhuma aprovação pendente' : 'Nada por aqui'}>
          {group === 'pendentes' && 'Quando o marketing enviar um conteúdo, ele aparecerá nesta lista.'}
        </Empty>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {list.map((c) => {
            const days = differenceInCalendarDays(parseISO(c.publishDate), new Date())
            const isSel = sel.has(c.id)
            const sub = submittedAt(c)
            return (
              <article
                key={c.id}
                onClick={() => decider && group === 'pendentes' && toggle(c.id)}
                className={cn('group flex flex-col border bg-white transition-all animate-fade-in', isSel ? 'border-ink shadow-[0_0_0_1px_rgb(var(--nb-ink))]' : 'border-line hover:border-ink/30', decider && group === 'pendentes' && 'cursor-pointer')}
              >
                <div className="flex gap-4 p-4">
                  <div className="relative shrink-0">
                    <Thumb content={c} className="h-[132px] w-[106px]" />
                    {decider && group === 'pendentes' && <Checkbox checked={isSel} onChange={() => toggle(c.id)} className="absolute left-2 top-2" label={`Selecionar ${c.title}`} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[11px] text-muted">
                        <ChannelIcon channel={c.channel} /> {formatLabel(c.format)} · v{c.version}
                      </span>
                      {group !== 'pendentes' && <StatusBadge status={c.status} size="sm" />}
                    </div>
                    <h3 className="mt-1.5 line-clamp-2 font-display text-[15px] font-light leading-snug">{c.title}</h3>
                    <p className={cn('mt-1 text-[11.5px]', days <= 2 && group === 'pendentes' ? 'text-st-ajustes' : 'text-muted')}>
                      Publica {fmtDate(c.publishDate, "d 'de' MMM")} · {c.publishTime}
                      {group === 'pendentes' && (days < 0 ? ' · data passada' : days === 0 ? ' · hoje' : ` · em ${days} dia${days > 1 ? 's' : ''}`)}
                    </p>
                    <p className="mt-2 line-clamp-3 text-[12.5px] leading-relaxed text-ink/75">{c.caption || <span className="italic text-muted">Sem legenda.</span>}</p>
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-line px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <span className="truncate text-[11px] text-muted">
                    {lookup.campaign(c.campaignId)?.name ?? lookup.profile(c.ownerId)?.name}
                    {sub && ` · enviado ${fromNow(sub)}`}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setPreview(c)}>
                      <Eye className="h-3.5 w-3.5" strokeWidth={1.4} /> Preview
                    </Button>
                    {decider && group === 'pendentes' && (
                      <>
                        <Button size="sm" variant="ghost" className="text-st-ajustes" onClick={() => setChangesFor(c)} title="Solicitar ajustes">
                          <PenLine className="h-3.5 w-3.5" strokeWidth={1.4} />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-olive" title="Aprovar" onClick={() => run(() => provider.approve([{ id: c.id, version: c.version }]), `“${c.title}” aprovado`)}>
                          <Check className="h-3.5 w-3.5" strokeWidth={1.8} />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* barra de aprovação em lote */}
      {decider && selected.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink bg-ink text-paper animate-fade-in lg:left-[260px]">
          <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-4 md:px-10">
            <div className="flex items-center gap-4">
              <div className="hidden -space-x-2 sm:flex">
                {selected.slice(0, 5).map((c) => (
                  <Thumb key={c.id} content={c} className="h-10 w-8 ring-2 ring-ink" />
                ))}
              </div>
              <p className="text-[13px]">
                {selected.length} selecionado{selected.length > 1 && 's'}
                <button className="ml-3 text-[12px] text-paper/50 hover:text-paper" onClick={() => setSel(new Set())}>
                  Limpar
                </button>
              </p>
            </div>
            <Button variant="olive" size="lg" onClick={() => setConfirm(true)}>
              <Check className="h-4 w-4" strokeWidth={1.6} /> Aprovar {selected.length}
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={`Aprovar ${selected.length} conteúdo${selected.length > 1 ? 's' : ''}`}
        description={`Cada aprovação será registrada com seu nome (${user?.name}), data e horário. Se algum item mudar de versão antes da confirmação, nada é aprovado.`}
        footer={
          <>
            <Button onClick={() => setConfirm(false)}>Revisar</Button>
            <Button
              variant="olive"
              onClick={async () => {
                setConfirm(false)
                const ok = await run(() => provider.approve(selected.map((c) => ({ id: c.id, version: c.version }))), `${selected.length} conteúdo(s) aprovado(s)`)
                if (ok !== undefined) setSel(new Set())
              }}
            >
              Confirmar aprovação
            </Button>
          </>
        }
      >
        <ul className="divide-y divide-line border border-line">
          {selected.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-3 py-2.5">
              <Thumb content={c} className="h-11 w-9 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px]">{c.title}</p>
                <p className="flex items-center gap-1.5 text-[11px] text-muted">
                  <ChannelIcon channel={c.channel} /> {formatLabel(c.format)} · {fmtDate(c.publishDate, 'dd/MM')} {c.publishTime}
                </p>
              </div>
              <span className="border border-line px-2 py-0.5 text-[11px] tabular-nums">v{c.version}</span>
            </li>
          ))}
        </ul>
      </Dialog>

      <Dialog
        open={!!changesFor}
        onClose={() => setChangesFor(null)}
        title="Solicitar ajustes"
        description={changesFor ? `${changesFor.title} · v${changesFor.version}` : ''}
        footer={
          <>
            <Button onClick={() => setChangesFor(null)}>Cancelar</Button>
            <Button
              variant="primary"
              disabled={msg.trim().length < 5}
              onClick={async () => {
                const c = changesFor!
                setChangesFor(null)
                await run(() => provider.requestChanges(c.id, c.version, msg), 'Ajustes solicitados')
                setMsg('')
                setSel((s) => {
                  const n = new Set(s)
                  n.delete(c.id)
                  return n
                })
              }}
            >
              Enviar solicitação
            </Button>
          </>
        }
      >
        <Field label="Alterações necessárias (obrigatório)">
          <Textarea autoFocus value={msg} onChange={(e) => setMsg(e.target.value)} className="min-h-[120px]" placeholder="Descreva o que precisa ser alterado…" />
        </Field>
      </Dialog>

      <PreviewDialog content={preview} onClose={() => setPreview(null)} />
    </div>
  )
}

function PreviewDialog({ content, onClose }: { content: Content | null; onClose: () => void }) {
  const pins = useNumberedPins(content?.id ?? '', content?.version ?? 0)
  if (!content) return null
  return (
    <Dialog
      open
      onClose={onClose}
      title={content.title}
      description={`v${content.version} · ${fmtDate(content.publishDate, "d 'de' MMMM")} · ${content.publishTime}`}
      className="max-w-3xl"
      footer={
        <Link to={`/conteudos/${content.id}`} className={buttonVariants({ variant: 'primary' })}>
          Abrir conteúdo completo
        </Link>
      }
    >
      <PreviewStudio fields={pickFields(content)} pins={{ pins }} canAnnotate={false} />
    </Dialog>
  )
}

import { ArrowDown, ArrowLeft, ArrowUp, Copy, History, Link2, MoreHorizontal, Plus, Repeat, Send, ShieldAlert, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApprovalActions } from '@/components/content/ApprovalActions'
import { ChannelIcon, StatusBadge } from '@/components/content/bits'
import { CommentsPanel, useNumberedPins } from '@/components/comments/Comments'
import { PreviewStudio } from '@/components/preview/PreviewStudio'
import { Avatar, Badge, Button, Dialog, Empty, Field, Input, Select, Tabs, Textarea } from '@/components/ui'
import { CHANNELS, formatLabel, formatsFor, statusLabel } from '@/lib/constants'
import type { Asset, Channel, CommentPin, Content, ContentFields, Format, Status } from '@/lib/types'
import { cn, fmtDate, fmtDateTime, uid } from '@/lib/utils'
import { allowedTransitions, can, changedVersionedFields, pickFields, planUpdate } from '@/lib/workflow'
import { useApp } from '@/store/app'

type Tab = 'editorial' | 'producao' | 'artes' | 'comentarios' | 'historico'
const EDITABLE: (keyof Content)[] = ['title', 'publishDate', 'publishTime', 'channel', 'format', 'campaignId', 'editorialLineId', 'productIds', 'objective', 'copyArt', 'caption', 'cta', 'hashtags', 'internalNotes', 'referenceLinks', 'assets']
const FIELD_LABEL: Partial<Record<keyof ContentFields, string>> = {
  title: 'Título', channel: 'Rede', format: 'Formato', campaignId: 'Campanha', editorialLineId: 'Linha editorial', productIds: 'Produtos', objective: 'Objetivo',
  copyArt: 'Copy da arte', caption: 'Legenda', cta: 'CTA', hashtags: 'Hashtags', referenceLinks: 'Referências', assets: 'Artes',
}

export default function ContentDetail() {
  const { id } = useParams()
  const { ws } = useApp()
  const content = ws.contents.find((c) => c.id === id)
  if (!content)
    return (
      <div>
        <BackLink />
        <Empty title="Conteúdo não encontrado">Ele pode ter sido excluído.</Empty>
      </div>
    )
  return <Editor key={content.id} content={content} />
}

function BackLink() {
  return (
    <Link to="/conteudos" className="mb-6 inline-flex items-center gap-2 text-[12px] text-muted hover:text-ink">
      <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.4} /> Conteúdos
    </Link>
  )
}

function Editor({ content }: { content: Content }) {
  const { ws, user, provider, run, lookup } = useApp()
  const nav = useNavigate()
  const role = user!.role
  const readOnly = !can.editContent(role) || content.status === 'publicado'
  const [draft, setDraft] = useState<Content>(content)
  const [tab, setTab] = useState<Tab>(role === 'diretoria' ? 'comentarios' : 'editorial')
  const [viewVersion, setViewVersion] = useState<number | null>(null)
  const [commentVersion, setCommentVersion] = useState<number | 'all'>(content.version)
  const [pendingPin, setPendingPin] = useState<CommentPin | null>(null)
  const [activePin, setActivePin] = useState<string | null>(null)
  const [confirmSave, setConfirmSave] = useState(false)
  const [menu, setMenu] = useState(false)
  const commentsRef = useRef<HTMLDivElement>(null)

  const patch = useMemo(() => {
    const p: Partial<Content> = {}
    for (const k of EDITABLE) if (JSON.stringify(draft[k]) !== JSON.stringify(content[k])) (p as Record<string, unknown>)[k] = draft[k]
    return p
  }, [draft, content])
  const dirty = Object.keys(patch).length > 0
  // sincroniza com o servidor quando não há edição local
  useEffect(() => {
    if (!dirty) setDraft(content)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content])
  useEffect(() => setCommentVersion(content.version), [content.version])

  let plan: ReturnType<typeof planUpdate> | null = null
  let planError = ''
  try {
    plan = dirty ? planUpdate(content, patch) : null
  } catch (e) {
    planError = (e as Error).message
  }

  const save = async () => {
    setConfirmSave(false)
    await run(() => provider.updateContent(content.id, patch), plan?.createsVersion ? `Versão ${content.version + 1} criada` : 'Alterações salvas')
  }
  const set = <K extends keyof Content>(k: K, v: Content[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const shownVersion = viewVersion ?? content.version
  const snapshot = viewVersion ? ws.versions.find((v) => v.contentId === content.id && v.number === viewVersion)?.snapshot : null
  const previewFields: ContentFields = snapshot ?? pickFields(draft)
  const pins = useNumberedPins(content.id, viewVersion ?? (commentVersion === 'all' ? 'all' : commentVersion))
  const transitions = allowedTransitions(role, content.status).filter((s) => s !== 'aguardando')
  const canSubmit = can.editContent(role) && ['ideia', 'producao', 'revisao', 'ajustes'].includes(content.status)
  const focusComment = () => {
    setTab('comentarios')
    setTimeout(() => {
      commentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      document.getElementById('nb-comment-box')?.focus()
    }, 50)
  }

  return (
    <div className="pb-24">
      <BackLink />

      {/* cabeçalho */}
      <div className="mb-8 flex flex-col gap-6 border-b border-line pb-8 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 animate-fade-in">
          <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <StatusBadge status={content.status} />
            <span className="flex items-center gap-1.5 text-[11.5px] text-muted">
              <ChannelIcon channel={content.channel} /> {formatLabel(content.format)}
            </span>
            <span className="text-[11.5px] text-muted">v{content.version}</span>
            {content.parentId && (
              <Link to={`/conteudos/${content.parentId}`} className="flex items-center gap-1 text-[11.5px] text-wood hover:underline">
                <Repeat className="h-3 w-3" /> adaptado de outro conteúdo
              </Link>
            )}
          </div>
          <h1 className="font-display text-[26px] font-extralight leading-tight tracking-tight md:text-[34px]">{draft.title || 'Sem título'}</h1>
          <p className="mt-2 text-[13px] text-muted">
            {fmtDate(content.publishDate, "EEEE, d 'de' MMMM yyyy")} · {content.publishTime} · resp. {lookup.profile(content.ownerId)?.name}
          </p>
        </div>

        {can.editContent(role) && (
          <div className="flex flex-wrap items-center gap-2">
            {transitions.length > 0 && (
              <Select
                value=""
                onChange={(e) => e.target.value && run(() => provider.setStatus(content.id, e.target.value as Status), `Status: ${statusLabel(e.target.value as Status)}`)}
                className="h-10 w-auto min-w-[180px] text-[12.5px]"
                aria-label="Mover status"
              >
                <option value="">Mover para…</option>
                {transitions.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </Select>
            )}
            {canSubmit && (
              <Button variant="primary" disabled={dirty} title={dirty ? 'Salve as alterações antes de enviar' : undefined} onClick={() => run(() => provider.submitForApproval(content.id), 'Enviado para aprovação da diretoria')}>
                <Send className="h-4 w-4" strokeWidth={1.4} /> {content.status === 'ajustes' ? 'Reenviar para aprovação' : 'Enviar para aprovação'}
              </Button>
            )}
            <div className="relative">
              <Button size="icon" onClick={() => setMenu((m) => !m)} aria-label="Mais ações">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
              {menu && (
                <div className="absolute right-0 top-11 z-30 w-64 border border-line bg-white py-1 shadow-xl animate-fade-in" onMouseLeave={() => setMenu(false)}>
                  <MenuItem
                    icon={<Copy className="h-4 w-4" />}
                    onClick={async () => {
                      setMenu(false)
                      const c = await run(() => provider.duplicateContent(content.id), 'Conteúdo duplicado')
                      if (c) nav(`/conteudos/${c.id}`)
                    }}
                  >
                    Duplicar
                  </MenuItem>
                  {CHANNELS.filter((ch) => ch.id !== content.channel).map((ch) => (
                    <MenuItem
                      key={ch.id}
                      icon={<ChannelIcon channel={ch.id} className="h-4 w-4" />}
                      onClick={async () => {
                        setMenu(false)
                        const fmt: Format = ch.id === 'linkedin' ? (content.format === 'carrossel' ? 'documento' : content.format === 'reels' ? 'video' : 'post') : content.format === 'documento' ? 'carrossel' : content.format === 'video' ? 'reels' : 'feed'
                        const c = await run(() => provider.duplicateContent(content.id, { channel: ch.id, format: fmt }), `Versão para ${ch.label} criada`)
                        if (c) nav(`/conteudos/${c.id}`)
                      }}
                    >
                      Criar versão para {ch.label}
                    </MenuItem>
                  ))}
                  {content.status !== 'publicado' && (
                    <MenuItem
                      icon={<Trash2 className="h-4 w-4" />}
                      danger
                      onClick={async () => {
                        setMenu(false)
                        if (!confirm('Excluir este conteúdo e todo o seu histórico?')) return
                        await run(() => provider.deleteContent(content.id), 'Conteúdo excluído')
                        nav('/conteudos')
                      }}
                    >
                      Excluir
                    </MenuItem>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {can.approve(role) && (
        <div className={cn('mb-8 border p-5 md:p-6', content.status === 'aguardando' ? 'border-st-aguardando/40 bg-st-aguardando/[0.05]' : 'border-line bg-white')}>
          <p className="label mb-3">Decisão da diretoria · v{content.version}</p>
          <ApprovalActions content={content} onComment={focusComment} />
        </div>
      )}

      {content.status === 'ajustes' && can.editContent(role) && (
        <Notice tone="ajustes">
          A diretoria solicitou ajustes{' '}
          {content.submittedVersion === content.version ? '— edite o conteúdo para gerar a próxima versão e reenvie.' : `— a v${content.version} já contém alterações. Revise e reenvie para aprovação.`}
          <AdjustmentSummary content={content} />
        </Notice>
      )}

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* preview */}
        <div className="xl:sticky xl:top-24 xl:self-start">
          {viewVersion && (
            <div className="mb-3 flex items-center justify-between bg-ink px-4 py-2.5 text-[12px] text-paper">
              <span>
                Visualizando a versão {viewVersion}
                {viewVersion !== content.version && ' (anterior)'}
              </span>
              <button onClick={() => setViewVersion(null)} className="flex items-center gap-1 text-sand hover:text-paper">
                Voltar à atual <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <PreviewStudio
            key={`${content.id}-${previewFields.format}-${previewFields.channel}`}
            fields={previewFields}
            pins={{
              pins,
              activePin,
              onPinClick: (pid) => {
                setActivePin(pid)
                setTab('comentarios')
              },
              onPin: (assetId, x, y) => {
                setPendingPin({ assetId, x, y })
                setCommentVersion(shownVersion)
                focusComment()
              },
            }}
          />
        </div>

        {/* painel */}
        <div ref={commentsRef} className="min-w-0 scroll-mt-24">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: 'editorial', label: readOnly ? 'Detalhes' : 'Editorial' },
              ...(!readOnly ? [{ id: 'producao' as Tab, label: 'Produção' }, { id: 'artes' as Tab, label: `Artes (${draft.assets.length})` }] : []),
              { id: 'comentarios', label: `Comentários (${ws.comments.filter((c) => c.contentId === content.id && !c.resolved && !c.parentId).length})` },
              { id: 'historico', label: 'Versões e histórico' },
            ]}
            className="mb-6"
          />

          {tab === 'editorial' && (readOnly ? <ReadOnlySummary c={draft} /> : <EditorialForm draft={draft} set={set} />)}
          {tab === 'producao' && !readOnly && <ProductionForm draft={draft} set={set} />}
          {tab === 'artes' && !readOnly && <AssetsManager draft={draft} set={set} />}
          {tab === 'comentarios' && (
            <CommentsPanel
              content={content}
              version={commentVersion}
              setVersion={setCommentVersion}
              pendingPin={pendingPin}
              clearPendingPin={() => setPendingPin(null)}
              activePin={activePin}
              setActivePin={setActivePin}
            />
          )}
          {tab === 'historico' && <HistoryPanel content={content} viewVersion={viewVersion} setViewVersion={setViewVersion} />}
        </div>
      </div>

      {/* barra de salvar */}
      {dirty && !readOnly && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur lg:left-[260px]">
          <div className="mx-auto flex max-w-[1480px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-10">
            <p className="text-[12.5px] text-muted">
              {planError ? (
                <span className="text-st-ajustes">{planError}</span>
              ) : plan?.requiresReapproval ? (
                <span className="flex items-center gap-2 text-st-aguardando">
                  <ShieldAlert className="h-4 w-4" strokeWidth={1.4} /> Este conteúdo já foi aprovado. Salvar gera a v{content.version + 1} e solicita nova aprovação.
                </span>
              ) : plan?.createsVersion ? (
                `Salvar cria a versão ${content.version + 1} (a v${content.version} enviada permanece no histórico).`
              ) : (
                'Alterações não salvas.'
              )}
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setDraft(content)}>Descartar</Button>
              <Button variant="primary" disabled={!!planError || !draft.title.trim()} onClick={() => (plan?.createsVersion ? setConfirmSave(true) : save())}>
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        title={plan?.requiresReapproval ? 'Gerar nova versão e reenviar' : 'Gerar nova versão'}
        description={plan?.requiresReapproval ? 'A aprovação atual deixa de valer para a nova versão. A diretoria será notificada.' : 'A versão enviada à diretoria fica preservada no histórico.'}
        footer={
          <>
            <Button onClick={() => setConfirmSave(false)}>Cancelar</Button>
            <Button variant="primary" onClick={save}>
              Criar v{content.version + 1}
            </Button>
          </>
        }
      >
        <p className="label mb-2">Campos alterados</p>
        <div className="flex flex-wrap gap-1.5">
          {changedVersionedFields(content, patch).map((k) => (
            <Badge key={k}>{FIELD_LABEL[k] ?? k}</Badge>
          ))}
        </div>
      </Dialog>
    </div>
  )
}

function MenuItem({ icon, children, onClick, danger }: { icon: ReactNode; children: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cn('flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] hover:bg-paper', danger ? 'text-st-ajustes' : 'text-ink')}>
      <span className="text-muted">{icon}</span>
      {children}
    </button>
  )
}

function Notice({ tone, children }: { tone: 'ajustes'; children: ReactNode }) {
  return <div className={cn('mb-8 border px-5 py-4 text-[13px]', tone === 'ajustes' && 'border-st-ajustes/30 bg-st-ajustes/[0.05] text-ink')}>{children}</div>
}

function AdjustmentSummary({ content }: { content: Content }) {
  const { ws, lookup } = useApp()
  const last = [...ws.approvals].reverse().find((e) => e.contentId === content.id && e.action === 'changes_requested')
  if (!last) return null
  return (
    <blockquote className="mt-3 border-l-2 border-st-ajustes/50 pl-3 text-[13px] text-ink/85">
      “{last.message}”<span className="mt-1 block text-[11px] text-muted">— {lookup.profile(last.userId)?.name}, {fmtDateTime(last.createdAt)} · v{last.version}</span>
    </blockquote>
  )
}

/* ───────────────────────── formulários */

type Setter = <K extends keyof Content>(k: K, v: Content[K]) => void

function EditorialForm({ draft, set }: { draft: Content; set: Setter }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Título" className="sm:col-span-2">
        <Input value={draft.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field label="Data de publicação">
        <Input type="date" value={draft.publishDate} onChange={(e) => set('publishDate', e.target.value)} />
      </Field>
      <Field label="Horário">
        <Input type="time" value={draft.publishTime} onChange={(e) => set('publishTime', e.target.value)} />
      </Field>
      <Field label="Rede social">
        <Select
          value={draft.channel}
          onChange={(e) => {
            const ch = e.target.value as Channel
            set('channel', ch)
            if (!formatsFor(ch).some((f) => f.id === draft.format)) set('format', formatsFor(ch)[0].id)
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
        <Select value={draft.format} onChange={(e) => set('format', e.target.value as Format)}>
          {formatsFor(draft.channel).map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Objetivo do conteúdo" className="sm:col-span-2">
        <Textarea value={draft.objective} onChange={(e) => set('objective', e.target.value)} className="min-h-[72px]" />
      </Field>
    </div>
  )
}

function ProductionForm({ draft, set }: { draft: Content; set: Setter }) {
  const [link, setLink] = useState('')
  const limit = draft.channel === 'instagram' ? 2200 : 3000
  return (
    <div className="space-y-5">
      <Field label="Copy da arte" hint="Texto aplicado sobre a arte.">
        <Textarea value={draft.copyArt} onChange={(e) => set('copyArt', e.target.value)} className="min-h-[64px]" />
      </Field>
      <Field label="Legenda completa" hint={<span className={cn(draft.caption.length > limit && 'text-st-ajustes')}>{draft.caption.length} / {limit} caracteres</span>}>
        <Textarea value={draft.caption} onChange={(e) => set('caption', e.target.value)} className="min-h-[180px]" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="CTA">
          <Input value={draft.cta} onChange={(e) => set('cta', e.target.value)} />
        </Field>
        <Field label="Hashtags" hint={`${(draft.hashtags.match(/#/g) ?? []).length} hashtags`}>
          <Input value={draft.hashtags} onChange={(e) => set('hashtags', e.target.value)} placeholder="#neobambu #arquitetura" />
        </Field>
      </div>
      <Field label="Observações internas" hint="Visível apenas para a equipe; não gera nova versão.">
        <Textarea value={draft.internalNotes} onChange={(e) => set('internalNotes', e.target.value)} className="min-h-[72px]" />
      </Field>
      <div>
        <p className="label mb-1.5">Links de referência</p>
        <div className="space-y-1.5">
          {draft.referenceLinks.map((l, i) => (
            <div key={i} className="flex items-center gap-2 border border-line bg-white px-3 py-2 text-[12.5px]">
              <Link2 className="h-3.5 w-3.5 shrink-0 text-muted" />
              <a href={l} target="_blank" rel="noreferrer noopener" className="min-w-0 flex-1 truncate hover:underline">
                {l}
              </a>
              <button onClick={() => set('referenceLinks', draft.referenceLinks.filter((_, k) => k !== i))} className="text-muted hover:text-ink" aria-label="Remover">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" className="h-9" />
            <Button
              size="sm"
              className="h-9"
              disabled={!/^https?:\/\/\S+\.\S+/.test(link)}
              onClick={() => {
                set('referenceLinks', [...draft.referenceLinks, link.trim()])
                setLink('')
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReadOnlySummary({ c }: { c: Content }) {
  const row = (label: string, value: ReactNode) => (
    <div className="grid gap-1 border-b border-line py-3.5 sm:grid-cols-[160px_1fr] sm:gap-6">
      <dt className="label pt-0.5">{label}</dt>
      <dd className="whitespace-pre-line text-[13.5px] leading-relaxed">{value || <span className="text-muted">—</span>}</dd>
    </div>
  )
  return (
    <dl>
      {row('Publicação', `${fmtDate(c.publishDate, "d 'de' MMMM yyyy")} · ${c.publishTime}`)}
      {row('Canal', `${CHANNELS.find((x) => x.id === c.channel)?.label} · ${formatLabel(c.format)}`)}
      {row('Objetivo', c.objective)}
      {row('Copy da arte', c.copyArt)}
      {row('Legenda', c.caption)}
      {row('CTA', c.cta)}
      {row('Hashtags', c.hashtags)}
      {c.referenceLinks.length > 0 &&
        row(
          'Referências',
          c.referenceLinks.map((l) => (
            <a key={l} href={l} target="_blank" rel="noreferrer noopener" className="block truncate underline-offset-2 hover:underline">
              {l}
            </a>
          )),
        )}
    </dl>
  )
}

/* ───────────────────────── artes */

function AssetsManager({ draft, set }: { draft: Content; set: Setter }) {
  const { provider, toast } = useApp()
  const [busy, setBusy] = useState(0)
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const multi = draft.format === 'carrossel' || draft.format === 'documento' || draft.format === 'stories'
  const minW = draft.channel === 'instagram' ? 1080 : 1200

  const upload = async (files: FileList | File[]) => {
    const list = Array.from(files)
    setBusy((b) => b + list.length)
    const added: Asset[] = []
    for (const f of list) {
      try {
        const r = await provider.uploadFile(f, { contentId: draft.id })
        if (r.kind === 'file') throw new Error('Para artes, envie imagens ou vídeos.')
        added.push({ id: uid(), kind: r.kind, name: f.name, url: r.url, path: r.path, width: r.width, height: r.height })
      } catch (e) {
        toast(`${f.name}: ${(e as Error).message}`, 'error')
      } finally {
        setBusy((b) => b - 1)
      }
    }
    if (added.length) {
      set('assets', multi ? [...draft.assets, ...added] : added.slice(0, 1))
      toast(`${added.length} arquivo(s) anexado(s). Salve para registrar.`)
    }
  }
  const move = (i: number, d: number) => {
    const a = [...draft.assets]
    const [x] = a.splice(i, 1)
    a.splice(i + d, 0, x)
    set('assets', a)
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          if (e.dataTransfer.files.length) upload(e.dataTransfer.files)
        }}
        className={cn('flex flex-col items-center justify-center border border-dashed px-6 py-10 text-center transition-colors', over ? 'border-ink bg-sand/20' : 'border-line bg-white')}
      >
        <Upload className="mb-3 h-5 w-5 text-wood" strokeWidth={1.2} />
        <p className="text-[13.5px]">{busy ? `Enviando ${busy} arquivo(s)…` : 'Arraste imagens ou vídeos aqui'}</p>
        <p className="mt-1 text-[11.5px] text-muted">
          {multi ? 'Múltiplos arquivos para carrossel · ' : 'Uma arte por publicação · '}PNG, JPG, WEBP, MP4 · mínimo recomendado {minW}px de largura
        </p>
        <div className="mt-5 flex gap-2">
          <Button size="sm" onClick={() => input.current?.click()} disabled={busy > 0}>
            Selecionar arquivos
          </Button>
        </div>
        <input ref={input} type="file" hidden multiple={multi} accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/quicktime,video/webm" onChange={(e) => e.target.files && upload(e.target.files)} />
      </div>

      <div className="mt-5 space-y-2">
        {draft.assets.map((a, i) => {
          const low = a.kind === 'image' && a.width && a.width < minW
          return (
            <div key={a.id} className="flex items-center gap-4 border border-line bg-white p-2.5">
              <span className="w-5 text-center text-[11px] tabular-nums text-muted">{i + 1}</span>
              <div className="h-16 w-14 shrink-0 overflow-hidden bg-mineral">{a.kind === 'video' ? <video src={a.url} className="h-full w-full object-cover" muted /> : <img src={a.url} alt="" className="h-full w-full object-cover" />}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px]">{a.name}</p>
                <p className={cn('text-[11px]', low ? 'text-st-ajustes' : 'text-muted')}>
                  {a.width && a.height ? `${a.width} × ${a.height}px` : a.kind === 'video' ? 'Vídeo' : 'Dimensões indisponíveis'}
                  {low && ' · abaixo da resolução recomendada'}
                  {a.mediaId && ' · da biblioteca'}
                </p>
              </div>
              <div className="flex items-center">
                <button disabled={i === 0} onClick={() => move(i, -1)} className="p-1.5 text-muted hover:text-ink disabled:opacity-30" aria-label="Mover para cima">
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button disabled={i === draft.assets.length - 1} onClick={() => move(i, 1)} className="p-1.5 text-muted hover:text-ink disabled:opacity-30" aria-label="Mover para baixo">
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => set('assets', draft.assets.filter((x) => x.id !== a.id))} className="p-1.5 text-muted hover:text-st-ajustes" aria-label="Remover">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ───────────────────────── versões e histórico */

const ACTION_LABEL: Record<string, string> = {
  created: 'Conteúdo criado',
  submitted: 'Enviado para aprovação',
  approved: 'Aprovado',
  changes_requested: 'Ajustes solicitados',
  new_version: 'Nova versão',
  status_changed: 'Status alterado',
  rescheduled: 'Reagendado',
}

function HistoryPanel({ content, viewVersion, setViewVersion }: { content: Content; viewVersion: number | null; setViewVersion: (v: number | null) => void }) {
  const { ws, lookup } = useApp()
  const versions = ws.versions.filter((v) => v.contentId === content.id).sort((a, b) => b.number - a.number)
  const events = ws.approvals.filter((e) => e.contentId === content.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return (
    <div className="space-y-10">
      <section>
        <p className="label mb-3">Versões</p>
        <div className="divide-y divide-line border border-line bg-white">
          {versions.map((v, i) => {
            const prev = versions[i + 1]
            const changed = prev ? changedVersionedFields(prev.snapshot, v.snapshot as Partial<Content>) : []
            const approved = content.approvedVersion === v.number && ['aprovado', 'programado', 'publicado'].includes(content.status)
            return (
              <div key={v.id} className={cn('flex items-start gap-4 px-4 py-3.5', viewVersion === v.number && 'bg-paper')}>
                <span className="mt-0.5 font-display text-[18px] font-extralight">v{v.number}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px]">
                    {fmtDateTime(v.createdAt)} · {lookup.profile(v.createdBy)?.name ?? '—'}
                    {v.number === content.version && <span className="ml-2 text-[10.5px] uppercase tracking-label text-muted">atual</span>}
                    {approved && <span className="ml-2 text-[10.5px] uppercase tracking-label text-olive">aprovada</span>}
                    {content.submittedVersion === v.number && content.status === 'aguardando' && <span className="ml-2 text-[10.5px] uppercase tracking-label text-st-aguardando">em aprovação</span>}
                  </p>
                  {prev && <p className="mt-1 text-[11.5px] text-muted">{changed.length ? `Alterado: ${changed.map((k) => FIELD_LABEL[k] ?? k).join(', ')}` : 'Sem alterações de conteúdo'}</p>}
                </div>
                <Button size="sm" variant={viewVersion === v.number ? 'primary' : 'outline'} onClick={() => setViewVersion(viewVersion === v.number ? null : v.number)}>
                  {viewVersion === v.number ? 'Visualizando' : 'Ver'}
                </Button>
              </div>
            )
          })}
        </div>
      </section>
      <section>
        <p className="label mb-3">Histórico de aprovações</p>
        <ol className="relative space-y-5 border-l border-line pl-6">
          {events.map((e) => (
            <li key={e.id} className="relative">
              <span className={cn('absolute -left-[28.5px] top-1.5 h-2 w-2 rounded-full ring-4 ring-paper', e.action === 'approved' ? 'bg-st-aprovado' : e.action === 'changes_requested' ? 'bg-st-ajustes' : e.action === 'submitted' ? 'bg-st-aguardando' : 'bg-line')} />
              <div className="flex items-start gap-3">
                <Avatar name={lookup.profile(e.userId)?.name} className="h-6 w-6 text-[9px]" />
                <div>
                  <p className="text-[12.5px]">
                    <span className="text-ink">{ACTION_LABEL[e.action]}</span>
                    <span className="text-muted"> · v{e.version} · {lookup.profile(e.userId)?.name ?? 'Sistema'}</span>
                  </p>
                  <p className="text-[11px] text-muted">
                    {fmtDateTime(e.createdAt)}
                    {e.action === 'status_changed' && e.fromStatus && e.toStatus && ` · ${statusLabel(e.fromStatus)} → ${statusLabel(e.toStatus)}`}
                  </p>
                  {e.message && <p className="mt-1 text-[12.5px] text-ink/80">{e.message}</p>}
                </div>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-6 flex items-center gap-2 text-[11px] text-muted">
          <History className="h-3.5 w-3.5" /> Registro imutável — gerado pelo sistema a cada ação.
        </p>
      </section>
    </div>
  )
}

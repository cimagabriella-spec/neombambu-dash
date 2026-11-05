import { Check, CornerDownRight, MapPin, RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Avatar, Button, Textarea } from '@/components/ui'
import type { Comment, CommentPin, Content } from '@/lib/types'
import { cn, fromNow, fmtDateTime } from '@/lib/utils'
import { useApp } from '@/store/app'

export function useNumberedPins(contentId: string, version: number | 'all') {
  const { ws } = useApp()
  return useMemo(() => {
    const list = ws.comments.filter((c) => c.contentId === contentId && c.pin && !c.parentId && (version === 'all' || c.version === version))
    return list.map((c, i) => ({ ...c, index: i + 1 }))
  }, [ws.comments, contentId, version])
}

export function CommentsPanel({
  content,
  version,
  setVersion,
  pendingPin,
  clearPendingPin,
  activePin,
  setActivePin,
  autoFocus,
}: {
  content: Content
  version: number | 'all'
  setVersion: (v: number | 'all') => void
  pendingPin: CommentPin | null
  clearPendingPin: () => void
  activePin: string | null
  setActivePin: (id: string | null) => void
  autoFocus?: boolean
}) {
  const { ws, lookup, provider, run } = useApp()
  const [body, setBody] = useState('')
  const [showResolved, setShowResolved] = useState(true)
  const pins = useNumberedPins(content.id, version)
  const pinIndex = new Map(pins.map((p) => [p.id, p.index]))
  const all = ws.comments.filter((c) => c.contentId === content.id)
  const roots = all
    .filter((c) => !c.parentId && (version === 'all' || c.version === version) && (showResolved || !c.resolved))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const replies = (id: string) => all.filter((c) => c.parentId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const versions = [...new Set(ws.versions.filter((v) => v.contentId === content.id).map((v) => v.number))].sort((a, b) => b - a)
  const targetVersion = version === 'all' ? content.version : version

  const send = async () => {
    if (!body.trim()) return
    const ok = await run(() => provider.addComment({ contentId: content.id, version: targetVersion, body, pin: pendingPin }), pendingPin ? 'Comentário marcado na imagem' : 'Comentário adicionado')
    if (ok) {
      setBody('')
      clearPendingPin()
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {(['all', ...versions] as (number | 'all')[]).map((v) => (
            <button key={v} onClick={() => setVersion(v)} className={cn('border px-2.5 py-1 text-[11.5px] transition-colors', version === v ? 'border-ink bg-ink text-paper' : 'border-line text-muted hover:text-ink')}>
              {v === 'all' ? 'Todas as versões' : `v${v}${v === content.version ? ' · atual' : ''}`}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[11.5px] text-muted">
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} className="accent-ink" /> Mostrar resolvidos
        </label>
      </div>

      <div className={cn('border bg-white transition-colors', pendingPin ? 'border-ink/50' : 'border-line')}>
        {pendingPin && (
          <div className="flex items-center justify-between border-b border-line bg-sand/30 px-3 py-2 text-[11.5px]">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} /> Comentário no ponto marcado da imagem
            </span>
            <button onClick={clearPendingPin} className="text-muted hover:text-ink">
              Remover marcação
            </button>
          </div>
        )}
        <Textarea
          id="nb-comment-box"
          autoFocus={autoFocus || !!pendingPin}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === 'Enter' && send()}
          placeholder={`Comentar na v${targetVersion}…`}
          className="min-h-[76px] border-0 focus:border-0"
        />
        <div className="flex items-center justify-between border-t border-line px-3 py-2">
          <span className="text-[10.5px] text-muted">Comentário não altera o status · Ctrl/⌘ + Enter</span>
          <Button size="sm" variant="primary" disabled={!body.trim()} onClick={send}>
            Comentar
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {roots.length === 0 && <p className="py-8 text-center text-[13px] text-muted">Nenhum comentário {version === 'all' ? '' : `na v${version}`}.</p>}
        {roots.map((c) => (
          <Thread key={c.id} c={c} replies={replies(c.id)} pinNo={pinIndex.get(c.id)} active={activePin === c.id} onFocusPin={() => setActivePin(activePin === c.id ? null : c.id)} lookupName={(id) => lookup.profile(id)?.name ?? 'Usuário'} lookupRole={(id) => lookup.profile(id)?.role} provider={provider} run={run} />
        ))}
      </div>
    </div>
  )
}

function Thread({
  c,
  replies,
  pinNo,
  active,
  onFocusPin,
  lookupName,
  lookupRole,
  provider,
  run,
}: {
  c: Comment
  replies: Comment[]
  pinNo?: number
  active: boolean
  onFocusPin: () => void
  lookupName: (id: string) => string
  lookupRole: (id: string) => string | undefined
  provider: ReturnType<typeof useApp>['provider']
  run: ReturnType<typeof useApp>['run']
}) {
  const [reply, setReply] = useState('')
  const [open, setOpen] = useState(false)
  const role = lookupRole(c.authorId)
  return (
    <article className={cn('border bg-white transition-colors', active ? 'border-ink/50' : 'border-line', c.resolved && 'opacity-70')}>
      <div className="p-4">
        <header className="mb-2 flex items-start gap-3">
          <Avatar name={lookupName(c.authorId)} />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-2 text-[12.5px]">
              <span className="text-ink">{lookupName(c.authorId)}</span>
              <span className="text-[10px] uppercase tracking-label text-muted">{role === 'diretoria' ? 'Diretoria' : role === 'admin' ? 'Admin' : 'Marketing'}</span>
            </p>
            <p className="text-[10.5px] text-muted" title={fmtDateTime(c.createdAt)}>
              {fromNow(c.createdAt)} · v{c.version}
            </p>
          </div>
          {pinNo && (
            <button onClick={onFocusPin} className={cn('grid h-6 w-6 place-items-center rounded-full text-[10px] font-medium', c.resolved ? 'bg-olive/80 text-white' : 'bg-ink text-paper')} title="Ver ponto na imagem">
              {pinNo}
            </button>
          )}
        </header>
        {c.kind === 'adjustment' && <p className="mb-1.5 inline-block bg-st-ajustes/10 px-1.5 py-0.5 text-[10px] uppercase tracking-label text-st-ajustes">Ajuste solicitado</p>}
        <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink/90">{c.body}</p>
        {replies.length > 0 && (
          <div className="mt-3 space-y-3 border-l border-line pl-4">
            {replies.map((r) => (
              <div key={r.id}>
                <p className="flex items-center gap-2 text-[11.5px]">
                  <CornerDownRight className="h-3 w-3 text-muted" />
                  <span>{lookupName(r.authorId)}</span>
                  <span className="text-[10.5px] text-muted">{fromNow(r.createdAt)}</span>
                </p>
                <p className="mt-1 whitespace-pre-line text-[12.5px] text-ink/85">{r.body}</p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-[11.5px]">
          <button onClick={() => setOpen((o) => !o)} className="text-muted hover:text-ink">
            Responder
          </button>
          <button onClick={() => run(() => provider.setCommentResolved(c.id, !c.resolved), c.resolved ? 'Comentário reaberto' : 'Comentário resolvido')} className="flex items-center gap-1 text-muted hover:text-ink">
            {c.resolved ? <RotateCcw className="h-3 w-3" /> : <Check className="h-3 w-3" />}
            {c.resolved ? 'Reabrir' : 'Marcar como resolvido'}
          </button>
          {c.resolved && c.resolvedBy && (
            <span className="text-[10.5px] text-olive">
              Resolvido por {lookupName(c.resolvedBy)} · {fromNow(c.resolvedAt!)}
            </span>
          )}
        </div>
      </div>
      {open && (
        <div className="flex gap-2 border-t border-line p-3">
          <Textarea autoFocus value={reply} onChange={(e) => setReply(e.target.value)} className="min-h-[40px] text-[12.5px]" placeholder="Escreva uma resposta…" />
          <Button
            size="sm"
            variant="primary"
            disabled={!reply.trim()}
            onClick={async () => {
              const ok = await run(() => provider.addComment({ contentId: c.contentId, version: c.version, body: reply, parentId: c.id }), 'Resposta enviada')
              if (ok) {
                setReply('')
                setOpen(false)
              }
            }}
          >
            Enviar
          </Button>
        </div>
      )}
    </article>
  )
}

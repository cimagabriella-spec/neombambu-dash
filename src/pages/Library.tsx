import { Download, FileText, Folder, Search, ShieldCheck, ShieldX, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Button, Dialog, Empty, Field, Input, PageHeader, Select, Textarea } from '@/components/ui'
import { MEDIA_CATEGORIES } from '@/lib/constants'
import type { MediaCategory, MediaItem } from '@/lib/types'
import { bytes, cn, fmtDate } from '@/lib/utils'
import { can } from '@/lib/workflow'
import { useApp } from '@/store/app'

export default function Library() {
  const { ws, user } = useApp()
  const [cat, setCat] = useState<MediaCategory | ''>('')
  const [folder, setFolder] = useState('')
  const [q, setQ] = useState('')
  const [onlyAuth, setOnlyAuth] = useState(false)
  const [view, setView] = useState<MediaItem | null>(null)
  const [upload, setUpload] = useState<File[] | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const editable = !!user && can.uploadMedia(user.role)

  const inCat = ws.media.filter((m) => !cat || m.category === cat)
  const folders = [...new Set(inCat.map((m) => m.folder))].sort()
  const list = useMemo(
    () =>
      inCat
        .filter((m) => !folder || m.folder === folder)
        .filter((m) => !onlyAuth || m.authorized)
        .filter((m) => !q || `${m.name} ${m.tags.join(' ')} ${m.credits} ${m.folder}`.toLowerCase().includes(q.toLowerCase())),
    [inCat, folder, onlyAuth, q],
  )
  const expiring = (m: MediaItem) => m.rightsExpireAt && new Date(m.rightsExpireAt).getTime() - Date.now() < 45 * 864e5

  return (
    <div>
      <PageHeader
        kicker="Acervo"
        title="Biblioteca de mídia"
        subtitle="Materiais oficiais da NEOBAMBU com créditos e direitos de uso documentados."
        actions={
          editable && (
            <>
              <Button variant="primary" onClick={() => input.current?.click()}>
                <Upload className="h-4 w-4" strokeWidth={1.4} /> Enviar arquivos
              </Button>
              <input ref={input} type="file" multiple hidden accept="image/*,video/mp4,video/quicktime,video/webm,application/pdf" onChange={(e) => e.target.files?.length && setUpload(Array.from(e.target.files))} />
            </>
          )
        }
      />
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <nav className="space-y-6">
          <div>
            <p className="label mb-2">Categorias</p>
            <ul className="space-y-px">
              {[{ id: '' as const, label: 'Todos os arquivos' }, ...MEDIA_CATEGORIES].map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => {
                      setCat(c.id)
                      setFolder('')
                    }}
                    className={cn('flex w-full justify-between px-3 py-2 text-left text-[13px] transition-colors', cat === c.id ? 'bg-ink text-paper' : 'text-ink/75 hover:bg-mineral/60')}
                  >
                    {c.label}
                    <span className="text-[11px] opacity-60">{ws.media.filter((m) => !c.id || m.category === c.id).length}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          {folders.length > 0 && (
            <div>
              <p className="label mb-2">Pastas</p>
              <ul className="space-y-px">
                {folders.map((f) => (
                  <li key={f}>
                    <button onClick={() => setFolder(folder === f ? '' : f)} className={cn('flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px]', folder === f ? 'text-ink' : 'text-muted hover:text-ink')}>
                      <Folder className="h-3.5 w-3.5" strokeWidth={1.3} fill={folder === f ? 'currentColor' : 'none'} /> {f}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>
        <div>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.4} />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, tag, crédito" className="h-9 pl-9 text-[12.5px]" />
            </div>
            <label className="flex items-center gap-2 text-[12.5px] text-muted">
              <input type="checkbox" checked={onlyAuth} onChange={(e) => setOnlyAuth(e.target.checked)} className="accent-ink" /> Somente uso autorizado
            </label>
          </div>
          {list.length === 0 ? (
            <Empty title="Nenhum arquivo encontrado" />
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-4">
              {list.map((m) => (
                <button key={m.id} onClick={() => setView(m)} className="group border border-line bg-white text-left transition hover:border-ink/30">
                  <div className="relative aspect-[4/3] overflow-hidden bg-mineral">
                    {m.kind === 'image' ? (
                      <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
                    ) : m.kind === 'video' ? (
                      <video src={m.url} className="h-full w-full object-cover" muted preload="metadata" />
                    ) : (
                      <div className="grid h-full place-items-center text-muted">
                        <FileText className="h-6 w-6" strokeWidth={1} />
                      </div>
                    )}
                    {!m.authorized && <span className="absolute left-2 top-2 bg-st-ajustes px-1.5 py-0.5 text-[10px] uppercase tracking-label text-white">Sem autorização</span>}
                    {m.authorized && expiring(m) && <span className="absolute left-2 top-2 bg-st-aguardando px-1.5 py-0.5 text-[10px] uppercase tracking-label text-white">Direitos expirando</span>}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-[12.5px]">{m.name}</p>
                    <p className="mt-0.5 truncate text-[11px] text-muted">
                      {m.folder} · {bytes(m.size)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {view && <MediaDialog item={view} onClose={() => setView(null)} editable={editable} />}
      {upload && <UploadDialog files={upload} onClose={() => setUpload(null)} defaultCategory={cat || 'institucional'} defaultFolder={folder} />}
    </div>
  )
}

function MetaFields({ m, set }: { m: Partial<MediaItem>; set: (p: Partial<MediaItem>) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Categoria">
        <Select value={m.category} onChange={(e) => set({ category: e.target.value as MediaCategory })}>
          {MEDIA_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Pasta">
        <Input value={m.folder ?? ''} onChange={(e) => set({ folder: e.target.value })} placeholder="Ex.: Casa Serra" />
      </Field>
      <Field label="Créditos fotográficos" className="sm:col-span-2">
        <Input value={m.credits ?? ''} onChange={(e) => set({ credits: e.target.value })} placeholder="Fotografia: …" />
      </Field>
      <Field label="Direitos de uso" className="sm:col-span-2">
        <Textarea value={m.usageRights ?? ''} onChange={(e) => set({ usageRights: e.target.value })} className="min-h-[60px]" placeholder="Ex.: uso em canais próprios até 12/2027" />
      </Field>
      <Field label="Origem do arquivo">
        <Input value={m.origin ?? ''} onChange={(e) => set({ origin: e.target.value })} placeholder="Produção própria, fotógrafo, parceiro…" />
      </Field>
      <Field label="Direitos válidos até">
        <Input type="date" value={m.rightsExpireAt ?? ''} onChange={(e) => set({ rightsExpireAt: e.target.value || null })} />
      </Field>
      <Field label="Tags (separadas por vírgula)" className="sm:col-span-2">
        <Input value={(m.tags ?? []).join(', ')} onChange={(e) => set({ tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} />
      </Field>
      <label className="flex items-start gap-3 border border-line bg-paper/60 p-3 text-[12.5px] sm:col-span-2">
        <input type="checkbox" checked={!!m.authorized} onChange={(e) => set({ authorized: e.target.checked })} className="mt-0.5 accent-ink" />
        <span>
          <span className="block text-ink">Uso autorizado em publicações</span>
          <span className="text-muted">Somente arquivos autorizados podem ser anexados a conteúdos.</span>
        </span>
      </label>
    </div>
  )
}

function UploadDialog({ files, onClose, defaultCategory, defaultFolder }: { files: File[]; onClose: () => void; defaultCategory: MediaCategory; defaultFolder: string }) {
  const { provider, run } = useApp()
  const [meta, setMeta] = useState<Partial<MediaItem>>({ category: defaultCategory, folder: defaultFolder || 'Geral', authorized: false, tags: [] })
  const [busy, setBusy] = useState(false)
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Enviar ${files.length} arquivo${files.length > 1 ? 's' : ''}`}
      description={files.map((f) => f.name).join(', ')}
      className="max-w-2xl"
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              await run(async () => {
                for (const f of files) {
                  const r = await provider.uploadFile(f, { folder: `${meta.category}/${meta.folder}` })
                  await provider.saveMedia({ ...meta, name: f.name.replace(/\.[^.]+$/, ''), url: r.url, path: r.path, kind: r.kind, size: r.size, width: r.width, height: r.height })
                }
              }, 'Arquivos adicionados à biblioteca')
              onClose()
            }}
          >
            {busy ? 'Enviando…' : 'Enviar'}
          </Button>
        </>
      }
    >
      <MetaFields m={meta} set={(p) => setMeta((x) => ({ ...x, ...p }))} />
    </Dialog>
  )
}

function MediaDialog({ item, onClose, editable }: { item: MediaItem; onClose: () => void; editable: boolean }) {
  const { provider, run, lookup } = useApp()
  const [m, setM] = useState(item)
  const [editing, setEditing] = useState(false)
  return (
    <Dialog
      open
      onClose={onClose}
      title={m.name}
      description={`${m.folder} · ${bytes(m.size)}${m.width ? ` · ${m.width}×${m.height}px` : ''}`}
      className="max-w-4xl"
      footer={
        <>
          {editable && !editing && (
            <Button
              variant="danger"
              className="mr-auto"
              onClick={async () => {
                if (!confirm('Excluir arquivo da biblioteca?')) return
                onClose()
                await run(() => provider.deleteMedia(m.id), 'Arquivo excluído')
              }}
            >
              Excluir
            </Button>
          )}
          {editable && (editing ? (
            <Button
              variant="primary"
              onClick={async () => {
                setEditing(false)
                await run(() => provider.saveMedia(m), 'Informações atualizadas')
              }}
            >
              Salvar
            </Button>
          ) : (
            <Button onClick={() => setEditing(true)}>Editar informações</Button>
          ))}
          <a href={m.url} download={m.name} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 bg-ink px-4 text-[13px] text-paper hover:bg-graphite">
            <Download className="h-4 w-4" strokeWidth={1.4} /> Download
          </a>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <div className="bg-mineral">{m.kind === 'video' ? <video src={m.url} controls className="w-full" /> : m.kind === 'image' ? <img src={m.url} alt={m.name} className="w-full object-contain" /> : <div className="grid h-60 place-items-center text-muted">Pré-visualização indisponível</div>}</div>
        {editing ? (
          <MetaFields m={m} set={(p) => setM((x) => ({ ...x, ...p }))} />
        ) : (
          <dl className="space-y-4 text-[13px]">
            <div className={cn('flex items-center gap-2 px-3 py-2', m.authorized ? 'bg-olive/10 text-olive' : 'bg-st-ajustes/10 text-st-ajustes')}>
              {m.authorized ? <ShieldCheck className="h-4 w-4" strokeWidth={1.4} /> : <ShieldX className="h-4 w-4" strokeWidth={1.4} />}
              {m.authorized ? 'Uso autorizado em publicações' : 'Sem autorização de uso'}
            </div>
            {[
              ['Créditos', m.credits],
              ['Direitos de uso', m.usageRights],
              ['Válido até', m.rightsExpireAt ? fmtDate(m.rightsExpireAt, 'dd/MM/yyyy') : ''],
              ['Origem', m.origin],
              ['Categoria', MEDIA_CATEGORIES.find((c) => c.id === m.category)?.label],
              ['Tags', m.tags.join(', ')],
              ['Enviado por', `${lookup.profile(m.uploadedBy)?.name ?? '—'} · ${fmtDate(m.createdAt, 'dd/MM/yyyy')}`],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="label">{k}</dt>
                <dd className="mt-1">{v || <span className="text-muted">—</span>}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </Dialog>
  )
}

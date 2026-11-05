import { Check, Circle, Eye, EyeOff, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { roleLabel } from '@/components/layout/Shell'
import { Avatar, Button, Input, PageHeader, Select, Tabs } from '@/components/ui'
import { BRAND_TOKENS, readTokens, saveTokens } from '@/lib/brand'
import type { TaxonomyKind } from '@/lib/data/provider'
import type { Role, Taxonomy } from '@/lib/types'
import { cn } from '@/lib/utils'
import { can } from '@/lib/workflow'
import { useApp } from '@/store/app'

type Tab = 'linhas' | 'produtos' | 'usuarios' | 'marca' | 'integracoes'

export default function Settings() {
  const { user } = useApp()
  const [tab, setTab] = useState<Tab>('linhas')
  return (
    <div>
      <PageHeader kicker="Plataforma" title="Configurações" subtitle="Categorias, coleções, permissões e identidade visual — editáveis sem alterar código." />
      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-8"
        items={[
          { id: 'linhas', label: 'Linhas editoriais' },
          { id: 'produtos', label: 'Produtos e coleções' },
          { id: 'usuarios', label: 'Usuários e permissões' },
          { id: 'marca', label: 'Identidade visual' },
          { id: 'integracoes', label: 'Integrações' },
        ]}
      />
      {tab === 'linhas' && <TaxonomyEditor kind="editorialLines" editable={can.manageTaxonomies(user!.role)} />}
      {tab === 'produtos' && <TaxonomyEditor kind="products" editable={can.manageTaxonomies(user!.role)} />}
      {tab === 'usuarios' && <Users />}
      {tab === 'marca' && <Brand />}
      {tab === 'integracoes' && <Integrations />}
    </div>
  )
}

function TaxonomyEditor({ kind, editable }: { kind: TaxonomyKind; editable: boolean }) {
  const { ws, provider, run } = useApp()
  const items = [...ws[kind]].sort((a, b) => a.sort - b.sort)
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const usage = (t: Taxonomy) => (kind === 'editorialLines' ? ws.contents.filter((c) => c.editorialLineId === t.id).length : ws.contents.filter((c) => c.productIds.includes(t.id)).length)
  const save = (t: Partial<Taxonomy> & { name: string }, msg: string) => run(() => provider.saveTaxonomy(kind, t), msg)

  return (
    <div className="max-w-3xl">
      <div className="border border-line bg-white">
        {items.map((t) => (
          <div key={t.id} className={cn('flex items-center gap-4 border-b border-line px-5 py-3 last:border-b-0', !t.active && 'opacity-50')}>
            {editing === t.id ? (
              <Input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && draft.trim()) {
                    save({ ...t, name: draft.trim() }, 'Nome atualizado')
                    setEditing(null)
                  }
                  if (e.key === 'Escape') setEditing(null)
                }}
                onBlur={() => setEditing(null)}
                className="h-8"
              />
            ) : (
              <button
                disabled={!editable}
                onClick={() => {
                  setEditing(t.id)
                  setDraft(t.name)
                }}
                className="flex-1 text-left text-[13.5px] enabled:hover:underline"
                title={editable ? 'Clique para renomear' : undefined}
              >
                {t.name}
              </button>
            )}
            <span className="text-[11.5px] tabular-nums text-muted">{usage(t)} conteúdos</span>
            {editable && (
              <>
                <button onClick={() => save({ ...t, active: !t.active }, t.active ? 'Desativado' : 'Ativado')} className="p-1 text-muted hover:text-ink" title={t.active ? 'Desativar (oculta em novos conteúdos)' : 'Reativar'}>
                  {t.active ? <Eye className="h-4 w-4" strokeWidth={1.3} /> : <EyeOff className="h-4 w-4" strokeWidth={1.3} />}
                </button>
                <button
                  onClick={() => confirm(`Excluir “${t.name}”?`) && run(() => provider.deleteTaxonomy(kind, t.id), 'Excluído')}
                  className="p-1 text-muted hover:text-st-ajustes disabled:opacity-30"
                  disabled={usage(t) > 0}
                  title={usage(t) > 0 ? 'Em uso — desative em vez de excluir' : 'Excluir'}
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.3} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
      {editable && (
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return
            save({ name: name.trim(), sort: items.length }, 'Adicionado')
            setName('')
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'products' ? 'Novo produto ou coleção' : 'Nova linha editorial'} />
          <Button type="submit" variant="primary" disabled={!name.trim()}>
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </form>
      )}
      <p className="mt-4 text-[11.5px] text-muted">Itens em uso não podem ser excluídos para preservar o histórico — desative-os para ocultá-los de novos conteúdos.</p>
    </div>
  )
}

function Users() {
  const { ws, user, provider, run } = useApp()
  const admin = can.manageUsers(user!.role)
  const matrix: [string, boolean, boolean][] = [
    ['Criar e editar conteúdos', true, false],
    ['Anexar materiais e definir datas', true, false],
    ['Enviar para aprovação', true, false],
    ['Acompanhar status', true, true],
    ['Visualizar conteúdos e previews', true, true],
    ['Aprovar publicações', false, true],
    ['Solicitar ajustes', false, true],
    ['Comentar', true, true],
  ]
  return (
    <div className="grid gap-8 xl:grid-cols-[1.2fr_1fr]">
      <div className="border border-line bg-white">
        {ws.profiles.map((p) => (
          <div key={p.id} className="flex items-center gap-4 border-b border-line px-5 py-3.5 last:border-b-0">
            <Avatar name={p.name} className="h-9 w-9" />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px]">{p.name}</p>
              <p className="truncate text-[11.5px] text-muted">
                {p.email} {p.title && `· ${p.title}`}
              </p>
            </div>
            {admin && p.id !== user!.id ? (
              <Select value={p.role ?? ''} onChange={(e) => run(() => provider.setRole(p.id, e.target.value as Role), 'Permissão atualizada')} className="h-9 w-40 text-[12.5px]">
                {!p.role && <option value="">Sem acesso</option>}
                <option value="marketing">Marketing</option>
                <option value="diretoria">Diretoria</option>
                <option value="admin">Administrador</option>
              </Select>
            ) : (
              <span className="text-[11px] uppercase tracking-label text-muted">{roleLabel(p.role)}</span>
            )}
          </div>
        ))}
      </div>
      <div className="border border-line bg-white">
        <div className="grid grid-cols-[1fr_80px_80px] border-b border-line px-5 py-3">
          <span className="label">Permissão</span>
          <span className="label text-center">Marketing</span>
          <span className="label text-center">Diretoria</span>
        </div>
        {matrix.map(([l, m, d]) => (
          <div key={l} className="grid grid-cols-[1fr_80px_80px] border-b border-line px-5 py-2.5 text-[12.5px] last:border-b-0">
            <span>{l}</span>
            {[m, d].map((v, i) => (
              <span key={i} className="grid place-items-center">
                {v ? <Check className="h-4 w-4 text-olive" strokeWidth={1.6} /> : <Circle className="h-1.5 w-1.5 text-line" fill="currentColor" />}
              </span>
            ))}
          </div>
        ))}
        <p className="px-5 py-3 text-[11px] text-muted">Aplicadas no banco via Row Level Security e funções com verificação de papel. Administradores acumulam as duas áreas.</p>
      </div>
    </div>
  )
}

function Brand() {
  const [t, setT] = useState<Record<string, string>>(() => readTokens())
  const update = (k: string, v: string) => {
    const next = { ...t, [k]: v }
    setT(next)
    if (/^#[0-9a-f]{6}$/i.test(v)) saveTokens(next)
  }
  return (
    <div className="max-w-3xl">
      <p className="mb-6 text-[13px] text-muted">Proposta inicial inspirada no posicionamento da marca. Substitua pelos códigos oficiais: a interface é atualizada imediatamente. (Salvo neste navegador; para fixar para toda a equipe, atualize os valores em <code className="text-ink">src/index.css</code>.)</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {BRAND_TOKENS.map((tk) => {
          const v = t[tk.key] ?? tk.default
          return (
            <div key={tk.key} className="flex items-center gap-4 border border-line bg-white p-3">
              <label className="relative h-12 w-12 shrink-0 cursor-pointer border border-line" style={{ background: v }}>
                <input type="color" value={/^#[0-9a-f]{6}$/i.test(v) ? v : tk.default} onChange={(e) => update(tk.key, e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
              </label>
              <div className="min-w-0 flex-1">
                <p className="text-[13px]">{tk.label}</p>
                <Input value={v} onChange={(e) => update(tk.key, e.target.value)} className="mt-1 h-8 font-mono text-[12px] uppercase" />
              </div>
            </div>
          )
        })}
      </div>
      <Button
        className="mt-6"
        onClick={() => {
          setT({})
          saveTokens({})
        }}
      >
        <RotateCcw className="h-4 w-4" strokeWidth={1.4} /> Restaurar proposta inicial
      </Button>
    </div>
  )
}

function Integrations() {
  const { provider, run, user } = useApp()
  const demo = provider.mode === 'demo'
  const rows: [string, 'ok' | 'pending' | 'off', string][] = [
    ['Autenticação (Supabase Auth)', demo ? 'off' : 'ok', demo ? 'Desativada no modo demonstração — perfis fictícios sem senha.' : 'E-mail/senha e link mágico.'],
    ['Banco de dados e permissões (Postgres + RLS)', demo ? 'off' : 'ok', demo ? 'Dados locais no IndexedDB deste navegador.' : 'Persistência e regras de aprovação no servidor.'],
    ['Armazenamento de artes (Storage privado)', demo ? 'off' : 'ok', demo ? 'Arquivos salvos localmente (limite 60 MB por arquivo).' : 'Buckets privados com URLs assinadas e validação de tipo.'],
    ['Atualização em tempo real', demo ? 'off' : 'ok', demo ? '—' : 'Supabase Realtime em conteúdos, comentários e notificações.'],
    ['Notificações por e-mail', 'pending', 'Fila email_outbox pronta no banco. Requer Edge Function + provedor (Resend, SES, SMTP) — não configurado.'],
    ['Publicação automática nas redes', 'pending', 'Não implementado. Exige aplicativos aprovados na Meta (Instagram Graph API) e LinkedIn Marketing API.'],
  ]
  return (
    <div className="max-w-3xl">
      <div className="border border-line bg-white">
        {rows.map(([n, s, d]) => (
          <div key={n} className="flex items-start gap-4 border-b border-line px-5 py-4 last:border-b-0">
            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', s === 'ok' ? 'bg-olive' : s === 'pending' ? 'bg-st-aguardando' : 'bg-line')} />
            <div className="flex-1">
              <p className="text-[13.5px]">{n}</p>
              <p className="mt-0.5 text-[12px] text-muted">{d}</p>
            </div>
            <span className="text-[10.5px] uppercase tracking-label text-muted">{s === 'ok' ? 'Ativo' : s === 'pending' ? 'Pendente' : 'Modo demo'}</span>
          </div>
        ))}
      </div>
      {demo && user && (
        <Button
          className="mt-6"
          onClick={async () => {
            if (!confirm('Restaurar os dados de demonstração? As alterações feitas neste navegador serão perdidas.')) return
            await run(() => provider.resetDemo!(), 'Dados de demonstração restaurados')
          }}
        >
          <RotateCcw className="h-4 w-4" strokeWidth={1.4} /> Restaurar dados de demonstração
        </Button>
      )}
    </div>
  )
}

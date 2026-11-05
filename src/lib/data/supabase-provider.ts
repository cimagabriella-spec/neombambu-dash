/**
 * Backend real: Supabase Auth + Postgres (RLS) + Storage.
 * As regras de permissão e versionamento são aplicadas no banco
 * (supabase/migrations). Este provider apenas mapeia dados.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  AppNotification,
  ApprovalEvent,
  Asset,
  Campaign,
  Comment,
  Content,
  ContentVersion,
  MediaItem,
  Profile,
  Role,
  Status,
  Taxonomy,
  Workspace,
} from '../types'
import { uid } from '../utils'
import { pickFields } from '../workflow'
import type { DataProvider, TaxonomyKind, UploadResult } from './provider'

type Row = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

const CONTENT_BUCKET = 'content-assets'
const MEDIA_BUCKET = 'media-library'
const SIGNED_TTL = 60 * 60 * 6

const toContent = (r: Row): Content => ({
  id: r.id,
  title: r.title,
  publishDate: r.publish_date,
  publishTime: String(r.publish_time).slice(0, 5),
  channel: r.channel,
  format: r.format,
  campaignId: r.campaign_id,
  editorialLineId: r.editorial_line_id,
  productIds: r.product_ids ?? [],
  objective: r.objective,
  copyArt: r.copy_art,
  caption: r.caption,
  cta: r.cta,
  hashtags: r.hashtags,
  internalNotes: r.internal_notes,
  referenceLinks: r.reference_links ?? [],
  assets: (r.assets ?? []).map((a: Row) => ({ ...a, url: '' })),
  status: r.status,
  ownerId: r.owner_id,
  version: r.version,
  submittedVersion: r.submitted_version,
  approvedVersion: r.approved_version,
  approvedBy: r.approved_by,
  approvedAt: r.approved_at,
  parentId: r.parent_id,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

const fromContent = (c: Partial<Content>): Row => {
  const m: [keyof Content, string][] = [
    ['title', 'title'], ['publishDate', 'publish_date'], ['publishTime', 'publish_time'], ['channel', 'channel'], ['format', 'format'],
    ['campaignId', 'campaign_id'], ['editorialLineId', 'editorial_line_id'], ['productIds', 'product_ids'], ['objective', 'objective'],
    ['copyArt', 'copy_art'], ['caption', 'caption'], ['cta', 'cta'], ['hashtags', 'hashtags'], ['internalNotes', 'internal_notes'],
    ['referenceLinks', 'reference_links'], ['ownerId', 'owner_id'], ['parentId', 'parent_id'],
  ]
  const out: Row = {}
  for (const [k, col] of m) if (k in c) out[col] = c[k]
  if (c.assets) out.assets = c.assets.map(({ url: _u, ...rest }) => rest)
  return out
}

const toMedia = (r: Row): MediaItem => ({
  id: r.id, name: r.name, kind: r.kind, url: '', path: r.path, category: r.category, folder: r.folder, tags: r.tags ?? [],
  credits: r.credits, usageRights: r.usage_rights, origin: r.origin, rightsExpireAt: r.rights_expire_at, authorized: r.authorized,
  size: Number(r.size), width: r.width ?? undefined, height: r.height ?? undefined, uploadedBy: r.uploaded_by, createdAt: r.created_at,
})

export class SupabaseProvider implements DataProvider {
  readonly mode = 'supabase' as const
  readonly sb: SupabaseClient
  private profile: Profile | null = null

  constructor(url: string, key: string) {
    this.sb = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
  }

  private async ok<T>(p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<NonNullable<T>> {
    const { data, error } = await p
    if (error) throw new Error(translate(error.message))
    return data as NonNullable<T>
  }

  // ───────── sessão
  async getSession() {
    const { data } = await this.sb.auth.getSession()
    if (!data.session) return (this.profile = null)
    const row = await this.ok(this.sb.from('profiles').select('*').eq('id', data.session.user.id).maybeSingle())
    if (!row) return null
    this.profile = { id: row.id, name: row.name, email: row.email, role: row.role, title: row.title }
    return this.profile
  }
  async signIn(email: string, password: string) {
    const { error } = await this.sb.auth.signInWithPassword({ email, password })
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'E-mail ou senha inválidos.' : error.message)
    const p = await this.getSession()
    if (!p) throw new Error('Perfil não encontrado.')
    return p
  }
  async signInWithMagicLink(email: string) {
    const { error } = await this.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin, shouldCreateUser: false } })
    if (error) throw new Error(error.message)
  }
  async signOut() {
    await this.sb.auth.signOut()
    this.profile = null
  }

  subscribe(onChange: () => void) {
    const ch = this.sb
      .channel('nb-workspace')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contents' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, onChange)
      .subscribe()
    return () => void this.sb.removeChannel(ch)
  }

  async load(): Promise<Workspace> {
    await this.sb.rpc('refresh_due_notifications')
    const [profiles, contents, versions, approvals, comments, campaigns, media, notifications, lines, products] = await Promise.all([
      this.ok(this.sb.from('profiles').select('*').order('name')),
      this.ok(this.sb.from('contents').select('*').order('publish_date')),
      this.ok(this.sb.from('content_versions').select('*').order('number')),
      this.ok(this.sb.from('approval_events').select('*').order('created_at')),
      this.ok(this.sb.from('comments').select('*').order('created_at')),
      this.ok(this.sb.from('campaigns').select('*').order('start_date')),
      this.ok(this.sb.from('media_items').select('*').order('created_at', { ascending: false })),
      this.ok(this.sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(100)),
      this.ok(this.sb.from('editorial_lines').select('*').order('sort')),
      this.ok(this.sb.from('products').select('*').order('sort')),
    ])
    const ws: Workspace = {
      profiles: profiles.map((r: Row) => ({ id: r.id, name: r.name, email: r.email, role: r.role, title: r.title })),
      contents: contents.map(toContent),
      versions: versions.map(
        (r: Row): ContentVersion => ({ id: r.id, contentId: r.content_id, number: r.number, snapshot: { ...r.snapshot, assets: (r.snapshot.assets ?? []).map((a: Row) => ({ ...a, url: '' })) }, createdBy: r.created_by, createdAt: r.created_at, updatedAt: r.updated_at }),
      ),
      approvals: approvals.map(
        (r: Row): ApprovalEvent => ({ id: r.id, contentId: r.content_id, version: r.version, action: r.action, userId: r.user_id, message: r.message, fromStatus: r.from_status, toStatus: r.to_status, createdAt: r.created_at }),
      ),
      comments: comments.map(
        (r: Row): Comment => ({ id: r.id, contentId: r.content_id, version: r.version, parentId: r.parent_id, authorId: r.author_id, body: r.body, kind: r.kind, pin: r.pin, resolved: r.resolved, resolvedBy: r.resolved_by, resolvedAt: r.resolved_at, createdAt: r.created_at }),
      ),
      campaigns: campaigns.map(
        (r: Row): Campaign => ({ id: r.id, name: r.name, kind: r.kind, objective: r.objective, description: r.description, startDate: r.start_date ?? '', endDate: r.end_date ?? '', productIds: r.product_ids ?? [], status: r.status, ownerId: r.owner_id, createdAt: r.created_at }),
      ),
      media: media.map(toMedia),
      notifications: notifications.map(
        (r: Row): AppNotification => ({ id: r.id, userId: r.user_id, type: r.type, contentId: r.content_id, title: r.title, body: r.body, read: r.read, createdAt: r.created_at }),
      ),
      editorialLines: lines as Taxonomy[],
      products: products as Taxonomy[],
    }
    await this.sign(ws)
    return ws
  }

  /** Gera URLs assinadas (buckets privados) para todas as mídias de uma vez. */
  private async sign(ws: Workspace) {
    const contentPaths = new Set<string>()
    ws.contents.forEach((c) => c.assets.forEach((a) => a.path && contentPaths.add(a.path)))
    ws.versions.forEach((v) => v.snapshot.assets.forEach((a) => a.path && contentPaths.add(a.path)))
    const mediaPaths = ws.media.map((m) => m.path!).filter(Boolean)
    const signBucket = async (bucket: string, paths: string[]) => {
      if (!paths.length) return new Map<string, string>()
      const { data } = await this.sb.storage.from(bucket).createSignedUrls(paths, SIGNED_TTL)
      return new Map((data ?? []).filter((d) => d.signedUrl).map((d) => [d.path!, d.signedUrl]))
    }
    const [cm, mm] = await Promise.all([signBucket(CONTENT_BUCKET, [...contentPaths]), signBucket(MEDIA_BUCKET, mediaPaths)])
    const fix = (a: Asset) => (a.url = (a.path && (cm.get(a.path) ?? mm.get(a.path))) || a.url)
    ws.contents.forEach((c) => c.assets.forEach(fix))
    ws.versions.forEach((v) => v.snapshot.assets.forEach(fix))
    ws.media.forEach((m) => (m.url = mm.get(m.path!) ?? ''))
  }

  // ───────── conteúdos
  async createContent(input: Parameters<DataProvider['createContent']>[0]) {
    const row = await this.ok(this.sb.from('contents').insert(fromContent(input)).select().single())
    return toContent(row)
  }
  async updateContent(id: string, patch: Partial<Content>) {
    const row = await this.ok(this.sb.from('contents').update(fromContent(patch)).eq('id', id).select().single())
    return toContent(row)
  }
  async duplicateContent(id: string, adapt?: { channel: Content['channel']; format: Content['format'] }) {
    const src = toContent(await this.ok(this.sb.from('contents').select('*').eq('id', id).single()))
    return this.createContent({
      ...pickFields(src),
      assets: src.assets.map((a) => ({ ...a, id: uid() })),
      publishDate: src.publishDate,
      publishTime: src.publishTime,
      internalNotes: src.internalNotes,
      title: adapt ? `${src.title} · ${adapt.channel === 'linkedin' ? 'LinkedIn' : 'Instagram'}` : `${src.title} (cópia)`,
      channel: adapt?.channel ?? src.channel,
      format: adapt?.format ?? src.format,
      parentId: src.id,
    })
  }
  async deleteContent(id: string) {
    await this.ok(this.sb.from('contents').delete().eq('id', id))
  }
  async setStatus(id: string, status: Status, message?: string) {
    await this.ok(this.sb.rpc('set_content_status', { p_id: id, p_status: status, p_message: message ?? null }))
  }
  async submitForApproval(id: string) {
    await this.ok(this.sb.rpc('submit_content', { p_id: id }))
  }
  async approve(items: { id: string; version: number }[]) {
    await this.ok(this.sb.rpc('approve_contents', { p_items: items }))
  }
  async requestChanges(id: string, version: number, message: string) {
    await this.ok(this.sb.rpc('request_changes', { p_id: id, p_version: version, p_message: message }))
  }

  // ───────── comentários
  async addComment(input: Parameters<DataProvider['addComment']>[0]) {
    const r = await this.ok(
      this.sb.from('comments').insert({ content_id: input.contentId, version: input.version, body: input.body, parent_id: input.parentId ?? null, pin: input.pin ?? null }).select().single(),
    )
    return { id: r.id, contentId: r.content_id, version: r.version, parentId: r.parent_id, authorId: r.author_id, body: r.body, kind: r.kind, pin: r.pin, resolved: r.resolved, resolvedBy: r.resolved_by, resolvedAt: r.resolved_at, createdAt: r.created_at }
  }
  async setCommentResolved(id: string, resolved: boolean) {
    await this.ok(this.sb.from('comments').update({ resolved }).eq('id', id))
  }

  // ───────── upload seguro (bucket privado, validação de tipo/tamanho no bucket)
  async uploadFile(file: File, scope: { contentId?: string; folder?: string }): Promise<UploadResult> {
    const bucket = scope.contentId ? CONTENT_BUCKET : MEDIA_BUCKET
    const safe = file.name.normalize('NFD').replace(/[^\w.-]+/g, '-').toLowerCase()
    const path = `${scope.contentId ?? scope.folder ?? 'geral'}/${uid()}-${safe}`
    await this.ok(this.sb.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false }))
    const { data } = await this.sb.storage.from(bucket).createSignedUrl(path, SIGNED_TTL)
    const url = data?.signedUrl ?? ''
    const kind = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file'
    const local = URL.createObjectURL(file)
    const dims = kind === 'image' ? await imgSize(local) : {}
    URL.revokeObjectURL(local)
    return { url, path, kind, size: file.size, ...dims }
  }

  // ───────── campanhas
  async saveCampaign(c: Partial<Campaign> & { name: string }) {
    const row = {
      name: c.name, kind: c.kind, objective: c.objective, description: c.description, start_date: c.startDate || null, end_date: c.endDate || null,
      product_ids: c.productIds, status: c.status, owner_id: c.ownerId,
    }
    const q = c.id ? this.sb.from('campaigns').update(row).eq('id', c.id) : this.sb.from('campaigns').insert(row)
    const r = await this.ok(q.select().single())
    return { id: r.id, name: r.name, kind: r.kind, objective: r.objective, description: r.description, startDate: r.start_date ?? '', endDate: r.end_date ?? '', productIds: r.product_ids, status: r.status, ownerId: r.owner_id, createdAt: r.created_at }
  }
  async deleteCampaign(id: string) {
    await this.ok(this.sb.from('campaigns').delete().eq('id', id))
  }

  // ───────── biblioteca
  async saveMedia(m: Partial<MediaItem> & { name: string }) {
    const row: Row = {
      name: m.name, kind: m.kind, path: m.path, category: m.category, folder: m.folder, tags: m.tags, credits: m.credits, usage_rights: m.usageRights,
      origin: m.origin, rights_expire_at: m.rightsExpireAt || null, authorized: m.authorized, size: m.size, width: m.width, height: m.height,
    }
    Object.keys(row).forEach((k) => row[k] === undefined && delete row[k])
    const q = m.id ? this.sb.from('media_items').update(row).eq('id', m.id) : this.sb.from('media_items').insert(row)
    return { ...toMedia(await this.ok(q.select().single())), url: m.url ?? '' }
  }
  async deleteMedia(id: string) {
    const row = await this.ok(this.sb.from('media_items').delete().eq('id', id).select('path').single())
    if (row?.path) await this.sb.storage.from(MEDIA_BUCKET).remove([row.path])
  }

  // ───────── taxonomias
  async saveTaxonomy(kind: TaxonomyKind, t: Partial<Taxonomy> & { name: string }) {
    const table = kind === 'editorialLines' ? 'editorial_lines' : 'products'
    const { id, ...rest } = t
    const q = id ? this.sb.from(table).update(rest).eq('id', id) : this.sb.from(table).insert(rest)
    return (await this.ok(q.select().single())) as Taxonomy
  }
  async deleteTaxonomy(kind: TaxonomyKind, id: string) {
    await this.ok(this.sb.from(kind === 'editorialLines' ? 'editorial_lines' : 'products').delete().eq('id', id))
  }

  async setRole(userId: string, role: Role) {
    await this.ok(this.sb.from('profiles').update({ role }).eq('id', userId))
  }
  async markNotificationsRead(ids: string[]) {
    if (ids.length) await this.ok(this.sb.from('notifications').update({ read: true }).in('id', ids))
  }
}

function translate(msg: string) {
  if (/row-level security/i.test(msg)) return 'Seu perfil não tem permissão para esta ação.'
  if (/foreign key/i.test(msg) && /editorial_line|product/i.test(msg)) return 'Item em uso por conteúdos. Desative-o em vez de excluir.'
  if (/mime type/i.test(msg)) return 'Formato de arquivo não permitido.'
  if (/exceeded the maximum allowed size/i.test(msg)) return 'Arquivo acima do limite de 100 MB.'
  return msg
}

function imgSize(url: string): Promise<{ width?: number; height?: number }> {
  return new Promise((res) => {
    const i = new Image()
    i.onload = () => res({ width: i.naturalWidth, height: i.naturalHeight })
    i.onerror = () => res({})
    i.src = url
  })
}

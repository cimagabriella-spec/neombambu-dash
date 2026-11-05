/**
 * MODO DEMONSTRAÇÃO
 * Persistência local (IndexedDB) com dados fictícios. Aplica as mesmas regras
 * de permissão e versionamento do backend, mas não é seguro para produção:
 * qualquer pessoa com acesso ao navegador pode alterar os dados.
 */
import { addHours, differenceInHours, parseISO } from 'date-fns'
import { buildSeed, DEMO_PROFILES } from '../demo/seed'
import type {
  AppNotification,
  ApprovalEvent,
  Campaign,
  Comment,
  Content,
  MediaItem,
  NotificationType,
  Profile,
  Role,
  Status,
  Taxonomy,
  Workspace,
} from '../types'
import { uid } from '../utils'
import { allowedTransitions, can, pickFields, planUpdate } from '../workflow'
import type { DataProvider, TaxonomyKind, UploadResult } from './provider'

const DB = 'neobambu-demo'
const STORE = 'kv'
const KEY = 'workspace-v1'
const SESSION_KEY = 'nb-demo-session'

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}
async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await idb()
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORE).objectStore(STORE).get(key)
    r.onsuccess = () => resolve(r.result as T | undefined)
    r.onerror = () => reject(r.error)
  })
}
async function idbSet(key: string, value: unknown) {
  const db = await idb()
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

const now = () => new Date().toISOString()

export class DemoProvider implements DataProvider {
  readonly mode = 'demo' as const
  private ws: Workspace | null = null
  private user: Profile | null = null

  private async data(): Promise<Workspace> {
    if (this.ws) return this.ws
    let ws: Workspace | undefined
    try {
      ws = await idbGet<Workspace>(KEY)
    } catch {
      ws = undefined
    }
    if (!ws) {
      ws = buildSeed()
      seedNotifications(ws)
      await this.persist(ws)
    }
    this.ws = ws
    return ws
  }
  private async persist(ws = this.ws) {
    if (!ws) return
    try {
      await idbSet(KEY, ws)
    } catch (e) {
      console.warn('Não foi possível salvar no IndexedDB', e)
    }
  }
  private me(): Profile {
    if (!this.user) throw new Error('Sessão expirada. Entre novamente.')
    return this.user
  }
  private guard(ok: boolean, msg = 'Seu perfil não tem permissão para esta ação.') {
    if (!ok) throw new Error(msg)
  }
  private content(id: string) {
    const c = this.ws!.contents.find((x) => x.id === id)
    if (!c) throw new Error('Conteúdo não encontrado.')
    return c
  }
  private event(c: Content, action: ApprovalEvent['action'], from: Status | null, to: Status | null, message: string | null = null) {
    this.ws!.approvals.push({ id: uid(), contentId: c.id, version: c.version, action, userId: this.me().id, message, fromStatus: from, toStatus: to, createdAt: now() })
  }
  private notify(roles: Role[] | string[], type: NotificationType, c: Content | null, title: string, body: string, byId = false) {
    const me = this.user?.id
    const targets = byId ? (roles as string[]) : this.ws!.profiles.filter((p) => (roles as Role[]).includes(p.role)).map((p) => p.id)
    for (const userId of new Set(targets)) {
      if (userId === me) continue
      this.ws!.notifications.unshift({ id: uid(), userId, type, contentId: c?.id ?? null, title, body, read: false, createdAt: now() })
    }
  }
  private snapshot(c: Content) {
    const ws = this.ws!
    const v = ws.versions.find((x) => x.contentId === c.id && x.number === c.version)
    if (v) {
      v.snapshot = pickFields(c)
      v.updatedAt = now()
    } else ws.versions.push({ id: uid(), contentId: c.id, number: c.version, snapshot: pickFields(c), createdBy: this.me().id, createdAt: now(), updatedAt: now() })
  }

  // ───────── sessão
  async getSession() {
    const id = localStorage.getItem(SESSION_KEY)
    await this.data()
    this.user = this.ws!.profiles.find((p) => p.id === id) ?? null
    return this.user
  }
  async signIn(): Promise<Profile> {
    throw new Error('No modo demonstração, escolha um perfil fictício abaixo.')
  }
  async signOut() {
    localStorage.removeItem(SESSION_KEY)
    this.user = null
  }
  async demoProfiles() {
    return (await this.data()).profiles
  }
  async demoSignInAs(id: string) {
    const ws = await this.data()
    const p = ws.profiles.find((x) => x.id === id)
    if (!p) throw new Error('Perfil não encontrado')
    localStorage.setItem(SESSION_KEY, id)
    this.user = p
    return p
  }
  async resetDemo() {
    this.ws = buildSeed()
    seedNotifications(this.ws)
    await this.persist()
  }

  async load(): Promise<Workspace> {
    const ws = await this.data()
    if (this.user) {
      if (refreshDueNotifications(ws, this.user)) await this.persist()
    }
    return structuredClone(ws)
  }

  // ───────── conteúdos
  async createContent(input: Parameters<DataProvider['createContent']>[0]) {
    const me = this.me()
    this.guard(can.createContent(me.role))
    const c: Content = {
      id: uid(),
      title: input.title,
      publishDate: input.publishDate,
      publishTime: input.publishTime ?? '10:00',
      channel: input.channel,
      format: input.format,
      campaignId: input.campaignId ?? null,
      editorialLineId: input.editorialLineId ?? null,
      productIds: input.productIds ?? [],
      objective: input.objective ?? '',
      copyArt: input.copyArt ?? '',
      caption: input.caption ?? '',
      cta: input.cta ?? '',
      hashtags: input.hashtags ?? '',
      internalNotes: input.internalNotes ?? '',
      referenceLinks: input.referenceLinks ?? [],
      assets: input.assets ?? [],
      status: 'ideia',
      ownerId: input.ownerId ?? me.id,
      version: 1,
      submittedVersion: null,
      approvedVersion: null,
      approvedBy: null,
      approvedAt: null,
      parentId: input.parentId ?? null,
      createdAt: now(),
      updatedAt: now(),
    }
    this.ws!.contents.push(c)
    this.snapshot(c)
    this.event(c, 'created', null, 'ideia')
    await this.persist()
    return structuredClone(c)
  }

  async updateContent(id: string, patch: Partial<Content>) {
    const me = this.me()
    this.guard(can.editContent(me.role))
    const c = this.content(id)
    const plan = planUpdate(c, patch)
    const { id: _i, status: _s, version: _v, submittedVersion: _sv, approvedBy: _ab, approvedAt: _aa, approvedVersion: _av, createdAt: _c, ...safe } = patch
    const dateChanged = (patch.publishDate && patch.publishDate !== c.publishDate) || (patch.publishTime && patch.publishTime !== c.publishTime)
    const prevStatus = c.status
    const prevDate = `${c.publishDate} ${c.publishTime}`
    Object.assign(c, safe, { updatedAt: now() })
    if (plan.createsVersion) {
      c.version += 1
      if (prevStatus === 'aguardando' || plan.requiresReapproval) c.submittedVersion = c.version
      c.status = plan.nextStatus
      if (plan.requiresReapproval) {
        c.approvedBy = null
        c.approvedAt = null
      }
      this.event(c, 'new_version', prevStatus, c.status, plan.requiresReapproval ? 'Conteúdo aprovado foi alterado — nova aprovação necessária.' : `Versão ${c.version} criada`)
      if (c.submittedVersion === c.version)
        this.notify(['diretoria'], 'awaiting_approval', c, 'Nova versão aguardando aprovação', `${c.title} · v${c.version}`)
    }
    if (dateChanged) this.event(c, 'rescheduled', c.status, c.status, `${prevDate} → ${c.publishDate} ${c.publishTime}`)
    this.snapshot(c)
    await this.persist()
    return structuredClone(c)
  }

  async duplicateContent(id: string, adapt?: { channel: Content['channel']; format: Content['format'] }) {
    const src = this.content(id)
    const copy = await this.createContent({
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
    return copy
  }

  async deleteContent(id: string) {
    this.guard(can.editContent(this.me().role))
    const ws = this.ws!
    const c = this.content(id)
    this.guard(c.status !== 'publicado', 'Conteúdos publicados ficam no histórico e não podem ser excluídos.')
    ws.contents = ws.contents.filter((x) => x.id !== id)
    ws.versions = ws.versions.filter((x) => x.contentId !== id)
    ws.comments = ws.comments.filter((x) => x.contentId !== id)
    ws.approvals = ws.approvals.filter((x) => x.contentId !== id)
    await this.persist()
  }

  async setStatus(id: string, status: Status, message?: string) {
    const me = this.me()
    const c = this.content(id)
    if (status === 'aguardando') return this.submitForApproval(id)
    this.guard(allowedTransitions(me.role, c.status).includes(status), `Não é possível mover de "${c.status}" para "${status}".`)
    const from = c.status
    c.status = status
    if (status === 'revisao' && from === 'aguardando') c.submittedVersion = null
    c.updatedAt = now()
    this.event(c, 'status_changed', from, status, message ?? null)
    await this.persist()
  }

  async submitForApproval(id: string) {
    const me = this.me()
    this.guard(can.editContent(me.role))
    const c = this.content(id)
    this.guard(['producao', 'revisao', 'ajustes', 'ideia'].includes(c.status), 'Este conteúdo não pode ser enviado agora.')
    this.guard(c.assets.length > 0, 'Anexe ao menos uma arte antes de enviar para aprovação.')
    this.guard(c.status !== 'ajustes' || c.submittedVersion !== c.version, 'Faça os ajustes solicitados (gerando uma nova versão) antes de reenviar.')
    const from = c.status
    c.status = 'aguardando'
    c.submittedVersion = c.version
    c.updatedAt = now()
    this.event(c, 'submitted', from, 'aguardando')
    this.notify(['diretoria'], 'awaiting_approval', c, 'Novo conteúdo aguardando aprovação', `${c.title} · v${c.version}`)
    await this.persist()
  }

  async approve(items: { id: string; version: number }[]) {
    const me = this.me()
    this.guard(can.approve(me.role))
    // valida tudo antes de alterar qualquer item (atômico)
    const list = items.map(({ id, version }) => {
      const c = this.content(id)
      if (c.status !== 'aguardando') throw new Error(`"${c.title}" não está aguardando aprovação.`)
      if (c.version !== version) throw new Error(`"${c.title}" mudou para a v${c.version} enquanto você revisava. Reabra antes de aprovar.`)
      return c
    })
    for (const c of list) {
      c.status = 'aprovado'
      c.approvedBy = me.id
      c.approvedAt = now()
      c.approvedVersion = c.version
      c.updatedAt = now()
      this.event(c, 'approved', 'aguardando', 'aprovado', items.length > 1 ? `Aprovação em lote (${items.length} conteúdos)` : null)
      this.notify([c.ownerId, ...this.ws!.profiles.filter((p) => p.role === 'marketing').map((p) => p.id)], 'approved', c, 'Conteúdo aprovado', `${c.title} · v${c.version} por ${me.name}`, true)
    }
    await this.persist()
  }

  async requestChanges(id: string, version: number, message: string) {
    const me = this.me()
    this.guard(can.requestChanges(me.role))
    this.guard(message.trim().length >= 5, 'Descreva as alterações necessárias.')
    const c = this.content(id)
    this.guard(c.status === 'aguardando', 'Este conteúdo não está aguardando aprovação.')
    this.guard(c.version === version, 'O conteúdo recebeu uma nova versão. Reabra antes de solicitar ajustes.')
    c.status = 'ajustes'
    c.updatedAt = now()
    this.event(c, 'changes_requested', 'aguardando', 'ajustes', message.trim())
    this.ws!.comments.push({ id: uid(), contentId: c.id, version: c.version, parentId: null, authorId: me.id, body: message.trim(), kind: 'adjustment', pin: null, resolved: false, resolvedBy: null, resolvedAt: null, createdAt: now() })
    this.notify([c.ownerId, ...this.ws!.profiles.filter((p) => p.role === 'marketing').map((p) => p.id)], 'changes_requested', c, 'Ajustes solicitados', `${c.title}: ${message.trim().slice(0, 90)}`, true)
    await this.persist()
  }

  // ───────── comentários
  async addComment(input: Parameters<DataProvider['addComment']>[0]) {
    const me = this.me()
    const c = this.content(input.contentId)
    this.guard(input.body.trim().length > 0, 'Escreva um comentário.')
    const cm: Comment = { id: uid(), contentId: c.id, version: input.version, parentId: input.parentId ?? null, authorId: me.id, body: input.body.trim(), kind: 'comment', pin: input.pin ?? null, resolved: false, resolvedBy: null, resolvedAt: null, createdAt: now() }
    this.ws!.comments.push(cm)
    const thread = this.ws!.comments.filter((x) => x.contentId === c.id).map((x) => x.authorId)
    this.notify([c.ownerId, ...thread], 'comment', c, `Comentário de ${me.name}`, `${c.title}: ${cm.body.slice(0, 90)}`, true)
    await this.persist()
    return structuredClone(cm)
  }
  async setCommentResolved(id: string, resolved: boolean) {
    const me = this.me()
    const cm = this.ws!.comments.find((x) => x.id === id)
    if (!cm) throw new Error('Comentário não encontrado')
    cm.resolved = resolved
    cm.resolvedBy = resolved ? me.id : null
    cm.resolvedAt = resolved ? now() : null
    await this.persist()
  }

  // ───────── arquivos (data URL no IndexedDB)
  async uploadFile(file: File): Promise<UploadResult> {
    this.guard(can.uploadMedia(this.me().role))
    if (file.size > 60 * 1024 * 1024) throw new Error('No modo demonstração o limite é 60 MB por arquivo.')
    const okType = /^(image\/(png|jpe?g|webp|gif|svg\+xml)|video\/(mp4|quicktime|webm)|application\/pdf)$/.test(file.type)
    this.guard(okType, 'Formato não suportado. Use PNG, JPG, WEBP, GIF, SVG, MP4, MOV, WEBM ou PDF.')
    const url = await new Promise<string>((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(r.result as string)
      r.onerror = () => rej(r.error)
      r.readAsDataURL(file)
    })
    const kind = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file'
    const dims = kind === 'image' ? await imageSize(url) : kind === 'video' ? await videoSize(url) : {}
    return { url, kind, size: file.size, ...dims }
  }

  // ───────── campanhas
  async saveCampaign(input: Partial<Campaign> & { name: string }) {
    const me = this.me()
    this.guard(can.manageCampaigns(me.role))
    const ws = this.ws!
    let c = input.id ? ws.campaigns.find((x) => x.id === input.id) : undefined
    if (c) Object.assign(c, input)
    else {
      c = { id: uid(), kind: 'comercial', objective: '', description: '', startDate: '', endDate: '', productIds: [], status: 'planejamento', ownerId: me.id, createdAt: now(), ...input } as Campaign
      ws.campaigns.push(c)
    }
    await this.persist()
    return structuredClone(c)
  }
  async deleteCampaign(id: string) {
    this.guard(can.manageCampaigns(this.me().role))
    const ws = this.ws!
    ws.campaigns = ws.campaigns.filter((x) => x.id !== id)
    ws.contents.forEach((c) => c.campaignId === id && (c.campaignId = null))
    await this.persist()
  }

  // ───────── biblioteca
  async saveMedia(input: Partial<MediaItem> & { name: string }) {
    const me = this.me()
    this.guard(can.uploadMedia(me.role))
    const ws = this.ws!
    let m = input.id ? ws.media.find((x) => x.id === input.id) : undefined
    if (m) Object.assign(m, input)
    else {
      m = { id: uid(), kind: 'image', url: '', category: 'institucional', folder: 'Geral', tags: [], credits: '', usageRights: '', origin: '', rightsExpireAt: null, authorized: false, size: 0, uploadedBy: me.id, createdAt: now(), ...input } as MediaItem
      ws.media.unshift(m)
    }
    await this.persist()
    return structuredClone(m)
  }
  async deleteMedia(id: string) {
    this.guard(can.uploadMedia(this.me().role))
    this.ws!.media = this.ws!.media.filter((x) => x.id !== id)
    await this.persist()
  }

  // ───────── taxonomias
  async saveTaxonomy(kind: TaxonomyKind, t: Partial<Taxonomy> & { name: string }) {
    this.guard(can.manageTaxonomies(this.me().role))
    const list = this.ws![kind]
    let item = t.id ? list.find((x) => x.id === t.id) : undefined
    if (item) Object.assign(item, t)
    else {
      item = { id: uid(), description: '', active: true, sort: list.length, ...t }
      list.push(item)
    }
    await this.persist()
    return structuredClone(item)
  }
  async deleteTaxonomy(kind: TaxonomyKind, id: string) {
    this.guard(can.manageTaxonomies(this.me().role))
    const ws = this.ws!
    const used = kind === 'editorialLines' ? ws.contents.some((c) => c.editorialLineId === id) : ws.contents.some((c) => c.productIds.includes(id))
    if (used) throw new Error('Item em uso por conteúdos. Desative-o em vez de excluir, para preservar o histórico.')
    ws[kind] = ws[kind].filter((x) => x.id !== id)
    await this.persist()
  }

  async setRole(userId: string, role: Role) {
    this.guard(can.manageUsers(this.me().role))
    const p = this.ws!.profiles.find((x) => x.id === userId)
    if (p) p.role = role
    await this.persist()
  }

  async markNotificationsRead(ids: string[]) {
    this.ws!.notifications.forEach((n) => ids.includes(n.id) && (n.read = true))
    await this.persist()
  }
}

function seedNotifications(ws: Workspace) {
  const push = (userId: string, type: NotificationType, c: Content | null, title: string, body: string, hoursAgo: number, read = false) =>
    ws.notifications.push({ id: uid(), userId, type, contentId: c?.id ?? null, title, body, read, createdAt: addHours(new Date(), -hoursAgo).toISOString() })
  const by = (s: Status) => ws.contents.filter((c) => c.status === s)
  for (const p of ws.profiles) {
    if (p.role !== 'marketing') {
      by('aguardando').forEach((c, i) => push(p.id, 'awaiting_approval', c, 'Novo conteúdo aguardando aprovação', `${c.title} · v${c.version}`, 3 + i * 5))
    }
    if (p.role !== 'diretoria') {
      by('ajustes').forEach((c, i) => push(p.id, 'changes_requested', c, 'Ajustes solicitados', c.title, 8 + i * 6))
      by('aprovado').forEach((c, i) => push(p.id, 'approved', c, 'Conteúdo aprovado', c.title, 20 + i * 4, true))
      const cm = ws.comments.find((x) => x.authorId === 'u-helena' && !x.resolved)
      if (cm) push(p.id, 'comment', ws.contents.find((c) => c.id === cm.contentId)!, 'Comentário de Helena Prado', cm.body.slice(0, 90), 26)
    }
  }
  ws.notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Gera alertas de publicação próxima (48h) e de aprovação pendente (> 24h). Idempotente. */
function refreshDueNotifications(ws: Workspace, user: Profile): boolean {
  let changed = false
  const has = (type: NotificationType, contentId: string) => ws.notifications.some((n) => n.userId === user.id && n.type === type && n.contentId === contentId)
  const add = (n: Omit<AppNotification, 'id' | 'userId' | 'read' | 'createdAt'>) => {
    ws.notifications.unshift({ ...n, id: uid(), userId: user.id, read: false, createdAt: now() })
    changed = true
  }
  for (const c of ws.contents) {
    const when = parseISO(`${c.publishDate}T${c.publishTime}`)
    const h = differenceInHours(when, new Date())
    if (h >= 0 && h <= 48 && c.status !== 'publicado' && !has('upcoming', c.id)) {
      add({ type: 'upcoming', contentId: c.id, title: c.status === 'programado' || c.status === 'aprovado' ? 'Publicação próxima' : 'Publicação próxima ainda sem aprovação', body: `${c.title} · em ${h}h` })
    }
    if (user.role !== 'marketing' && c.status === 'aguardando' && h >= 0 && h <= 96 && !has('pending_reminder', c.id)) {
      add({ type: 'pending_reminder', contentId: c.id, title: 'Aprovação pendente', body: `${c.title} publica em ${Math.round(h / 24)} dia(s)` })
    }
  }
  return changed
}

function imageSize(url: string): Promise<{ width?: number; height?: number }> {
  return new Promise((res) => {
    const img = new Image()
    img.onload = () => res({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => res({})
    img.src = url
  })
}
function videoSize(url: string): Promise<{ width?: number; height?: number }> {
  return new Promise((res) => {
    const v = document.createElement('video')
    v.onloadedmetadata = () => res({ width: v.videoWidth, height: v.videoHeight })
    v.onerror = () => res({})
    v.src = url
  })
}

export { DEMO_PROFILES }

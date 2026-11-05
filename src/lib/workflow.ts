/**
 * Regras do fluxo editorial — fonte única no frontend.
 * As mesmas regras estão replicadas no banco (supabase/migrations) via
 * triggers e funções RPC, que são a autoridade final no modo Supabase.
 */
import type { Content, ContentFields, Role, Status } from './types'

export const can = {
  createContent: (r: Role) => r === 'marketing' || r === 'admin',
  editContent: (r: Role) => r === 'marketing' || r === 'admin',
  uploadMedia: (r: Role) => r === 'marketing' || r === 'admin',
  approve: (r: Role) => r === 'diretoria' || r === 'admin',
  requestChanges: (r: Role) => r === 'diretoria' || r === 'admin',
  comment: (_r: Role) => true,
  manageCampaigns: (r: Role) => r === 'marketing' || r === 'admin',
  manageTaxonomies: (r: Role) => r === 'marketing' || r === 'admin',
  manageUsers: (r: Role) => r === 'admin',
}

/** Status que o marketing pode definir manualmente a partir de cada status. */
const MARKETING_TRANSITIONS: Record<Status, Status[]> = {
  ideia: ['producao'],
  producao: ['ideia', 'revisao'],
  revisao: ['producao', 'aguardando'],
  aguardando: ['revisao'], // recolher envio
  ajustes: ['producao', 'revisao', 'aguardando'],
  aprovado: ['programado'],
  programado: ['aprovado', 'publicado'],
  publicado: [],
}

export function allowedTransitions(role: Role, from: Status): Status[] {
  if (role === 'diretoria') return []
  return MARKETING_TRANSITIONS[from]
}

/** Campos cuja alteração invalida uma aprovação e gera nova versão. */
export const VERSIONED_FIELDS: (keyof ContentFields)[] = [
  'title',
  'channel',
  'format',
  'campaignId',
  'editorialLineId',
  'productIds',
  'objective',
  'copyArt',
  'caption',
  'cta',
  'hashtags',
  'referenceLinks',
  'assets',
]
/**
 * Data, horário e observações internas são planejamento, não conteúdo:
 * alterá-los (inclusive arrastando no calendário) fica registrado no
 * histórico, mas não exige nova aprovação.
 */

/** Status em que a versão atual já foi enviada e fica "travada". */
export const LOCKED_STATUSES: Status[] = ['aguardando', 'ajustes', 'aprovado', 'programado', 'publicado']

export function pickFields(c: ContentFields): ContentFields {
  return {
    title: c.title,
    channel: c.channel,
    format: c.format,
    campaignId: c.campaignId,
    editorialLineId: c.editorialLineId,
    productIds: [...c.productIds],
    objective: c.objective,
    copyArt: c.copyArt,
    caption: c.caption,
    cta: c.cta,
    hashtags: c.hashtags,
    referenceLinks: [...c.referenceLinks],
    assets: c.assets.map((a) => ({ ...a })),
  }
}

export function changedVersionedFields(before: ContentFields, patch: Partial<Content>): (keyof ContentFields)[] {
  return VERSIONED_FIELDS.filter((k) => k in patch && JSON.stringify(stripUrls(k, patch[k])) !== JSON.stringify(stripUrls(k, before[k])))
}

// URLs assinadas mudam a cada carregamento — compara assets pelo id/caminho
function stripUrls(k: keyof ContentFields, v: unknown) {
  if (k !== 'assets' || !Array.isArray(v)) return v
  return (v as { id: string; path?: string; name: string }[]).map((a) => [a.id, a.path ?? '', a.name])
}

export interface UpdatePlan {
  createsVersion: boolean
  nextStatus: Status
  requiresReapproval: boolean
}

export function planUpdate(c: Content, patch: Partial<Content>): UpdatePlan {
  const changed = changedVersionedFields(c, patch)
  const locked = LOCKED_STATUSES.includes(c.status) && c.submittedVersion === c.version
  const createsVersion = changed.length > 0 && locked
  const requiresReapproval = createsVersion && (c.status === 'aprovado' || c.status === 'programado')
  const replanned = (patch.publishDate !== undefined && patch.publishDate !== c.publishDate) || (patch.publishTime !== undefined && patch.publishTime !== c.publishTime)
  if (c.status === 'publicado' && (changed.length > 0 || replanned)) {
    throw new Error('Conteúdos publicados não podem ser alterados. Duplique para criar uma nova publicação.')
  }
  return { createsVersion, requiresReapproval, nextStatus: requiresReapproval ? 'aguardando' : c.status }
}

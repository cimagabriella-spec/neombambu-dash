export type Role = 'marketing' | 'diretoria' | 'admin'

export interface Profile {
  id: string
  name: string
  email: string
  role: Role
  title: string
}

export type Status =
  | 'ideia'
  | 'producao'
  | 'revisao'
  | 'aguardando'
  | 'ajustes'
  | 'aprovado'
  | 'programado'
  | 'publicado'

export type Channel = 'instagram' | 'linkedin'
export type Format = 'feed' | 'carrossel' | 'reels' | 'stories' | 'post' | 'documento' | 'video'

export interface Asset {
  id: string
  kind: 'image' | 'video'
  name: string
  /** URL pronta para exibição (data URI no modo demo, URL assinada no Supabase) */
  url: string
  /** caminho no storage (Supabase) */
  path?: string
  width?: number
  height?: number
  mediaId?: string | null
}

/** Campos que compõem a versão aprovável de um conteúdo. */
export interface ContentFields {
  title: string
  channel: Channel
  format: Format
  campaignId: string | null
  editorialLineId: string | null
  productIds: string[]
  objective: string
  copyArt: string
  caption: string
  cta: string
  hashtags: string
  referenceLinks: string[]
  assets: Asset[]
}

export interface Content extends ContentFields {
  id: string
  publishDate: string // yyyy-MM-dd
  publishTime: string // HH:mm
  internalNotes: string
  status: Status
  ownerId: string
  version: number
  /** última versão enviada à diretoria */
  submittedVersion: number | null
  approvedVersion: number | null
  approvedBy: string | null
  approvedAt: string | null
  parentId: string | null
  createdAt: string
  updatedAt: string
}

export interface ContentVersion {
  id: string
  contentId: string
  number: number
  snapshot: ContentFields
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type ApprovalAction =
  | 'created'
  | 'submitted'
  | 'approved'
  | 'changes_requested'
  | 'new_version'
  | 'status_changed'
  | 'rescheduled'

export interface ApprovalEvent {
  id: string
  contentId: string
  version: number
  action: ApprovalAction
  userId: string
  message: string | null
  fromStatus: Status | null
  toStatus: Status | null
  createdAt: string
}

export interface CommentPin {
  assetId: string
  x: number // 0–100 (%)
  y: number // 0–100 (%)
}

export interface Comment {
  id: string
  contentId: string
  version: number
  parentId: string | null
  authorId: string
  body: string
  kind: 'comment' | 'adjustment'
  pin: CommentPin | null
  resolved: boolean
  resolvedBy: string | null
  resolvedAt: string | null
  createdAt: string
}

export type CampaignStatus = 'planejamento' | 'ativa' | 'pausada' | 'concluida'

export interface Campaign {
  id: string
  name: string
  kind: 'institucional' | 'comercial'
  objective: string
  description: string
  startDate: string
  endDate: string
  productIds: string[]
  status: CampaignStatus
  ownerId: string
  createdAt: string
}

export type MediaCategory =
  | 'produtos'
  | 'colecoes'
  | 'projetos'
  | 'showroom'
  | 'eventos'
  | 'institucional'
  | 'videos'
  | 'identidade'

export interface MediaItem {
  id: string
  name: string
  kind: 'image' | 'video' | 'file'
  url: string
  path?: string
  category: MediaCategory
  folder: string
  tags: string[]
  credits: string
  usageRights: string
  origin: string
  rightsExpireAt: string | null
  authorized: boolean
  size: number
  width?: number
  height?: number
  uploadedBy: string
  createdAt: string
}

export type NotificationType =
  | 'awaiting_approval'
  | 'approved'
  | 'changes_requested'
  | 'comment'
  | 'upcoming'
  | 'pending_reminder'

export interface AppNotification {
  id: string
  userId: string
  type: NotificationType
  contentId: string | null
  title: string
  body: string
  read: boolean
  createdAt: string
}

export interface Taxonomy {
  id: string
  name: string
  description: string
  active: boolean
  sort: number
}

export interface Workspace {
  profiles: Profile[]
  contents: Content[]
  versions: ContentVersion[]
  approvals: ApprovalEvent[]
  comments: Comment[]
  campaigns: Campaign[]
  media: MediaItem[]
  notifications: AppNotification[]
  editorialLines: Taxonomy[]
  products: Taxonomy[]
}

export type NewContent = Partial<Content> & Pick<Content, 'title' | 'channel' | 'format' | 'publishDate'>

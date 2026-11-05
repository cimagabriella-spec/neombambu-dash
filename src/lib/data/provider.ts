import type {
  Campaign,
  Comment,
  CommentPin,
  Content,
  MediaItem,
  NewContent,
  Profile,
  Role,
  Status,
  Taxonomy,
  Workspace,
  Asset,
} from '../types'

export interface UploadResult {
  url: string
  path?: string
  width?: number
  height?: number
  kind: 'image' | 'video' | 'file'
  size: number
}

export type TaxonomyKind = 'editorialLines' | 'products'

/**
 * Contrato único da camada de dados. Implementado por:
 *  - DemoProvider: dados fictícios persistidos no IndexedDB do navegador;
 *  - SupabaseProvider: Postgres + RLS + Storage (backend real).
 */
export interface DataProvider {
  readonly mode: 'demo' | 'supabase'

  // sessão
  getSession(): Promise<Profile | null>
  signIn(email: string, password: string): Promise<Profile>
  signInWithMagicLink?(email: string): Promise<void>
  signOut(): Promise<void>
  /** somente demo: entrar como um perfil fictício */
  demoProfiles?(): Promise<Profile[]>
  demoSignInAs?(id: string): Promise<Profile>
  resetDemo?(): Promise<void>

  load(): Promise<Workspace>

  // conteúdos
  createContent(input: NewContent): Promise<Content>
  updateContent(id: string, patch: Partial<Content>): Promise<Content>
  duplicateContent(id: string, adapt?: { channel: Content['channel']; format: Content['format'] }): Promise<Content>
  deleteContent(id: string): Promise<void>
  setStatus(id: string, status: Status, message?: string): Promise<void>
  submitForApproval(id: string): Promise<void>
  approve(ids: { id: string; version: number }[]): Promise<void>
  requestChanges(id: string, version: number, message: string): Promise<void>

  // comentários
  addComment(input: { contentId: string; version: number; body: string; parentId?: string | null; pin?: CommentPin | null }): Promise<Comment>
  setCommentResolved(id: string, resolved: boolean): Promise<void>

  // arquivos
  uploadFile(file: File, scope: { contentId?: string; folder?: string }): Promise<UploadResult>
  resolveAssets?(assets: Asset[]): Promise<Asset[]>

  // campanhas
  saveCampaign(c: Partial<Campaign> & { name: string }): Promise<Campaign>
  deleteCampaign(id: string): Promise<void>

  // biblioteca
  saveMedia(m: Partial<MediaItem> & { name: string }): Promise<MediaItem>
  deleteMedia(id: string): Promise<void>

  // taxonomias
  saveTaxonomy(kind: TaxonomyKind, t: Partial<Taxonomy> & { name: string }): Promise<Taxonomy>
  deleteTaxonomy(kind: TaxonomyKind, id: string): Promise<void>

  // usuários
  setRole(userId: string, role: Role): Promise<void>

  // notificações
  markNotificationsRead(ids: string[]): Promise<void>
}

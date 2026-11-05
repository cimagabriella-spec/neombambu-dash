import type { CampaignStatus, Channel, Format, MediaCategory, Status } from './types'

export const STATUSES: { id: Status; label: string; short: string; hint: string }[] = [
  { id: 'ideia', label: 'Ideia', short: 'Ideia', hint: 'Pauta registrada, ainda sem produção.' },
  { id: 'producao', label: 'Em produção', short: 'Produção', hint: 'Arte e texto em desenvolvimento.' },
  { id: 'revisao', label: 'Revisão interna', short: 'Revisão', hint: 'Conferência do time de marketing.' },
  { id: 'aguardando', label: 'Aguardando aprovação', short: 'Aguardando', hint: 'Enviado para a diretoria.' },
  { id: 'ajustes', label: 'Ajustes solicitados', short: 'Ajustes', hint: 'A diretoria pediu alterações.' },
  { id: 'aprovado', label: 'Aprovado', short: 'Aprovado', hint: 'Liberado pela diretoria.' },
  { id: 'programado', label: 'Programado', short: 'Programado', hint: 'Agendado na plataforma de publicação.' },
  { id: 'publicado', label: 'Publicado', short: 'Publicado', hint: 'No ar.' },
]

export const statusLabel = (s: Status) => STATUSES.find((x) => x.id === s)?.label ?? s

/** classes Tailwind por status — uso discreto: ponto + texto */
export const STATUS_TONE: Record<Status, { dot: string; text: string; ring: string; bg: string }> = {
  ideia: { dot: 'bg-st-ideia', text: 'text-st-ideia', ring: 'border-st-ideia/40', bg: 'bg-st-ideia/10' },
  producao: { dot: 'bg-st-producao', text: 'text-[#8a755d]', ring: 'border-st-producao/50', bg: 'bg-st-producao/10' },
  revisao: { dot: 'bg-st-revisao', text: 'text-st-revisao', ring: 'border-st-revisao/40', bg: 'bg-st-revisao/10' },
  aguardando: { dot: 'bg-st-aguardando', text: 'text-st-aguardando', ring: 'border-st-aguardando/50', bg: 'bg-st-aguardando/10' },
  ajustes: { dot: 'bg-st-ajustes', text: 'text-st-ajustes', ring: 'border-st-ajustes/50', bg: 'bg-st-ajustes/10' },
  aprovado: { dot: 'bg-st-aprovado', text: 'text-st-aprovado', ring: 'border-st-aprovado/50', bg: 'bg-st-aprovado/10' },
  programado: { dot: 'bg-st-programado', text: 'text-st-programado', ring: 'border-st-programado/50', bg: 'bg-st-programado/10' },
  publicado: { dot: 'bg-st-publicado', text: 'text-ink', ring: 'border-ink/40', bg: 'bg-ink/5' },
}

export const CHANNELS: { id: Channel; label: string }[] = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'linkedin', label: 'LinkedIn' },
]
export const channelLabel = (c: Channel) => CHANNELS.find((x) => x.id === c)?.label ?? c

export const FORMATS: { id: Format; label: string; channel: Channel; ratio: number }[] = [
  { id: 'feed', label: 'Feed estático', channel: 'instagram', ratio: 4 / 5 },
  { id: 'carrossel', label: 'Carrossel', channel: 'instagram', ratio: 4 / 5 },
  { id: 'reels', label: 'Reels', channel: 'instagram', ratio: 9 / 16 },
  { id: 'stories', label: 'Stories', channel: 'instagram', ratio: 9 / 16 },
  { id: 'post', label: 'Post com imagem', channel: 'linkedin', ratio: 1.91 },
  { id: 'documento', label: 'Documento (carrossel)', channel: 'linkedin', ratio: 4 / 5 },
  { id: 'video', label: 'Vídeo', channel: 'linkedin', ratio: 16 / 9 },
]
export const formatLabel = (f: Format) => FORMATS.find((x) => x.id === f)?.label ?? f
export const formatRatio = (f: Format) => FORMATS.find((x) => x.id === f)?.ratio ?? 1
export const formatsFor = (c: Channel) => FORMATS.filter((f) => f.channel === c)

export const CAMPAIGN_STATUSES: { id: CampaignStatus; label: string }[] = [
  { id: 'planejamento', label: 'Em planejamento' },
  { id: 'ativa', label: 'Ativa' },
  { id: 'pausada', label: 'Pausada' },
  { id: 'concluida', label: 'Concluída' },
]

export const MEDIA_CATEGORIES: { id: MediaCategory; label: string }[] = [
  { id: 'produtos', label: 'Produtos' },
  { id: 'colecoes', label: 'Coleções' },
  { id: 'projetos', label: 'Projetos' },
  { id: 'showroom', label: 'Showroom' },
  { id: 'eventos', label: 'Eventos' },
  { id: 'institucional', label: 'Institucional' },
  { id: 'videos', label: 'Vídeos' },
  { id: 'identidade', label: 'Identidade visual' },
]

export const DEFAULT_EDITORIAL_LINES = [
  'Institucional e posicionamento de marca',
  'Arquitetura de superfícies',
  'Produtos e coleções',
  'Educação técnica',
  'Sustentabilidade e ESG',
  'Projetos e aplicações',
  'Eventos e relacionamento',
  'Arquitetos e especificadores',
  'Lifestyle e wellness',
  'Imprensa e reconhecimento',
]

export const DEFAULT_PRODUCTS = [
  'ThermoWood®',
  'Bambu Densità',
  'Coleção Celta',
  'Bespoke',
  'Multitech',
  'Teca',
  'Soul Exotic Hardwood',
  'Helveti',
  'Neoteca XCore™',
]

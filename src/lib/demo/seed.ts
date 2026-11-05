/**
 * DADOS FICTÍCIOS DE DEMONSTRAÇÃO.
 * Pessoas, campanhas e publicações abaixo são exemplos para apresentar a
 * experiência. Não representam planejamento real da NEOBAMBU.
 */
import { addDays, format, startOfMonth, subDays } from 'date-fns'
import { DEFAULT_EDITORIAL_LINES, DEFAULT_PRODUCTS } from '../constants'
import type {
  ApprovalEvent,
  Asset,
  Campaign,
  Channel,
  Comment,
  Content,
  ContentVersion,
  Format,
  MediaCategory,
  MediaItem,
  Profile,
  Status,
  Taxonomy,
  Workspace,
} from '../types'
import { pickFields } from '../workflow'
import { artwork, type ArtVariant } from './artwork'

const d = (dt: Date) => format(dt, 'yyyy-MM-dd')
const iso = (dt: Date) => dt.toISOString()

export const DEMO_PROFILES: Profile[] = [
  { id: 'u-marina', name: 'Marina Alves', email: 'marina.demo@neobambu.local', role: 'marketing', title: 'Coordenação de Marketing' },
  { id: 'u-rafael', name: 'Rafael Costa', email: 'rafael.demo@neobambu.local', role: 'marketing', title: 'Conteúdo e Social Media' },
  { id: 'u-helena', name: 'Helena Prado', email: 'helena.demo@neobambu.local', role: 'diretoria', title: 'Diretoria Executiva' },
  { id: 'u-ricardo', name: 'Ricardo Menezes', email: 'ricardo.demo@neobambu.local', role: 'diretoria', title: 'Diretoria Comercial' },
  { id: 'u-admin', name: 'Administrador', email: 'admin.demo@neobambu.local', role: 'admin', title: 'Administração da plataforma' },
]

export function buildSeed(today = new Date()): Workspace {
  const m0 = startOfMonth(today)
  const editorialLines: Taxonomy[] = DEFAULT_EDITORIAL_LINES.map((name, i) => ({ id: `el-${i + 1}`, name, description: '', active: true, sort: i }))
  const products: Taxonomy[] = DEFAULT_PRODUCTS.map((name, i) => ({ id: `pr-${i + 1}`, name, description: '', active: true, sort: i }))
  const P = (name: string) => products.find((p) => p.name === name)!.id
  const L = (n: number) => `el-${n}`

  const campaigns: Campaign[] = [
    {
      id: 'cp-xcore', name: 'Lançamento Neoteca XCore™', kind: 'comercial',
      objective: 'Apresentar a nova tecnologia ao mercado de especificação e gerar pedidos de amostras.',
      description: 'Série de conteúdos técnicos e aspiracionais com foco em arquitetos e incorporadoras.',
      startDate: d(subDays(m0, 6)), endDate: d(addDays(m0, 40)), productIds: [P('Neoteca XCore™')], status: 'ativa', ownerId: 'u-marina', createdAt: iso(subDays(m0, 30)),
    },
    {
      id: 'cp-esg', name: 'Superfícies que respiram', kind: 'institucional',
      objective: 'Reforçar o posicionamento de sustentabilidade, origem certificada e ciclo de vida dos materiais.',
      description: 'Conteúdos de ESG, rastreabilidade e bastidores da cadeia produtiva.',
      startDate: d(m0), endDate: d(addDays(m0, 60)), productIds: [P('ThermoWood®'), P('Bambu Densità')], status: 'ativa', ownerId: 'u-rafael', createdAt: iso(subDays(m0, 20)),
    },
    {
      id: 'cp-densita', name: 'Bambu Densità · Áreas externas', kind: 'comercial',
      objective: 'Posicionar o Bambu Densità como solução premium para decks e fachadas.',
      description: 'Aplicações em projetos residenciais de alto padrão, com foco em durabilidade.',
      startDate: d(addDays(m0, 10)), endDate: d(addDays(m0, 55)), productIds: [P('Bambu Densità')], status: 'planejamento', ownerId: 'u-marina', createdAt: iso(subDays(m0, 10)),
    },
    {
      id: 'cp-arq', name: 'Encontros com Arquitetos', kind: 'institucional',
      objective: 'Fortalecer o relacionamento com escritórios de arquitetura e especificadores.',
      description: 'Cobertura de encontros no showroom e conteúdos com projetos parceiros.',
      startDate: d(subDays(m0, 40)), endDate: d(addDays(m0, 5)), productIds: [P('Coleção Celta'), P('Bespoke')], status: 'ativa', ownerId: 'u-rafael', createdAt: iso(subDays(m0, 60)),
    },
  ]

  type Row = [dayOffset: number, time: string, title: string, channel: Channel, format: Format, campaign: string | null, line: number, products: string[], status: Status, owner: string, variant: ArtVariant, headline?: string]
  const rows: Row[] = [
    [-9, '10:00', 'Manifesto · Arquitetura de superfícies', 'instagram', 'feed', null, 1, [], 'publicado', 'u-marina', 'slats', 'Superfícies que contam histórias'],
    [-6, '18:30', 'XCore™ · Teaser de lançamento', 'instagram', 'reels', 'cp-xcore', 3, ['Neoteca XCore™'], 'publicado', 'u-rafael', 'ceiling', 'Uma nova estrutura para a madeira'],
    [-3, '09:00', 'Encontro de arquitetos · Showroom SP', 'linkedin', 'post', 'cp-arq', 7, ['Coleção Celta'], 'publicado', 'u-rafael', 'interior'],
    [1, '11:00', 'ThermoWood® · Do tratamento ao projeto', 'instagram', 'carrossel', 'cp-esg', 4, ['ThermoWood®'], 'publicado', 'u-marina', 'deck', 'Calor, vapor e nenhum químico'],
    [2, '19:00', 'Bastidores · Seleção de lâminas', 'instagram', 'stories', null, 1, ['Teca'], 'publicado', 'u-rafael', 'samples'],
    [3, '09:30', 'Neoteca XCore™ · Ficha técnica', 'linkedin', 'documento', 'cp-xcore', 4, ['Neoteca XCore™'], 'programado', 'u-marina', 'herringbone', 'Estabilidade dimensional em detalhe'],
    [4, '12:00', 'Projeto Casa Serra · Revestimento Celta', 'instagram', 'carrossel', 'cp-arq', 6, ['Coleção Celta'], 'aprovado', 'u-rafael', 'interior', 'Casa Serra'],
    [5, '18:00', 'Origem certificada · Rastreabilidade', 'linkedin', 'post', 'cp-esg', 5, ['ThermoWood®'], 'aprovado', 'u-marina', 'facade'],
    [6, '11:30', 'XCore™ · Estrutura em camadas', 'instagram', 'carrossel', 'cp-xcore', 4, ['Neoteca XCore™'], 'aguardando', 'u-marina', 'herringbone', 'Camadas que estabilizam'],
    [7, '10:00', 'Bespoke · Painéis sob medida', 'instagram', 'feed', null, 3, ['Bespoke'], 'aguardando', 'u-rafael', 'slats', 'Desenhado para um único projeto'],
    [8, '08:30', 'Coleção Celta · Lançamento das tonalidades', 'linkedin', 'post', 'cp-arq', 3, ['Coleção Celta'], 'aguardando', 'u-marina', 'samples'],
    [8, '19:00', 'Ritual de manhã · Lifestyle', 'instagram', 'reels', null, 9, ['Teca'], 'aguardando', 'u-rafael', 'interior', 'O silêncio da madeira'],
    [9, '12:00', 'Bambu Densità · Decks que duram', 'instagram', 'feed', 'cp-densita', 3, ['Bambu Densità'], 'ajustes', 'u-marina', 'deck', 'Feito para o tempo'],
    [11, '10:00', 'ESG · Ciclo de vida do bambu', 'instagram', 'carrossel', 'cp-esg', 5, ['Bambu Densità'], 'ajustes', 'u-rafael', 'bamboo', 'Cresce em cinco anos'],
    [12, '18:00', 'Multitech · Superfícies técnicas', 'linkedin', 'post', null, 2, ['Multitech'], 'revisao', 'u-marina', 'ceiling'],
    [13, '11:00', 'Helveti · Precisão suíça em madeira', 'instagram', 'feed', null, 3, ['Helveti'], 'revisao', 'u-rafael', 'herringbone', 'Precisão em cada junta'],
    [14, '09:00', 'Imprensa · Destaque em revista de arquitetura', 'linkedin', 'post', null, 10, [], 'producao', 'u-marina', 'facade'],
    [15, '19:30', 'Soul Exotic Hardwood · Texturas', 'instagram', 'reels', null, 3, ['Soul Exotic Hardwood'], 'producao', 'u-rafael', 'samples'],
    [16, '12:00', 'Bambu Densità · Fachadas ventiladas', 'instagram', 'carrossel', 'cp-densita', 6, ['Bambu Densità'], 'producao', 'u-marina', 'facade', 'Fachadas que respiram'],
    [18, '10:30', 'Educação técnica · Manutenção de decks', 'instagram', 'carrossel', 'cp-densita', 4, ['Bambu Densità', 'ThermoWood®'], 'ideia', 'u-rafael', 'deck'],
    [19, '09:00', 'Arquitetos · Entrevista com escritório parceiro', 'linkedin', 'video', 'cp-arq', 8, ['Bespoke'], 'ideia', 'u-marina', 'interior'],
    [21, '18:00', 'Teca · Coleção de inverno', 'instagram', 'feed', null, 3, ['Teca'], 'ideia', 'u-rafael', 'slats'],
    [22, '11:00', 'Showroom · Novo ambiente', 'instagram', 'stories', null, 7, ['Coleção Celta'], 'ideia', 'u-marina', 'ceiling'],
    [24, '10:00', 'XCore™ · Depoimento de especificador', 'linkedin', 'post', 'cp-xcore', 8, ['Neoteca XCore™'], 'ideia', 'u-marina', 'interior'],
    [26, '12:00', 'Wellness · Biofilia nos interiores', 'instagram', 'carrossel', 'cp-esg', 9, ['Bambu Densità'], 'ideia', 'u-rafael', 'bamboo'],
    [33, '10:00', 'Retrospectiva do ano', 'instagram', 'reels', null, 1, [], 'ideia', 'u-marina', 'slats'],
  ]

  const captions: Record<string, string> = {
    default:
      'A madeira guarda o tempo em cada fibra. Na NEOBAMBU, transformamos essa matéria em superfícies que dialogam com a arquitetura contemporânea — com precisão técnica, origem responsável e um acabamento que se percebe no silêncio dos detalhes.\n\nConheça as aplicações no nosso showroom.',
    linkedin:
      'Arquitetura de superfícies é a disciplina de tratar cada plano como parte da experiência do espaço.\n\nNeste conteúdo, compartilhamos como a combinação entre tecnologia de estabilização e madeira de origem certificada amplia as possibilidades de especificação em projetos residenciais e corporativos.\n\nSolicite o material técnico completo ao nosso time de especificação.',
  }

  const contents: Content[] = []
  const versions: ContentVersion[] = []
  const approvals: ApprovalEvent[] = []
  const comments: Comment[] = []
  const lineName = (n: number) => editorialLines[n - 1].name

  rows.forEach((r, i) => {
    const [off, time, title, channel, fmt, campaignId, line, prods, status, owner, variant, headline] = r
    const id = `ct-${String(i + 1).padStart(3, '0')}`
    const pub = addDays(m0, off)
    const created = subDays(pub, 18)
    const ratio = fmt === 'reels' || fmt === 'stories' ? [1080, 1920] : fmt === 'post' ? [1200, 628] : fmt === 'video' ? [1920, 1080] : [1080, 1350]
    const nSlides = fmt === 'carrossel' || fmt === 'documento' ? 4 : 1
    const assets: Asset[] =
      status === 'ideia'
        ? []
        : Array.from({ length: nSlides }, (_, k) => ({
            id: `${id}-a${k + 1}`,
            kind: 'image' as const,
            name: `${title.split(' · ')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${k + 1}.png`,
            url: artwork(i * 7 + k * 3 + 11, {
              variant: k === 0 ? variant : (['samples', 'herringbone', 'slats', 'bamboo', 'deck'] as ArtVariant[])[(i + k) % 5],
              palette: i + k,
              width: ratio[0],
              height: ratio[1],
              headline: k === 0 ? headline : k === nSlides - 1 && nSlides > 1 ? 'Saiba mais em neobambu' : undefined,
              kicker: k === 0 ? lineName(line) : undefined,
            }),
            width: ratio[0],
            height: ratio[1],
          }))
    const hasV2 = ['ajustes', 'aprovado', 'programado'].includes(status) && i % 2 === 0
    const version = hasV2 ? 2 : 1
    const c: Content = {
      id,
      title,
      publishDate: d(pub),
      publishTime: time,
      channel,
      format: fmt,
      campaignId,
      editorialLineId: L(line),
      productIds: prods.map(P),
      objective: channel === 'linkedin' ? 'Autoridade técnica junto a arquitetos, especificadores e incorporadoras.' : 'Desejo de marca e reconhecimento estético das superfícies NEOBAMBU.',
      copyArt: headline ?? '',
      caption: status === 'ideia' ? '' : channel === 'linkedin' ? captions.linkedin : captions.default,
      cta: channel === 'linkedin' ? 'Solicite o material técnico' : 'Agende sua visita ao showroom',
      hashtags: channel === 'linkedin' ? '#arquitetura #especificação #madeira' : '#neobambu #arquiteturadesuperficies #madeira #designdeinteriores',
      internalNotes: status === 'producao' ? 'Aguardando fotos finais do projeto (DEMO).' : '',
      referenceLinks: [],
      assets,
      status,
      ownerId: owner,
      version,
      submittedVersion: ['aguardando', 'ajustes', 'aprovado', 'programado', 'publicado'].includes(status) ? version : null,
      approvedVersion: ['aprovado', 'programado', 'publicado'].includes(status) ? version : null,
      approvedBy: ['aprovado', 'programado', 'publicado'].includes(status) ? (i % 2 ? 'u-helena' : 'u-ricardo') : null,
      approvedAt: ['aprovado', 'programado', 'publicado'].includes(status) ? iso(subDays(pub, 3)) : null,
      parentId: null,
      createdAt: iso(created),
      updatedAt: iso(subDays(pub, 3)),
    }
    // ajustes: a versão 2 ainda não foi reenviada
    if (status === 'ajustes') c.submittedVersion = hasV2 ? 1 : 1
    contents.push(c)

    for (let v = 1; v <= version; v++) {
      const snap = pickFields(c)
      if (v < version) snap.caption = snap.caption.replace('Conheça as aplicações no nosso showroom.', 'Saiba mais no link da bio.')
      versions.push({ id: `${id}-v${v}`, contentId: id, number: v, snapshot: snap, createdBy: owner, createdAt: iso(addDays(created, v * 3)), updatedAt: iso(addDays(created, v * 3)) })
    }

    const ev = (n: number, action: ApprovalEvent['action'], user: string, at: Date, from: Status | null, to: Status | null, message: string | null = null, v = 1) =>
      approvals.push({ id: `${id}-e${n}`, contentId: id, version: v, action, userId: user, message, fromStatus: from, toStatus: to, createdAt: iso(at) })
    ev(1, 'created', owner, created, null, 'ideia')
    if (c.submittedVersion) {
      ev(2, 'submitted', owner, addDays(created, 5), 'revisao', 'aguardando')
      if (hasV2) {
        ev(3, 'changes_requested', 'u-helena', addDays(created, 6), 'aguardando', 'ajustes', 'Ajustar o CTA e revisar a frase final da legenda.')
        ev(4, 'new_version', owner, addDays(created, 7), 'ajustes', 'ajustes', 'Versão 2 criada', 2)
        if (status !== 'ajustes') ev(5, 'submitted', owner, addDays(created, 7), 'ajustes', 'aguardando', null, 2)
      }
      if (c.approvedBy) ev(6, 'approved', c.approvedBy, new Date(c.approvedAt!), 'aguardando', 'aprovado', null, version)
      if (status === 'ajustes' && !hasV2)
        ev(7, 'changes_requested', 'u-ricardo', addDays(created, 8), 'aguardando', 'ajustes', 'A imagem de capa precisa de mais respiro. Sugiro reduzir o texto sobre a arte.')
    }
  })

  // comentários de demonstração
  const add = (cm: Partial<Comment> & Pick<Comment, 'contentId' | 'authorId' | 'body'>) =>
    comments.push({ id: `cm-${comments.length + 1}`, version: 1, parentId: null, kind: 'comment', pin: null, resolved: false, resolvedBy: null, resolvedAt: null, createdAt: iso(subDays(today, 2)), ...cm })
  add({ contentId: 'ct-013', authorId: 'u-ricardo', body: 'A imagem de capa precisa de mais respiro. Sugiro reduzir o texto sobre a arte.', kind: 'adjustment', pin: { assetId: 'ct-013-a1', x: 32, y: 78 } })
  add({ contentId: 'ct-013', authorId: 'u-marina', body: 'Combinado, vamos reduzir para uma linha e aumentar a margem inferior.', parentId: 'cm-1' })
  add({ contentId: 'ct-014', authorId: 'u-helena', body: 'Ajustar o CTA e revisar a frase final da legenda.', kind: 'adjustment' })
  add({ contentId: 'ct-014', authorId: 'u-helena', body: 'Esta lâmina está escura demais em relação às demais.', pin: { assetId: 'ct-014-a2', x: 58, y: 40 } })
  add({ contentId: 'ct-009', authorId: 'u-helena', body: 'Gostei muito da sequência. Confirmar se o termo "estabilidade dimensional" está alinhado com o time técnico.' })
  add({ contentId: 'ct-009', authorId: 'u-rafael', body: 'Confirmado com engenharia de produto.', parentId: 'cm-5', resolved: true, resolvedBy: 'u-helena', resolvedAt: iso(subDays(today, 1)) })
  add({ contentId: 'ct-007', authorId: 'u-ricardo', body: 'Créditos do escritório de arquitetura precisam aparecer na última lâmina.', pin: { assetId: 'ct-007-a4', x: 50, y: 88 }, resolved: true, resolvedBy: 'u-marina', resolvedAt: iso(subDays(today, 3)) })

  // biblioteca
  const mediaRows: [string, MediaCategory, string, ArtVariant, boolean, string][] = [
    ['ThermoWood® deck residencial', 'produtos', 'ThermoWood®', 'deck', true, 'Uso livre em canais próprios'],
    ['Bambu Densità — painel close', 'produtos', 'Bambu Densità', 'bamboo', true, 'Uso livre em canais próprios'],
    ['Coleção Celta — amostras', 'colecoes', 'Coleção Celta', 'samples', true, 'Uso livre em canais próprios'],
    ['Casa Serra — sala de estar', 'projetos', 'Casa Serra', 'interior', true, 'Autorizado pelo escritório até 12/2027'],
    ['Edifício Alameda — fachada', 'projetos', 'Edifício Alameda', 'facade', false, 'Aguardando autorização do fotógrafo'],
    ['Showroom SP — forro', 'showroom', 'Showroom São Paulo', 'ceiling', true, 'Uso livre em canais próprios'],
    ['Showroom SP — parede ripada', 'showroom', 'Showroom São Paulo', 'slats', true, 'Uso livre em canais próprios'],
    ['Encontro de arquitetos', 'eventos', 'Encontros 2026', 'interior', true, 'Imagem de evento — sem uso publicitário pago'],
    ['Piso espinha de peixe — Teca', 'colecoes', 'Teca', 'herringbone', true, 'Uso livre em canais próprios'],
    ['Textura institucional', 'identidade', 'Identidade visual', 'slats', true, 'Uso interno e institucional'],
    ['Manifesto — still', 'institucional', 'Institucional', 'bamboo', true, 'Uso livre em canais próprios'],
    ['Deck Bambu Densità — piscina', 'projetos', 'Residência Litoral', 'deck', false, 'Direitos expiram em 30 dias'],
  ]
  const media: MediaItem[] = mediaRows.map(([name, category, folder, variant, authorized, rights], i) => ({
    id: `md-${i + 1}`,
    name,
    kind: 'image',
    url: artwork(200 + i * 13, { variant, palette: i, width: 1600, height: 1200 }),
    category,
    folder,
    tags: [folder.toLowerCase()],
    credits: i % 3 === 0 ? 'Fotografia: Estúdio Exemplo (DEMO)' : 'Acervo NEOBAMBU (DEMO)',
    usageRights: rights,
    origin: i % 2 ? 'Produção própria' : 'Fotógrafo contratado',
    rightsExpireAt: i === 11 ? d(addDays(today, 30)) : null,
    authorized,
    size: 2_400_000 + i * 180_000,
    width: 1600,
    height: 1200,
    uploadedBy: i % 2 ? 'u-rafael' : 'u-marina',
    createdAt: iso(subDays(today, 40 - i)),
  }))

  return { profiles: DEMO_PROFILES, contents, versions, approvals, comments, campaigns, media, notifications: [], editorialLines, products }
}

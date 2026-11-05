/**
 * Artes de DEMONSTRAÇÃO geradas proceduralmente (SVG), inspiradas em
 * superfícies de madeira e bambu. Substituídas pelas artes reais assim que o
 * marketing faz upload. Nenhuma fotografia de terceiros é usada.
 */

export type ArtVariant = 'slats' | 'herringbone' | 'deck' | 'interior' | 'bamboo' | 'facade' | 'ceiling' | 'samples'
export const ART_VARIANTS: ArtVariant[] = ['slats', 'interior', 'herringbone', 'deck', 'bamboo', 'facade', 'ceiling', 'samples']

const PALETTES = [
  { a: '#B8A58F', b: '#8E7A63', c: '#D8CFBF', d: '#F7F6F2', e: '#3B352E' }, // carvalho claro
  { a: '#9C7A57', b: '#6E5239', c: '#C9B192', d: '#EFE9DF', e: '#2C241D' }, // teca
  { a: '#C7B595', b: '#A08B6B', c: '#E3D9C6', d: '#F5F2EA', e: '#46403A' }, // bambu
  { a: '#7A6A5A', b: '#4F443A', c: '#A89886', d: '#E6E5E1', e: '#1C1C1A' }, // thermowood
  { a: '#8F8A7A', b: '#5A6254', c: '#C9C6BA', d: '#EDECE7', e: '#262623' }, // oliva mineral
]

function rng(seed: number) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

const grain = (id: string, fx: number, fy: number, seed: number, opacity = 0.5) => `
<filter id="${id}" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency="${fx} ${fy}" numOctaves="3" seed="${seed}"/>
  <feColorMatrix values="0 0 0 0 0.2  0 0 0 0 0.15  0 0 0 0 0.1  0 0 0 ${opacity} 0"/>
  <feComposite in2="SourceGraphic" operator="in"/>
</filter>`

function body(v: ArtVariant, w: number, h: number, p: (typeof PALETTES)[number], r: () => number, _seed: number) {
  switch (v) {
    case 'slats': {
      const n = Math.round(w / 34)
      const sw = w / n
      let s = ''
      for (let i = 0; i < n; i++) {
        const shade = 0.85 + r() * 0.2
        s += `<rect x="${i * sw + 2}" y="0" width="${sw - 5}" height="${h}" fill="${p.a}" opacity="${shade}"/>`
      }
      return `<rect width="${w}" height="${h}" fill="${p.e}"/>${s}
      <rect width="${w}" height="${h}" fill="${p.b}" filter="url(#g)"/>
      <linearGradient id="l" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset=".55" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>
      <rect width="${w}" height="${h}" fill="url(#l)"/>
      <rect x="${w * 0.12}" y="${h * 0.72}" width="${w * 0.6}" height="${h * 0.035}" fill="${p.e}" opacity=".9"/>
      <rect x="${w * 0.12}" y="${h * 0.755}" width="${w * 0.6}" height="${h * 0.25}" fill="${p.e}" opacity=".35"/>`
    }
    case 'herringbone': {
      const bw = w / 9
      const bh = bw / 3.2
      let s = ''
      for (let row = -2; row < h / bh + 4; row++) {
        for (let col = -1; col < 6; col++) {
          const x = col * bw * 1.42 + (row % 2) * 0
          const y = row * bh * 1.42
          const t = 0.8 + r() * 0.25
          s += `<g transform="translate(${x} ${y}) rotate(45)"><rect width="${bw}" height="${bh}" fill="${p.a}" opacity="${t}" stroke="${p.e}" stroke-opacity=".25" stroke-width="1"/></g>`
          s += `<g transform="translate(${x + bw * 0.71} ${y + bw * 0.71}) rotate(-45)"><rect width="${bw}" height="${bh}" fill="${p.c}" opacity="${t}" stroke="${p.e}" stroke-opacity=".25" stroke-width="1"/></g>`
        }
      }
      return `<rect width="${w}" height="${h}" fill="${p.b}"/>${s}<rect width="${w}" height="${h}" fill="${p.b}" filter="url(#g)"/>
      <radialGradient id="l" cx=".7" cy=".2" r="1"><stop offset="0" stop-color="#fff" stop-opacity=".25"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>
      <rect width="${w}" height="${h}" fill="url(#l)"/>`
    }
    case 'deck': {
      const n = 14
      const bh = h / n
      let s = ''
      for (let i = 0; i < n; i++) s += `<rect x="0" y="${i * bh + 1.5}" width="${w}" height="${bh - 3}" fill="${p.a}" opacity="${0.82 + r() * 0.2}"/>`
      let sh = ''
      for (let i = -4; i < 12; i++) sh += `<rect x="${i * w * 0.14}" y="-${h}" width="${w * 0.05}" height="${h * 3}" fill="#000" opacity=".22" transform="rotate(28 ${w / 2} ${h / 2})"/>`
      return `<rect width="${w}" height="${h}" fill="${p.e}"/>${s}<rect width="${w}" height="${h}" fill="${p.b}" filter="url(#g)"/>${sh}`
    }
    case 'interior': {
      const fy = h * 0.66
      let planks = ''
      for (let i = -10; i <= 10; i++) planks += `<line x1="${w / 2 + i * w * 0.04}" y1="${fy}" x2="${w / 2 + i * w * 0.22}" y2="${h}" stroke="${p.e}" stroke-opacity=".18" stroke-width="1.2"/>`
      return `<rect width="${w}" height="${h}" fill="${p.d}"/>
      <rect x="0" y="0" width="${w}" height="${fy}" fill="${p.c}" opacity=".55"/>
      <polygon points="${w * 0.52},${h * 0.08} ${w * 0.86},${h * 0.08} ${w * 0.98},${fy} ${w * 0.6},${fy}" fill="#fff" opacity=".55"/>
      <polygon points="${w * 0.6},${fy} ${w * 0.98},${fy} ${w},${h} ${w * 0.55},${h}" fill="#fff" opacity=".25"/>
      <rect x="0" y="${fy}" width="${w}" height="${h - fy}" fill="${p.a}"/>
      <rect x="0" y="${fy}" width="${w}" height="${h - fy}" fill="${p.b}" filter="url(#g)"/>
      ${planks}
      <rect x="${w * 0.08}" y="${fy - h * 0.16}" width="${w * 0.34}" height="${h * 0.12}" fill="${p.e}" opacity=".85"/>
      <rect x="${w * 0.1}" y="${fy - h * 0.04}" width="${w * 0.012}" height="${h * 0.05}" fill="${p.e}"/>
      <rect x="${w * 0.39}" y="${fy - h * 0.04}" width="${w * 0.012}" height="${h * 0.05}" fill="${p.e}"/>
      <circle cx="${w * 0.25}" cy="${fy - h * 0.25}" r="${w * 0.05}" fill="#5A6254" opacity=".9"/>
      <rect x="${w * 0.235}" y="${fy - h * 0.2}" width="${w * 0.03}" height="${h * 0.04}" fill="${p.e}" opacity=".7"/>`
    }
    case 'bamboo': {
      const n = 22
      const sw = w / n
      let s = ''
      for (let i = 0; i < n; i++) {
        s += `<rect x="${i * sw}" y="0" width="${sw - 1}" height="${h}" fill="${i % 3 ? p.a : p.c}" opacity="${0.8 + r() * 0.2}"/>`
        const nodes = 3 + Math.floor(r() * 3)
        for (let k = 0; k < nodes; k++) s += `<rect x="${i * sw}" y="${r() * h}" width="${sw - 1}" height="2" fill="${p.e}" opacity=".35"/>`
      }
      return `<rect width="${w}" height="${h}" fill="${p.b}"/>${s}<rect width="${w}" height="${h}" fill="${p.b}" filter="url(#g)"/>
      <linearGradient id="l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient><rect width="${w}" height="${h}" fill="url(#l)"/>`
    }
    case 'facade': {
      let s = ''
      const n = 26
      for (let i = 0; i < n; i++) s += `<rect x="${w * 0.1}" y="${h * 0.22 + i * (h * 0.7) / n}" width="${w * 0.8}" height="${(h * 0.7) / n - 2}" fill="${p.a}" opacity="${0.8 + r() * 0.2}"/>`
      return `<rect width="${w}" height="${h}" fill="${p.d}"/>
      <rect x="0" y="${h * 0.92}" width="${w}" height="${h * 0.08}" fill="${p.c}"/>
      <rect x="${w * 0.1}" y="${h * 0.22}" width="${w * 0.8}" height="${h * 0.7}" fill="${p.e}"/>${s}
      <rect x="${w * 0.1}" y="${h * 0.22}" width="${w * 0.8}" height="${h * 0.7}" fill="${p.b}" filter="url(#g)"/>
      <rect x="${w * 0.08}" y="${h * 0.2}" width="${w * 0.84}" height="${h * 0.025}" fill="${p.e}"/>
      <rect x="${w * 0.56}" y="${h * 0.42}" width="${w * 0.26}" height="${h * 0.5}" fill="${p.e}" opacity=".88"/>
      <rect x="${w * 0.58}" y="${h * 0.44}" width="${w * 0.22}" height="${h * 0.46}" fill="#C9C6BA" opacity=".35"/>`
    }
    case 'ceiling': {
      let s = ''
      const vx = w * 0.5
      const vy = h * 0.62
      for (let i = -14; i <= 14; i++) {
        const x = vx + i * w * 0.09
        s += `<polygon points="${vx + i * 2},${vy} ${vx + i * 2 + 1.5},${vy} ${x + w * 0.035},0 ${x},0" fill="${i % 2 ? p.a : p.c}" opacity=".95"/>`
      }
      return `<rect width="${w}" height="${h}" fill="${p.e}"/>${s}<rect width="${w}" height="${h * 0.62}" fill="${p.b}" filter="url(#g)"/>
      <rect x="0" y="${vy}" width="${w}" height="${h - vy}" fill="${p.d}"/>
      <rect x="${w * 0.2}" y="${vy}" width="${w * 0.6}" height="${h * 0.12}" fill="#fff" opacity=".5"/>
      <rect x="0" y="${vy + h * 0.12}" width="${w}" height="${h}" fill="${p.c}"/>`
    }
    case 'samples': {
      let s = ''
      const cols = [p.a, p.b, p.c, '#6E5239', '#5A6254', p.e]
      for (let i = 0; i < 6; i++) {
        const x = w * 0.14 + i * w * 0.05
        const y = h * 0.16 + i * h * 0.1
        s += `<g transform="rotate(${-8 + r() * 6} ${x} ${y})"><rect x="${x}" y="${y}" width="${w * 0.5}" height="${h * 0.3}" fill="${cols[i]}"/><rect x="${x}" y="${y}" width="${w * 0.5}" height="${h * 0.3}" fill="${p.b}" filter="url(#g)"/><rect x="${x}" y="${y}" width="${w * 0.5}" height="${h * 0.3}" fill="none" stroke="#000" stroke-opacity=".12"/></g>`
      }
      return `<rect width="${w}" height="${h}" fill="${p.d}"/>${s}`
    }
  }
}

export interface ArtOptions {
  variant?: ArtVariant
  palette?: number
  width?: number
  height?: number
  headline?: string
  kicker?: string
  dark?: boolean
}

export function artwork(seed: number, o: ArtOptions = {}): string {
  const w = o.width ?? 1080
  const h = o.height ?? 1350
  const r = rng(seed * 9301 + 49297)
  const variant = o.variant ?? ART_VARIANTS[seed % ART_VARIANTS.length]
  const p = PALETTES[(o.palette ?? seed) % PALETTES.length] 
  const vertical = variant === 'slats' || variant === 'bamboo'
  const g = grain('g', vertical ? 0.002 : 0.12, vertical ? 0.09 : 0.003, seed % 97, 0.55)
  const fs = Math.round(w * 0.058)
  const text = o.headline
    ? `<rect x="0" y="${h * 0.62}" width="${w}" height="${h * 0.38}" fill="url(#shade)"/>
      <text x="${w * 0.07}" y="${h - w * 0.07 - fs * 1.4 * (wrap(o.headline, 22).length - 1) - fs * 0.9}" font-family="Inter, Helvetica, Arial" font-size="${Math.round(fs * 0.34)}" letter-spacing="${fs * 0.08}" fill="#F7F6F2" opacity=".85">${esc((o.kicker ?? 'NEOBAMBU').toUpperCase())}</text>
      ${wrap(o.headline, 22)
        .map((line, i, arr) => `<text x="${w * 0.07}" y="${h - w * 0.07 - fs * 1.18 * (arr.length - 1 - i)}" font-family="Manrope, Helvetica Neue, Arial" font-weight="300" font-size="${fs}" fill="#F7F6F2">${esc(line)}</text>`)
        .join('')}`
    : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs>${g}
  <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1C1C1A" stop-opacity="0"/><stop offset="1" stop-color="#1C1C1A" stop-opacity=".72"/></linearGradient></defs>
  ${body(variant, w, h, p, r, seed)}${text}</svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

function wrap(s: string, n: number) {
  const words = s.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const wd of words) {
    if ((cur + ' ' + wd).trim().length > n && cur) {
      lines.push(cur)
      cur = wd
    } else cur = (cur + ' ' + wd).trim()
  }
  if (cur) lines.push(cur)
  return lines.slice(0, 4)
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

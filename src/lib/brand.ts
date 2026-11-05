import { useEffect } from 'react'

/** Tokens editáveis em Configurações › Identidade visual (sobrescrevem index.css). */
export const BRAND_TOKENS: { key: string; label: string; default: string }[] = [
  { key: 'ink', label: 'Preto sofisticado', default: '#1C1C1A' },
  { key: 'graphite', label: 'Grafite (menu)', default: '#262623' },
  { key: 'paper', label: 'Off-white natural', default: '#F7F6F2' },
  { key: 'sand', label: 'Bege areia', default: '#D8CFBF' },
  { key: 'wood', label: 'Madeira clara', default: '#B8A58F' },
  { key: 'olive', label: 'Verde oliva', default: '#5A6254' },
  { key: 'mineral', label: 'Cinza mineral', default: '#E6E5E1' },
]

const KEY = 'nb-brand-tokens'
export const EVT = 'nb-brand-change'

export function readTokens(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}
export function saveTokens(t: Record<string, string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(t))
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVT))
}

const hexToChannels = (hex: string) => {
  const h = hex.replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, '$&$&') : h, 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

export function applyTokens() {
  const t = readTokens()
  const root = document.documentElement
  for (const tk of BRAND_TOKENS) {
    if (t[tk.key] && /^#[0-9a-f]{6}$/i.test(t[tk.key])) root.style.setProperty(`--nb-${tk.key}`, hexToChannels(t[tk.key]))
    else root.style.removeProperty(`--nb-${tk.key}`)
  }
}

export function useBrandTokens() {
  useEffect(() => {
    applyTokens()
    window.addEventListener(EVT, applyTokens)
    return () => window.removeEventListener(EVT, applyTokens)
  }, [])
}

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { provider } from '@/lib/data'
import type { Profile, Workspace } from '@/lib/types'

interface Toast {
  id: number
  message: string
  tone: 'default' | 'error'
}

interface AppState {
  provider: typeof provider
  user: Profile | null
  ws: Workspace
  ready: boolean
  refresh: () => Promise<void>
  setUser: (p: Profile | null) => void
  /** executa uma ação, recarrega dados e mostra feedback */
  run: <T>(fn: () => Promise<T>, success?: string) => Promise<T | undefined>
  toast: (message: string, tone?: Toast['tone']) => void
  toasts: Toast[]
  lookup: {
    profile: (id: string | null | undefined) => Profile | undefined
    campaign: (id: string | null | undefined) => Workspace['campaigns'][number] | undefined
    line: (id: string | null | undefined) => Workspace['editorialLines'][number] | undefined
    product: (id: string) => Workspace['products'][number] | undefined
  }
}

const EMPTY: Workspace = { profiles: [], contents: [], versions: [], approvals: [], comments: [], campaigns: [], media: [], notifications: [], editorialLines: [], products: [] }

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [ws, setWs] = useState<Workspace>(EMPTY)
  const [ready, setReady] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)

  const toast = useCallback((message: string, tone: Toast['tone'] = 'default') => {
    const id = ++seq.current
    setToasts((t) => [...t, { id, message, tone }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 3200)
  }, [])

  const refresh = useCallback(async () => {
    try {
      setWs(await provider.load())
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }, [toast])

  useEffect(() => {
    provider
      .getSession()
      .then(async (p) => {
        setUser(p)
        if (p?.role) await refresh()
      })
      .catch((e) => toast((e as Error).message, 'error'))
      .finally(() => setReady(true))
  }, [refresh, toast])

  useEffect(() => {
    if (!user?.role || !provider.subscribe) return
    let t: ReturnType<typeof setTimeout>
    return provider.subscribe(() => {
      clearTimeout(t)
      t = setTimeout(refresh, 400)
    })
  }, [user, refresh])

  const run = useCallback(
    async <T,>(fn: () => Promise<T>, success?: string) => {
      try {
        const r = await fn()
        await refresh()
        if (success) toast(success)
        return r
      } catch (e) {
        toast((e as Error).message, 'error')
        await refresh()
        return undefined
      }
    },
    [refresh, toast],
  )

  const lookup = useMemo(() => {
    const pm = new Map(ws.profiles.map((p) => [p.id, p]))
    const cm = new Map(ws.campaigns.map((p) => [p.id, p]))
    const lm = new Map(ws.editorialLines.map((p) => [p.id, p]))
    const prm = new Map(ws.products.map((p) => [p.id, p]))
    return {
      profile: (id: string | null | undefined) => (id ? pm.get(id) : undefined),
      campaign: (id: string | null | undefined) => (id ? cm.get(id) : undefined),
      line: (id: string | null | undefined) => (id ? lm.get(id) : undefined),
      product: (id: string) => prm.get(id),
    }
  }, [ws])

  const value: AppState = { provider, user, ws, ready, refresh, setUser, run, toast, toasts, lookup }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp fora do AppProvider')
  return v
}

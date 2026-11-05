import { BarChart3, Bell, CalendarDays, CheckCheck, FileStack, FolderOpen, History, LayoutGrid, LogOut, Menu, Megaphone, Settings, Stamp, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui'
import { Logo } from '@/components/content/bits'
import type { Role } from '@/lib/types'
import { cn, fromNow } from '@/lib/utils'
import { useApp } from '@/store/app'

const NAV: { to: string; label: string; icon: typeof LayoutGrid; roles?: Role[] }[] = [
  { to: '/', label: 'Overview', icon: LayoutGrid },
  { to: '/calendario', label: 'Calendário editorial', icon: CalendarDays },
  { to: '/conteudos', label: 'Conteúdos', icon: FileStack },
  { to: '/aprovacoes', label: 'Aprovações', icon: Stamp },
  { to: '/campanhas', label: 'Campanhas', icon: Megaphone },
  { to: '/biblioteca', label: 'Biblioteca de mídia', icon: FolderOpen, roles: ['marketing', 'admin'] },
  { to: '/historico', label: 'Histórico de publicações', icon: History },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

export function Shell() {
  const { user, ws, provider, setUser } = useApp()
  const [open, setOpen] = useState(false)
  const loc = useLocation()
  const nav = useNavigate()
  useEffect(() => setOpen(false), [loc.pathname])
  const pending = ws.contents.filter((c) => c.status === 'aguardando').length
  const items = NAV.filter((n) => !n.roles || (user && n.roles.includes(user.role)))

  const sidebar = (
    <div className="flex h-full flex-col bg-ink text-paper">
      <div className="px-7 pb-10 pt-8">
        <Logo />
        <p className="mt-3 text-[10px] uppercase tracking-label text-paper/40">Content Approval Hub</p>
      </div>
      <nav className="flex-1 space-y-px px-3">
        {items.map(({ to, label, icon: I }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 px-4 py-2.5 text-[13px] transition-colors',
                isActive ? 'bg-paper/[0.07] text-paper' : 'text-paper/55 hover:bg-paper/[0.04] hover:text-paper/90',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={cn('absolute left-0 top-1/2 h-4 w-px -translate-y-1/2 bg-sand transition-opacity', isActive ? 'opacity-100' : 'opacity-0')} />
                <I className="h-4 w-4" strokeWidth={1.25} />
                <span className="flex-1">{label}</span>
                {to === '/aprovacoes' && pending > 0 && <span className="min-w-[20px] bg-sand px-1.5 py-px text-center text-[10.5px] font-medium text-ink">{pending}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      {user && (
        <div className="border-t border-paper/10 px-5 py-5">
          <div className="flex items-center gap-3">
            <Avatar name={user.name} className="bg-paper/10 text-paper" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] text-paper">{user.name}</p>
              <p className="truncate text-[10.5px] uppercase tracking-label text-paper/40">{roleLabel(user.role)}</p>
            </div>
            <button
              className="p-1.5 text-paper/40 hover:text-paper"
              title="Sair"
              onClick={async () => {
                await provider.signOut()
                setUser(null)
                nav('/')
              }}
            >
              <LogOut className="h-4 w-4" strokeWidth={1.25} />
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen lg:pl-[260px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[260px] lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[280px] animate-fade-in">{sidebar}</div>
          <button className="absolute right-4 top-4 p-2 text-paper" onClick={() => setOpen(false)} aria-label="Fechar menu">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      {provider.mode === 'demo' && (
        <div className="no-print border-b border-wood/30 bg-sand/40 px-4 py-2 text-center text-[11.5px] text-ink/75 lg:px-10">
          <span className="font-medium uppercase tracking-label">Modo demonstração</span> · dados fictícios salvos apenas neste navegador. Configure o Supabase para autenticação e persistência reais.
        </div>
      )}
      <header className="no-print sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-paper/85 px-4 backdrop-blur-md md:px-10">
        <div className="flex items-center gap-3">
          <button className="-ml-2 p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu">
            <Menu className="h-5 w-5" strokeWidth={1.4} />
          </button>
          <div className="lg:hidden">
            <Logo light={false} />
          </div>
          <Crumb />
        </div>
        <NotificationCenter />
      </header>
      <main className="mx-auto max-w-[1480px] px-4 py-8 md:px-10 md:py-12">
        <Outlet />
      </main>
      <Toasts />
    </div>
  )
}

export const roleLabel = (r: Role | null) => (r === 'diretoria' ? 'Diretoria' : r === 'admin' ? 'Administrador' : r === 'marketing' ? 'Marketing' : 'Sem acesso')

function Crumb() {
  const loc = useLocation()
  const item = NAV.find((n) => (n.to === '/' ? loc.pathname === '/' : loc.pathname.startsWith(n.to)))
  return <span className="hidden text-[12px] uppercase tracking-label text-muted lg:inline">{item?.label}</span>
}

function NotificationCenter() {
  const { ws, user, provider, refresh } = useApp()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const nav = useNavigate()
  const mine = useMemo(() => ws.notifications.filter((n) => n.userId === user?.id).slice(0, 40), [ws, user])
  const unread = mine.filter((n) => !n.read)
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const markAll = async () => {
    await provider.markNotificationsRead(unread.map((n) => n.id))
    await refresh()
  }
  const dot: Record<string, string> = {
    awaiting_approval: 'bg-st-aguardando',
    approved: 'bg-st-aprovado',
    changes_requested: 'bg-st-ajustes',
    comment: 'bg-wood',
    upcoming: 'bg-st-programado',
    pending_reminder: 'bg-st-aguardando',
  }
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative grid h-10 w-10 place-items-center text-ink/70 hover:text-ink" aria-label="Notificações">
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.3} />
        {unread.length > 0 && <span className="absolute right-1.5 top-1.5 min-w-[16px] rounded-full bg-ink px-1 text-center text-[9.5px] font-medium leading-4 text-paper">{unread.length}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-[min(92vw,380px)] border border-line bg-white shadow-xl animate-fade-in">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <p className="font-display text-[14px] font-light">Notificações</p>
            {unread.length > 0 && (
              <button onClick={markAll} className="flex items-center gap-1 text-[11.5px] text-muted hover:text-ink">
                <CheckCheck className="h-3.5 w-3.5" strokeWidth={1.4} /> Marcar todas como lidas
              </button>
            )}
          </div>
          <div className="scroll-thin max-h-[60vh] overflow-y-auto">
            {mine.length === 0 && <p className="px-5 py-10 text-center text-[13px] text-muted">Nenhuma notificação.</p>}
            {mine.map((n) => (
              <button
                key={n.id}
                onClick={async () => {
                  setOpen(false)
                  if (!n.read) await provider.markNotificationsRead([n.id])
                  if (n.contentId) nav(`/conteudos/${n.contentId}`)
                  await refresh()
                }}
                className={cn('flex w-full gap-3 border-b border-line/70 px-5 py-3.5 text-left transition-colors hover:bg-paper', !n.read && 'bg-paper/60')}
              >
                <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', n.read ? 'bg-line' : dot[n.type])} />
                <span className="min-w-0 flex-1">
                  <span className={cn('block text-[12.5px]', n.read ? 'text-muted' : 'text-ink')}>{n.title}</span>
                  <span className="mt-0.5 block truncate text-[12px] text-muted">{n.body}</span>
                  <span className="mt-1 block text-[10.5px] text-muted/80">{fromNow(n.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="border-t border-line px-5 py-2.5 text-[10.5px] text-muted">
            {provider.mode === 'supabase' ? 'Cópias por e-mail são enfileiradas e enviadas quando o provedor de e-mail estiver configurado.' : 'E-mail: disponível após configurar Supabase + provedor de envio.'}
          </p>
        </div>
      )}
    </div>
  )
}

function Toasts() {
  const { toasts } = useApp()
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={cn('pointer-events-auto max-w-[92vw] px-5 py-3 text-[13px] shadow-lg animate-fade-in', t.tone === 'error' ? 'bg-st-ajustes text-white' : 'bg-ink text-paper')}>
          {t.message}
        </div>
      ))}
    </div>
  )
}

export function Section({ title, action, children, className }: { title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('border border-line bg-white', className)}>
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 md:px-6">
        <h3 className="font-display text-[15px] font-light tracking-tight">{title}</h3>
        {action}
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </section>
  )
}

import { ArrowRight, Info } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Avatar, Button, Field, Input } from '@/components/ui'
import { Logo } from '@/components/content/bits'
import { roleLabel } from '@/components/layout/Shell'
import { artwork } from '@/lib/demo/artwork'
import type { Profile } from '@/lib/types'
import { useApp } from '@/store/app'

export default function Login() {
  const { provider, setUser, refresh, toast, user } = useApp()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const hero = useMemo(() => artwork(4, { variant: 'slats', palette: 3, width: 1200, height: 1600 }), [])

  useEffect(() => {
    provider.demoProfiles?.().then(setProfiles)
  }, [provider])

  const enter = async (fn: () => Promise<Profile>) => {
    setBusy(true)
    try {
      const p = await fn()
      setUser(p)
      if (p.role) await refresh()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-paper lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-14">
          <Logo />
          <div className="max-w-md">
            <p className="label mb-5 text-paper/50">Content Approval Hub</p>
            <h1 className="font-display text-[44px] font-extralight leading-[1.08] tracking-tight text-paper">Planejamento, conteúdo e aprovações em um único espaço.</h1>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[400px] animate-fade-in">
          <div className="mb-12 lg:hidden">
            <Logo light={false} />
          </div>

          {user && !user.role ? (
            <div>
              <h2 className="font-display text-2xl font-extralight">Acesso em liberação</h2>
              <p className="mt-3 text-[14px] leading-relaxed text-muted">
                Sua conta ({user.email}) foi criada, mas ainda não possui um perfil de acesso. Um administrador precisa definir se você faz parte do Marketing ou da Diretoria.
              </p>
              <Button
                className="mt-8"
                onClick={async () => {
                  await provider.signOut()
                  setUser(null)
                }}
              >
                Sair
              </Button>
            </div>
          ) : provider.mode === 'demo' ? (
            <>
              <h2 className="font-display text-[26px] font-extralight tracking-tight">Entrar na demonstração</h2>
              <p className="mt-2 text-[13.5px] text-muted">Escolha um perfil fictício para conhecer a experiência de cada área.</p>
              <div className="mt-8 divide-y divide-line border border-line bg-white">
                {profiles.map((p) => (
                  <button key={p.id} disabled={busy} onClick={() => enter(() => provider.demoSignInAs!(p.id))} className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-paper">
                    <Avatar name={p.name} className="h-9 w-9" />
                    <span className="flex-1">
                      <span className="block text-[14px] text-ink">{p.name}</span>
                      <span className="block text-[11.5px] text-muted">
                        {roleLabel(p.role)} · {p.title}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" strokeWidth={1.3} />
                  </button>
                ))}
              </div>
              <p className="mt-6 flex gap-2 text-[11.5px] leading-relaxed text-muted">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.4} />
                Modo demonstração: sem autenticação real. Os dados ficam salvos apenas neste navegador. Para uso da equipe, configure o Supabase (veja o README).
              </p>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                enter(() => provider.signIn(email, password))
              }}
            >
              <h2 className="font-display text-[26px] font-extralight tracking-tight">Entrar</h2>
              <p className="mt-2 text-[13.5px] text-muted">Acesso restrito às equipes de Marketing e Diretoria NEOBAMBU.</p>
              <div className="mt-8 space-y-5">
                <Field label="E-mail">
                  <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
                <Field label="Senha">
                  <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </Field>
              </div>
              <Button type="submit" variant="primary" size="lg" className="mt-8 w-full" disabled={busy || !password}>
                Entrar
              </Button>
              <button
                type="button"
                disabled={!email || busy}
                className="mt-4 w-full text-center text-[12.5px] text-muted hover:text-ink disabled:opacity-40"
                onClick={async () => {
                  try {
                    await provider.signInWithMagicLink!(email)
                    setSent(true)
                  } catch (e) {
                    toast((e as Error).message, 'error')
                  }
                }}
              >
                {sent ? 'Link enviado. Verifique seu e-mail.' : 'Receber link de acesso por e-mail'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

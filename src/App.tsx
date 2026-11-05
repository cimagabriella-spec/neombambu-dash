import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Shell } from '@/components/layout/Shell'
import { Logo } from '@/components/content/bits'
import Login from '@/pages/Login'
import { AppProvider, useApp } from '@/store/app'
import { useBrandTokens } from '@/lib/brand'

const Overview = lazy(() => import('@/pages/Overview'))
const Calendar = lazy(() => import('@/pages/Calendar'))
const Contents = lazy(() => import('@/pages/Contents'))
const ContentDetail = lazy(() => import('@/pages/ContentDetail'))
const Approvals = lazy(() => import('@/pages/Approvals'))
const Campaigns = lazy(() => import('@/pages/Campaigns'))
const Library = lazy(() => import('@/pages/Library'))
const HistoryPage = lazy(() => import('@/pages/History'))
const Reports = lazy(() => import('@/pages/Reports'))
const Settings = lazy(() => import('@/pages/Settings'))

function Gate() {
  const { ready, user } = useApp()
  useBrandTokens()
  if (!ready)
    return (
      <div className="grid min-h-screen place-items-center bg-ink">
        <div className="animate-pulse">
          <Logo />
        </div>
      </div>
    )
  if (!user || !user.role) return <Login />
  return (
    <Suspense fallback={<div className="h-40" />}>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Overview />} />
          <Route path="calendario" element={<Calendar />} />
          <Route path="conteudos" element={<Contents />} />
          <Route path="conteudos/:id" element={<ContentDetail />} />
          <Route path="aprovacoes" element={<Approvals />} />
          <Route path="campanhas" element={<Campaigns />} />
          <Route path="biblioteca" element={<Library />} />
          <Route path="historico" element={<HistoryPage />} />
          <Route path="relatorios" element={<Reports />} />
          <Route path="configuracoes" element={<Settings />} />
          <Route path="*" element={<Overview />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Gate />
      </AppProvider>
    </BrowserRouter>
  )
}

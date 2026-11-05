import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from '@/components/layout/Shell'
import { Logo } from '@/components/content/bits'
import Login from '@/pages/Login'
import { AppProvider, useApp } from '@/store/app'
import { useBrandTokens } from '@/lib/brand'

const Calendar = lazy(() => import('@/pages/Calendar'))
const Contents = lazy(() => import('@/pages/Contents'))
const ContentDetail = lazy(() => import('@/pages/ContentDetail'))
const Approvals = lazy(() => import('@/pages/Approvals'))

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
          <Route index element={<Navigate to="/calendario" replace />} />
          <Route path="calendario" element={<Calendar />} />
          <Route path="conteudos" element={<Contents />} />
          <Route path="conteudos/:id" element={<ContentDetail />} />
          <Route path="aprovacoes" element={<Approvals />} />
          <Route path="*" element={<Navigate to="/calendario" replace />} />
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

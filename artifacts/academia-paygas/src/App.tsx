import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from './hooks/useAuth'
import { AppLayout } from './layouts/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { VerificarEmailPage } from './pages/VerificarEmailPage'
import { DashboardPage } from './pages/DashboardPage'
import { ModulosPage } from './pages/ModulosPage'
import { ModulosListPage } from './pages/ModulosListPage'
import { CertificadosPage } from './pages/CertificadosPage'
import { EquipePage } from './pages/EquipePage'
import { RelatoriosPage } from './pages/RelatoriosPage'
import { CMSPage } from './pages/CMSPage'
import { CriarModuloPage } from './pages/CriarModuloPage'
import { UsuariosPage } from './pages/UsuariosPage'
import { NotifPage } from './pages/NotifPage'
import { PerfilPage } from './pages/PerfilPage'
import { NacionalPage } from './pages/NacionalPage'
import { AnaliticaPage } from './pages/AnaliticaPage'
import { MapaPage } from './pages/MapaPage'
import { ForumPage } from './pages/ForumPage'
import { RankingPage } from './pages/RankingPage'
import { ConquistasPage } from './pages/ConquistasPage'
import './index.css'

const queryClient = new QueryClient()

function RoleRoute({ user, allowedRoles, children }: { user: any; allowedRoles: string[]; children: React.ReactNode }) {
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

function AppRoutes() {
  const { user, xp, isAuthenticated, handleLogin, handleLogout } = useAuth()

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <LoginPage onLogin={handleLogin} />
          }
        />
        <Route
          path="/verificar-email"
          element={<VerificarEmailPage />}
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute user={user}>
              <AppLayout user={user!} xp={xp} onLogout={handleLogout}>
                <Routes>
                  <Route path="/" element={<DashboardPage xp={xp} user={user} />} />
                  <Route path="/modulos" element={<ModulosListPage />} />
                  <Route path="/modulo/:moduloNombre" element={<ModulosPage />} />
                  <Route path="/certificados" element={<CertificadosPage />} />
                  <Route path="/conquistas" element={<ConquistasPage />} />
                  <Route path="/ranking" element={<RankingPage />} />
                  <Route path="/forum" element={<ForumPage />} />
                  <Route path="/equipe" element={
                    <RoleRoute user={user} allowedRoles={['ADMIN', 'GESTOR']}>
                      <EquipePage user={user!} />
                    </RoleRoute>
                  } />
                  <Route path="/relatorios" element={
                    <RoleRoute user={user} allowedRoles={['ADMIN', 'GESTOR']}>
                      <RelatoriosPage user={user!} />
                    </RoleRoute>
                  } />
                  <Route path="/nacional" element={
                    <RoleRoute user={user} allowedRoles={['ADMIN']}>
                      <NacionalPage />
                    </RoleRoute>
                  } />
                  <Route path="/analitica" element={
                    <RoleRoute user={user} allowedRoles={['ADMIN']}>
                      <AnaliticaPage />
                    </RoleRoute>
                  } />
                  <Route path="/mapa" element={
                    <RoleRoute user={user} allowedRoles={['ADMIN']}>
                      <MapaPage />
                    </RoleRoute>
                  } />
                  <Route path="/cms" element={<CMSPage user={user!} />} />
                  <Route path="/cms/criar-modulo" element={
                    <RoleRoute user={user} allowedRoles={['ADMIN']}>
                      <CriarModuloPage user={user!} />
                    </RoleRoute>
                  } />
                  <Route path="/usuarios" element={
                    <RoleRoute user={user} allowedRoles={['ADMIN', 'GESTOR']}>
                      <UsuariosPage user={user!} />
                    </RoleRoute>
                  } />
                  <Route path="/notif" element={<NotifPage user={user!} />} />
                  <Route path="/perfil" element={<PerfilPage user={user!} xp={xp} />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRoutes />
    </QueryClientProvider>
  )
}

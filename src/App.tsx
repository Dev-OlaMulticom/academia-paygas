import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { AppLayout } from './layouts/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ToastProvider } from './components/Toast'
import { ConfirmProvider } from './components/Toast'
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
import { ConquistasPage } from './pages/ConquistasPage'
import { LogsPage } from './pages/LogsPage'
import { XPConfigPage } from './pages/XPConfigPage'
import { TermosPage } from './pages/TermosPage'
import { PrivacidadePage } from './pages/PrivacidadePage'
import './index.css'

function RoleRoute({ user, allowedRoles, children }: { user: any; allowedRoles: string[]; children: React.ReactNode }) {
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

export default function App() {
  const { user, xp, isAuthenticated, checking, handleLogin, handleLogout } = useAuth()

  if (checking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--gray-500)' }}>
        Carregando...
      </div>
    )
  }

  return (
    <ToastProvider>
      <ConfirmProvider>
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
          path="/termos"
          element={<TermosPage />}
        />
        <Route
          path="/privacidade"
          element={<PrivacidadePage />}
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
                  <Route path="/conquistas" element={<ConquistasPage user={user!} />} />
                  <Route path="/logs" element={
                    <RoleRoute user={user} allowedRoles={['ADMIN']}>
                      <LogsPage user={user!} />
                    </RoleRoute>
                  } />
                  <Route path="/xp-config" element={
                    <RoleRoute user={user} allowedRoles={['ADMIN']}>
                      <XPConfigPage user={user!} />
                    </RoleRoute>
                  } />
                  <Route path="/perfil" element={<PerfilPage user={user!} xp={xp} />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
      </BrowserRouter>
      </ConfirmProvider>
    </ToastProvider>
  )
}

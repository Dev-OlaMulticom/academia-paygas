import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { AppLayout } from './layouts/AppLayout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { TrilhasPage } from './pages/TrilhasPage'
import { TrilhaModulosPage } from './pages/TrilhaModulosPage'
import { ModulosPage } from './pages/ModulosPage'
import { CertificadosPage } from './pages/CertificadosPage'
import { EquipePage } from './pages/EquipePage'
import { RelatoriosPage } from './pages/RelatoriosPage'
import { CMSPage } from './pages/CMSPage'
import { UsuariosPage } from './pages/UsuariosPage'
import { NotifPage } from './pages/NotifPage'
import { PerfilPage } from './pages/PerfilPage'
import './index.css'

export default function App() {
  const { user, xp, isAuthenticated, handleLogin, handleLogout, getMyTracks } = useAuth()
  const tracks = getMyTracks()

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
          path="/*"
          element={
            <ProtectedRoute user={user}>
              <AppLayout user={user!} xp={xp} tracksCount={tracks.length} onLogout={handleLogout}>
                <Routes>
                  <Route path="/" element={<DashboardPage xp={xp} tracks={tracks} />} />
                  <Route path="/trilhas" element={<TrilhasPage tracks={tracks} />} />
                  <Route path="/trilhas/:trilhaId" element={<TrilhaModulosPage />} />
                  <Route path="/modulos/:moduloId" element={<ModulosPage />} />
                  <Route path="/certificados" element={<CertificadosPage tracks={tracks} />} />
                  <Route path="/equipe" element={<EquipePage user={user!} />} />
                  <Route path="/relatorios" element={<RelatoriosPage user={user!} />} />
                  <Route path="/cms" element={<CMSPage user={user!} />} />
                  <Route path="/usuarios" element={<UsuariosPage user={user!} />} />
                  <Route path="/notif" element={<NotifPage user={user!} />} />
                  <Route path="/perfil" element={<PerfilPage user={user!} xp={xp} tracks={tracks} />} />
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

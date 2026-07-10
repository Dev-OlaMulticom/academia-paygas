import type React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ConfirmProvider, ToastProvider } from "./components/Toast";
import { useAuth } from "./hooks/useAuth";
import { AppLayout } from "./layouts/AppLayout";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AjudaPage } from "./pages/AjudaPage";
import { CertificadosPage } from "./pages/CertificadosPage";
import { CMSPage } from "./pages/CMSPage";
import { ConquistasPage } from "./pages/ConquistasPage";
import { CriarModuloPage } from "./pages/CriarModuloPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EquipePage } from "./pages/EquipePage";
import { ExImpPage } from "./pages/ExImpPage";
import { LoginPage } from "./pages/LoginPage";
import { LogsPage } from "./pages/LogsPage";
import { ModulosListPage } from "./pages/ModulosListPage";
import { ModulosPage } from "./pages/ModulosPage";
import { NotifPage } from "./pages/NotifPage";
import { PerfilPage } from "./pages/PerfilPage";
import { PrivacidadePage } from "./pages/PrivacidadePage";
import { QuizEditorPage } from "./pages/QuizEditorPage";
import { RelatoriosPage } from "./pages/RelatoriosPage";
import { TermosPage } from "./pages/TermosPage";
import { UsuariosPage } from "./pages/UsuariosPage";
import { VerificarEmailPage } from "./pages/VerificarEmailPage";
import { XPConfigPage } from "./pages/XPConfigPage";
import "./index.css";

function RoleRoute({ user, allowedRoles, children }: { user: any; allowedRoles: string[]; children: React.ReactNode }) {
	if (!user || !allowedRoles.includes(user.role)) {
		return <Navigate to="/" replace />;
	}
	return <>{children}</>;
}

export default function App() {
	const { user, xp, isAuthenticated, checking, handleLogin, handleLogout } = useAuth();

	if (checking) {
		return (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					height: "100vh",
					color: "var(--gray-500)",
				}}
			>
				Carregando...
			</div>
		);
	}

	return (
		<ToastProvider>
			<ConfirmProvider>
				<BrowserRouter>
					<Routes>
						<Route
							path="/login"
							element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage onLogin={handleLogin} />}
						/>
						<Route path="/verificar-email" element={<VerificarEmailPage />} />
						<Route path="/termos" element={<TermosPage />} />
						<Route path="/privacidade" element={<PrivacidadePage />} />
						<Route
							path="/*"
							element={
								<ProtectedRoute user={user}>
									<AppLayout user={user!} xp={xp} onLogout={handleLogout}>
										<Routes>
											<Route path="/" element={<DashboardPage xp={xp} user={user} />} />
											<Route path="/cursos" element={<ModulosListPage />} />
											<Route path="/curso/:cursoNombre" element={<ModulosPage />} />
											<Route path="/certificados" element={<CertificadosPage user={user} />} />
											<Route
												path="/equipe"
												element={
													<RoleRoute user={user} allowedRoles={["ADMIN", "GESTOR"]}>
														<EquipePage user={user!} />
													</RoleRoute>
												}
											/>
											<Route
												path="/relatorios"
												element={
													<RoleRoute user={user} allowedRoles={["ADMIN", "GESTOR"]}>
														<RelatoriosPage user={user!} />
													</RoleRoute>
												}
											/>
											<Route path="/cms" element={<CMSPage user={user!} />} />
											<Route
												path="/cms/criar-curso"
												element={
													<RoleRoute user={user} allowedRoles={["ADMIN"]}>
														<CriarModuloPage user={user!} />
													</RoleRoute>
												}
											/>
											<Route
												path="/cms/:cursoId/quiz/:aulaId"
												element={
													<RoleRoute user={user} allowedRoles={["ADMIN"]}>
														<QuizEditorPage user={user!} />
													</RoleRoute>
												}
											/>
											<Route
												path="/cms/ex-imp"
												element={
													<RoleRoute user={user} allowedRoles={["ADMIN"]}>
														<ExImpPage user={user!} />
													</RoleRoute>
												}
											/>
											<Route
												path="/usuarios"
												element={
													<RoleRoute user={user} allowedRoles={["ADMIN", "GESTOR"]}>
														<UsuariosPage user={user!} />
													</RoleRoute>
												}
											/>
											<Route path="/notif" element={<NotifPage user={user!} />} />
											<Route path="/conquistas" element={<ConquistasPage user={user!} />} />
											<Route
												path="/logs"
												element={
													<RoleRoute user={user} allowedRoles={["ADMIN"]}>
														<LogsPage user={user!} />
													</RoleRoute>
												}
											/>
											<Route
												path="/admin-dashboard"
												element={
													<RoleRoute user={user} allowedRoles={["ADMIN"]}>
														<AdminDashboardPage user={user!} />
													</RoleRoute>
												}
											/>
											<Route
												path="/xp-config"
												element={
													<RoleRoute user={user} allowedRoles={["ADMIN"]}>
														<XPConfigPage user={user!} />
													</RoleRoute>
												}
											/>
											<Route path="/perfil" element={<PerfilPage user={user!} xp={xp} />} />
											<Route path="/ajuda" element={<AjudaPage />} />
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
	);
}

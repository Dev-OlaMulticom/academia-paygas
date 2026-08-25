import { Suspense, lazy } from "react";
import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { PageSkeleton } from "./components/PageSkeleton";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ConfirmProvider, ToastProvider } from "./components/Toast";
import { useAuth } from "./hooks/useAuth";
import { AppLayout } from "./layouts/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import "./index.css";

const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage").then((m) => ({ default: m.AdminDashboardPage })));
const AjudaPage = lazy(() => import("./pages/AjudaPage").then((m) => ({ default: m.AjudaPage })));
const CertificadosPage = lazy(() => import("./pages/CertificadosPage").then((m) => ({ default: m.CertificadosPage })));
const CMSPage = lazy(() => import("./pages/CMSPage").then((m) => ({ default: m.CMSPage })));
const ConquistasPage = lazy(() => import("./pages/ConquistasPage").then((m) => ({ default: m.ConquistasPage })));
const CriarModuloPage = lazy(() => import("./pages/CriarModuloPage").then((m) => ({ default: m.CriarModuloPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const EquipePage = lazy(() => import("./pages/EquipePage").then((m) => ({ default: m.EquipePage })));
const ExImpPage = lazy(() => import("./pages/ExImpPage").then((m) => ({ default: m.ExImpPage })));
const LogsPage = lazy(() => import("./pages/LogsPage").then((m) => ({ default: m.LogsPage })));
const ModulosListPage = lazy(() => import("./pages/ModulosListPage").then((m) => ({ default: m.ModulosListPage })));
const ModulosPage = lazy(() => import("./pages/ModulosPage").then((m) => ({ default: m.ModulosPage })));
const NotifPage = lazy(() => import("./pages/NotifPage").then((m) => ({ default: m.NotifPage })));
const PerfilPage = lazy(() => import("./pages/PerfilPage").then((m) => ({ default: m.PerfilPage })));
const PrivacidadePage = lazy(() => import("./pages/PrivacidadePage").then((m) => ({ default: m.PrivacidadePage })));
const QuizEditorPage = lazy(() => import("./pages/QuizEditorPage").then((m) => ({ default: m.QuizEditorPage })));
const RelatoriosPage = lazy(() => import("./pages/RelatoriosPage").then((m) => ({ default: m.RelatoriosPage })));
const SsoCallbackPage = lazy(() => import("./pages/SsoCallbackPage").then((m) => ({ default: m.SsoCallbackPage })));
const TermosPage = lazy(() => import("./pages/TermosPage").then((m) => ({ default: m.TermosPage })));
const UsuariosPage = lazy(() => import("./pages/UsuariosPage").then((m) => ({ default: m.UsuariosPage })));
const VerificarEmailPage = lazy(() => import("./pages/VerificarEmailPage").then((m) => ({ default: m.VerificarEmailPage })));
const XPConfigPage = lazy(() => import("./pages/XPConfigPage").then((m) => ({ default: m.XPConfigPage })));

function RoleRoute({ user, allowedRoles, children }: { user: any; allowedRoles: string[]; children: ReactNode }) {
	if (!user || !allowedRoles.includes(user.role)) {
		return <Navigate to="/" replace />;
	}
	return <>{children}</>;
}

export default function App() {
	const { user, xp, isAuthenticated, checking, handleLogin, handleLogout } = useAuth();

	if (checking) {
		return <PageSkeleton />;
	}

	return (
		<ToastProvider>
			<ConfirmProvider>
				<BrowserRouter>
					<Suspense fallback={<PageSkeleton />}>
						<Routes>
							<Route
								path="/login"
								element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage onLogin={handleLogin} />}
							/>
							<Route path="/verificar-email" element={<VerificarEmailPage />} />
							<Route path="/sso/callback" element={<SsoCallbackPage onLogin={handleLogin} />} />
							<Route path="/termos" element={<TermosPage />} />
							<Route path="/privacidade" element={<PrivacidadePage />} />
							<Route
								path="/*"
								element={
									<ProtectedRoute user={user}>
										<AppLayout user={user!} xp={xp} onLogout={handleLogout}>
											<Suspense fallback={<PageSkeleton />}>
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
											</Suspense>
										</AppLayout>
									</ProtectedRoute>
								}
							/>
						</Routes>
					</Suspense>
				</BrowserRouter>
			</ConfirmProvider>
		</ToastProvider>
	);
}

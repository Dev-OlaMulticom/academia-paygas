// Visual-only constants (colors, icons, initials) - these are static design choices
export const ROLE_VISUALS: Record<string, { icon: string; color: string; initials: string }> = {
	ADMIN: { icon: "Globe", color: "#0A2E6E", initials: "SA" },
	GESTOR: { icon: "Fuel", color: "#D97706", initials: "GP" },
	ATENDENTE: { icon: "User", color: "#16A34A", initials: "AT" },
	PARCEIRO_ACREDITADO: { icon: "Star", color: "#8b5cf6", initials: "AD" },
	ERPS_REPRESENTANTE: { icon: "Chart", color: "#06b6d4", initials: "ER" },
};

// DEPRECATED: Use getRoleLabel() from role-labels.ts instead
// This is kept for backward compatibility during migration
export const ROLE_LABELS: Record<string, string> = {
	ADMIN: "SuperAdministrador",
	GESTOR: "Gestor / Líder",
	ATENDENTE: "Atendente/Frentista",
	PARCEIRO_ACREDITADO: "Administrador",
	ERPS_REPRESENTANTE: "ERPs Representante",
};

// DEPRECATED: Use ROLE_VISUALS instead
export const PERSONAS = {
	ADMIN: { label: "SuperAdministrador", ...ROLE_VISUALS.ADMIN },
	GESTOR: { label: "Gestor / Líder", ...ROLE_VISUALS.GESTOR },
	ATENDENTE: { label: "Atendente", ...ROLE_VISUALS.ATENDENTE },
	PARCEIRO_ACREDITADO: { label: "Administrador", ...ROLE_VISUALS.PARCEIRO_ACREDITADO },
	ERPS_REPRESENTANTE: { label: "ERPs Representante", ...ROLE_VISUALS.ERPS_REPRESENTANTE },
};

// Catalog of XP-awarding actions supported by the backend (awardXp/awardXpOnce).
// Actions without a DB config row use the server-side default values.
export const XP_ACTIONS: { action: string; label: string; description: string; defaultXp: number }[] = [
	{ action: "MODULE_OPEN", label: "Abrir módulo", description: "XP ao abrir um módulo/curso", defaultXp: 0.05 },
	{
		action: "QUIZ_PASS",
		label: "Aprovar quiz",
		description: "XP ao atingir a nota mínima do quiz",
		defaultXp: 2.0,
	},
	{ action: "LESSON_COMPLETE", label: "Concluir lição", description: "XP ao concluir uma lição", defaultXp: 1.0 },
	{
		action: "MODULE_COMPLETE",
		label: "Concluir módulo",
		description: "XP ao concluir todas as lições de um módulo",
		defaultXp: 5.0,
	},
	{
		action: "NOTIFICATION_READ",
		label: "Ler notificação",
		description: "XP ao marcar uma notificação como lida",
		defaultXp: 0.05,
	},
	{ action: "LOGIN", label: "Login diário", description: "XP ao fazer login (1x por dia)", defaultXp: 0.05 },
	{
		action: "CERTIFICATE",
		label: "Obter certificado",
		description: "XP ao receber certificado de conclusão",
		defaultXp: 10.0,
	},
	{ action: "QUIZ_CORRECT", label: "Acertar questão", description: "XP por resposta correta em quiz", defaultXp: 0.5 },
	{ action: "LESSON_VIEW", label: "Visualizar lição", description: "XP ao abrir uma lição", defaultXp: 0.1 },
];

export const ROLE_COLORS: Record<string, string> = {
	ADMIN: "var(--pg-red)",
	GESTOR: "var(--pg-gold)",
	ATENDENTE: "var(--pg-green)",
	PARCEIRO_ACREDITADO: "#8b5cf6",
	ERPS_REPRESENTANTE: "#06b6d4",
};

export const ROLE_CSS_CLASSES: Record<string, string> = {
	ADMIN: "admin",
	GESTOR: "gestor",
	ATENDENTE: "atendente",
	PARCEIRO_ACREDITADO: "parceiro",
	ERPS_REPRESENTANTE: "erps",
};

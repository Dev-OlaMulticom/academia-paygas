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

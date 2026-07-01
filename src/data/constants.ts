export const PERSONAS = {
	ADMIN: { label: "Administrador", icon: "Globe", color: "#0A2E6E", initials: "AD" },
	GESTOR: { label: "Gestor / Líder", icon: "Fuel", color: "#D97706", initials: "GP" },
	ATENDENTE: { label: "Atendente", icon: "User", color: "#16A34A", initials: "AT" },
	PARCEIRO_ACREDITADO: { label: "Parceiro Acreditado", icon: "Star", color: "#8b5cf6", initials: "PA" },
	ERPS_REPRESENTANTE: { label: "ERPs Representante", icon: "Chart", color: "#06b6d4", initials: "ER" },
};

export const ROLE_LABELS: Record<string, string> = {
	ADMIN: "Administrador",
	GESTOR: "Gestor / Líder",
	ATENDENTE: "Atendente/Frentista",
	PARCEIRO_ACREDITADO: "Parceiro Acreditado",
	ERPS_REPRESENTANTE: "ERPs Representante",
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

/**
 * Frontend CASL Ability builder — database-driven.
 *
 * Fetches permission rules from /api/role-permissions on login and caches them.
 * Falls back to hardcoded rules if the API is unreachable.
 *
 * IMPORTANT: Backend is always the source of truth.
 * This is only for UI hints — never trust client-side abilities for security.
 *
 * The Actions / Subjects constant lists come from `shared/casl/actions.ts`
 * so that frontend and backend can't diverge.
 */
import { SHARED_ACTION_OBJECT, SHARED_ACTIONS, SHARED_SUBJECT_OBJECT, SHARED_SUBJECTS } from "@shared/casl/actions";

/**
 * Actions available in the system — re-exported for component ergonomics.
 */
export const Actions = SHARED_ACTION_OBJECT;
export type Action = (typeof SHARED_ACTION_OBJECT)[keyof typeof SHARED_ACTION_OBJECT];

/**
 * Subjects (entities) available in the system.
 */
export const Subjects = SHARED_SUBJECT_OBJECT;
export type Subject = (typeof SHARED_SUBJECT_OBJECT)[keyof typeof SHARED_SUBJECT_OBJECT];

// Type guards pointing at the canonical string lists — used by tests and
// runtime validation to make sure no caller ever invents an unknown token.
export const KNOWN_ACTIONS = SHARED_ACTIONS;
export const KNOWN_SUBJECTS = SHARED_SUBJECTS;

interface AbilityRule {
	action: string;
	subject: string;
	conditions?: Record<string, any>;
}

interface FrontendUser {
	id?: string;
	role: string;
	gestorId?: string | null;
}

/**
 * Hardcoded fallback rules (used when DB is unreachable).
 */
const FALLBACK_RULES: Record<string, AbilityRule[]> = {
	ADMIN: [{ action: "manage", subject: "all" }],
	GESTOR: [
		{ action: "read", subject: "User" },
		{ action: "update", subject: "User", conditions: { gestorId: "__userId__" } },
		{ action: "create", subject: "User", conditions: { role: "ATENDENTE" } },
		{ action: "viewTeam", subject: "Team" },
		{ action: "sendNotification", subject: "Notification" },
		{ action: "read", subject: "Notification" },
		{ action: "read", subject: "Certificate" },
		{ action: "approveCertificate", subject: "Certificate" },
		{ action: "issueCertificate", subject: "Certificate" },
		{ action: "read", subject: "Modulo" },
		{ action: "read", subject: "Aula" },
		{ action: "read", subject: "Licao" },
		{ action: "read", subject: "PointsTransaction" },
		{ action: "read", subject: "Conquista" },
		{ action: "read", subject: "Progresso" },
	],
	ATENDENTE: [
		{ action: "read", subject: "User", conditions: { id: "__userId__" } },
		{ action: "update", subject: "User", conditions: { id: "__userId__" } },
		{ action: "read", subject: "Progresso" },
		{ action: "update", subject: "Progresso" },
		{ action: "read", subject: "Certificate" },
		{ action: "create", subject: "Certificate" },
		{ action: "read", subject: "Notification" },
		{ action: "read", subject: "Modulo" },
		{ action: "read", subject: "Aula" },
		{ action: "read", subject: "Licao" },
		{ action: "read", subject: "Quiz" },
		{ action: "create", subject: "Quiz" },
		{ action: "read", subject: "PointsTransaction" },
		{ action: "read", subject: "Conquista" },
		{ action: "read", subject: "ForumPost" },
		{ action: "create", subject: "ForumPost" },
	],
	PARCEIRO_ACREDITADO: [
		{ action: "read", subject: "User", conditions: { id: "__userId__" } },
		{ action: "update", subject: "User", conditions: { id: "__userId__" } },
		{ action: "read", subject: "Progresso" },
		{ action: "update", subject: "Progresso" },
		{ action: "read", subject: "Certificate" },
		{ action: "create", subject: "Certificate" },
		{ action: "read", subject: "Notification" },
		{ action: "read", subject: "Modulo" },
		{ action: "read", subject: "Aula" },
		{ action: "read", subject: "Licao" },
		{ action: "read", subject: "Quiz" },
		{ action: "create", subject: "Quiz" },
		{ action: "read", subject: "PointsTransaction" },
		{ action: "read", subject: "Conquista" },
		{ action: "read", subject: "ForumPost" },
		{ action: "create", subject: "ForumPost" },
	],
	ERPS_REPRESENTANTE: [
		{ action: "read", subject: "User", conditions: { id: "__userId__" } },
		{ action: "update", subject: "User", conditions: { id: "__userId__" } },
		{ action: "read", subject: "Progresso" },
		{ action: "update", subject: "Progresso" },
		{ action: "read", subject: "Certificate" },
		{ action: "create", subject: "Certificate" },
		{ action: "read", subject: "Notification" },
		{ action: "read", subject: "Modulo" },
		{ action: "read", subject: "Aula" },
		{ action: "read", subject: "Licao" },
		{ action: "read", subject: "Quiz" },
		{ action: "create", subject: "Quiz" },
		{ action: "read", subject: "PointsTransaction" },
		{ action: "read", subject: "Conquista" },
		{ action: "read", subject: "ForumPost" },
		{ action: "create", subject: "ForumPost" },
	],
};

/**
 * In-memory cache for DB-fetched permissions, keyed by role.
 */
let dbPermissionsCache: Record<string, AbilityRule[]> = {};

/**
 * Load permissions from the API for the current user's role.
 * Skips if already cached (deduplication across multiple useAbility consumers).
 * Falls back to hardcoded on error.
 */
let loadRolePermissionsPromise: Promise<void> | null = null;

export async function loadRolePermissions(): Promise<void> {
	const token = localStorage.getItem("token") || "";
	if (!token) return;

	// Get current role from stored user to check cache
	try {
		const stored = localStorage.getItem("user");
		if (stored) {
			const userData = JSON.parse(stored);
			if (userData.role && dbPermissionsCache[userData.role]) {
				return; // Already cached — skip API call
			}
		}
	} catch {
		// Continue to fetch
	}

	// Deduplicate concurrent calls (e.g. AppLayout + DashboardPage mount simultaneously)
	if (loadRolePermissionsPromise) return loadRolePermissionsPromise;

	loadRolePermissionsPromise = (async () => {
		try {
			const res = await fetch("/api/role-permissions", {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (res.ok) {
				const data = await res.json();
				if (data.role && Array.isArray(data.permissions)) {
					dbPermissionsCache[data.role] = data.permissions;
				}
			}
		} catch {
			// Fallback: will use hardcoded rules
		} finally {
			loadRolePermissionsPromise = null;
		}
	})();

	return loadRolePermissionsPromise;
}

/**
 * Load all role configs (for admin UI / role labels).
 * Called on login for admin users.
 */
export async function loadAllRoleConfigs(): Promise<void> {
	try {
		const token = localStorage.getItem("token");
		if (!token) return;

		const res = await fetch("/api/role-permissions/all", {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (res.ok) {
			const data = await res.json();
			if (Array.isArray(data)) {
				// Store role labels in a separate cache for UI components
				const roleLabelsCache: Record<string, string> = {};
				for (const rc of data) {
					if (rc.role && rc.label) {
						roleLabelsCache[rc.role] = rc.label;
					}
				}
				// Store in localStorage for sync access across components
				localStorage.setItem("roleLabels", JSON.stringify(roleLabelsCache));
			}
		}
	} catch {
		// Fallback: will use hardcoded labels
	}
}

/**
 * Clear cached permissions (call on logout).
 */
export function clearRolePermissionsCache(): void {
	dbPermissionsCache = {};
}

/**
 * Resolve condition placeholders with actual values.
 */
function resolveConditions(
	conditions: Record<string, any> | undefined,
	userId?: string,
	gestorId?: string | null,
): Record<string, any> | undefined {
	if (!conditions) return undefined;

	const resolved: Record<string, any> = {};
	for (const [key, value] of Object.entries(conditions)) {
		if (value === "__userId__") {
			resolved[key] = userId;
		} else if (value === "__gestorId__") {
			resolved[key] = gestorId;
		} else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
			resolved[key] = resolveConditions(value, userId, gestorId) || value;
		} else {
			resolved[key] = value;
		}
	}
	return resolved;
}

function buildRules(user: FrontendUser | null): AbilityRule[] {
	if (!user) return [];

	// Try DB cache first, fall back to hardcoded
	let rules = dbPermissionsCache[user.role];
	if (!rules) {
		rules = FALLBACK_RULES[user.role] || [];
	}

	// Resolve condition placeholders
	return rules.map((rule) => ({
		...rule,
		conditions: resolveConditions(rule.conditions, user.id, user.gestorId),
	}));
}

/**
 * Simple ability object with can/cannot methods.
 */
export interface FrontendAbility {
	can: (action: string, subject: string, conditions?: Record<string, any>) => boolean;
	cannot: (action: string, subject: string, conditions?: Record<string, any>) => boolean;
}

export function defineFrontendAbility(user: FrontendUser | null): FrontendAbility {
	const rules = buildRules(user);

	return {
		can(action: string, subject: string, conditions?: Record<string, any>): boolean {
			// Wildcard: 'manage' on 'all' matches everything
			if (rules.some((r) => r.action === "manage" && r.subject === "all")) return true;

			// Check if any rule matches
			return rules.some((rule) => {
				if (rule.action !== action) return false;
				if (rule.subject !== subject && rule.subject !== "all") return false;
				// If rule has conditions, they must match (simplified check)
				if (rule.conditions && conditions) {
					return Object.keys(rule.conditions).every((key) => rule.conditions![key] === conditions[key]);
				}
				if (rule.conditions && !conditions) return false;
				return true;
			});
		},

		cannot(action: string, subject: string, conditions?: Record<string, any>): boolean {
			return !this.can(action, subject, conditions);
		},
	};
}

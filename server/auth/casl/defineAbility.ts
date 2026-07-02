/**
 * defineAbility — the central CASL ability builder.
 *
 * Reads permission rules from the RoleConfig database table.
 * Falls back to hardcoded rules if the DB is unreachable.
 *
 * To add a new role: just INSERT into RoleConfig. No code changes needed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let AbilityBuilder: any;
let AbilityClass: any;
try {
	const casl = require("@casl/ability");
	AbilityBuilder = casl.AbilityBuilder;
	AbilityClass = casl.Ability;
} catch {
	// CASL not installed — fallback will be used
}

import { getRolePermissions, resolveConditions } from "../../services/role-permissions";

export interface CaslUser {
	id: string;
	role: string;
	gestorId?: string | null;
}

/**
 * Fallback rules used when the DB is unreachable.
 * Mirrors the seed data for all roles.
 */
const FALLBACK_RULES: Record<string, Array<{ action: string; subject: string; conditions?: Record<string, any> }>> = {
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
		{ action: "read", subject: "Curso" },
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
		{ action: "read", subject: "Curso" },
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
		{ action: "read", subject: "Curso" },
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
		{ action: "read", subject: "Curso" },
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
 * Build an ability instance from a user context.
 * Reads rules from RoleConfig table, falls back to hardcoded if DB is down.
 */
export async function defineAbility(user: CaslUser): Promise<any> {
	let rules = await getRolePermissions(user.role);

	// Fallback to hardcoded if DB returns nothing for this role
	if (rules.length === 0 && FALLBACK_RULES[user.role]) {
		rules = FALLBACK_RULES[user.role];
	}

	// If CASL is not installed, return a permissive ability for ADMIN, restrictive for others
	if (!AbilityBuilder || !AbilityClass) {
		return {
			can: (_action: string, _subject: string) => user.role === "ADMIN",
			cannot: (_action: string, _subject: string) => user.role !== "ADMIN",
			rules: [],
		};
	}

	const { can, build } = new AbilityBuilder(AbilityClass);

	for (const rule of rules) {
		const resolvedConditions = resolveConditions(rule.conditions, user.id, user.gestorId);
		can(rule.action, rule.subject, resolvedConditions);
	}

	return build();
}

/**
 * Quick permission check helper.
 */
export async function checkCan(
	user: CaslUser,
	action: string,
	subject: string,
	conditions?: Record<string, any>,
): Promise<boolean> {
	const ability = await defineAbility(user);
	if (conditions) {
		return ability.can(action, subject, conditions);
	}
	return ability.can(action, subject);
}

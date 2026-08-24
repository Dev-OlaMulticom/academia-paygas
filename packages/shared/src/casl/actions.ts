/**
 * Shared CASL action definitions — single source of truth.
 *
 * This module is imported by:
 *   - server: server/auth/casl/actions.ts (and subjects.ts)
 *   - client: src/auth/casl/ability.ts (via @shared/casl/actions)
 *
 * Tests in `tests/casl.test.mjs` assert that the values are coherent across
 * these consumers — one single check prevents drift.
 */
export const SHARED_ACTIONS = [
	"create",
	"read",
	"update",
	"delete",
	"manage",
	"assignRole",
	"sendNotification",
	"approveCertificate",
	"issueCertificate",
	"viewTeam",
	"exportData",
	"deleteActivityLog",
	"deleteNotification",
	"deleteXPConfig",
] as const;

export type SharedAction = (typeof SHARED_ACTIONS)[number];

export const SHARED_ACTION_OBJECT = {
	create: "create",
	read: "read",
	update: "update",
	delete: "delete",
	manage: "manage",
	assignRole: "assignRole",
	sendNotification: "sendNotification",
	approveCertificate: "approveCertificate",
	issueCertificate: "issueCertificate",
	viewTeam: "viewTeam",
	exportData: "exportData",
	deleteActivityLog: "deleteActivityLog",
	deleteNotification: "deleteNotification",
	deleteXPConfig: "deleteXPConfig",
} as const;

export const SHARED_SUBJECTS = [
	"User",
	"Curso",
	"Aula",
	"Licao",
	"Quiz",
	"QuizPergunta",
	"QuizResponse",
	"Progresso",
	"Certificate",
	"Notification",
	"ActivityLog",
	"PointsTransaction",
	"ForumPost",
	"ModuleConfig",
	"XPConfig",
	"Conquista",
	"UserConquista",
	"Team",
	"Message",
	"Dashboard",
	"all",
] as const;

export type SharedSubject = (typeof SHARED_SUBJECTS)[number];

export const SHARED_SUBJECT_OBJECT = {
	User: "User",
	Curso: "Curso",
	Aula: "Aula",
	Licao: "Licao",
	Quiz: "Quiz",
	QuizPergunta: "QuizPergunta",
	QuizResponse: "QuizResponse",
	Progresso: "Progresso",
	Certificate: "Certificate",
	Notification: "Notification",
	ActivityLog: "ActivityLog",
	PointsTransaction: "PointsTransaction",
	ForumPost: "ForumPost",
	ModuleConfig: "ModuleConfig",
	XPConfig: "XPConfig",
	Conquista: "Conquista",
	UserConquista: "UserConquista",
	Team: "Team",
	Message: "Message",
	Dashboard: "Dashboard",
	All: "all",
} as const;

/**
 * CASL Subjects — centralized subject definitions.
 * Each subject maps to a Prisma model or domain concept.
 */
export const Subjects = {
	User: "User",
	Modulo: "Modulo",
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

export type Subject = (typeof Subjects)[keyof typeof Subjects];

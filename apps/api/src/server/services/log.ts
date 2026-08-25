import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";

export async function logActivity(userId: string, acao: string, detalhes?: string): Promise<void> {
	try {
		await drizzleDb.create("activityLog", { userId, acao, detalhes });
	} catch (error) {
		logger.error("[LOG ACTIVITY ERROR]", error);
	}
}

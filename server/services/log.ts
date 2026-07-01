import { db } from "../lib/db";
import logger from "../lib/logger";

export async function logActivity(userId: string, acao: string, detalhes?: string): Promise<void> {
	try {
		await db.create("activityLog", { userId, acao, detalhes });
	} catch (error) {
		logger.error("[LOG ACTIVITY ERROR]", error);
	}
}

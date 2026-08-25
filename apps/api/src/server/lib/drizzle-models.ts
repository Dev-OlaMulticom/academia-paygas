import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { dbRegistry, type DatabaseEntry } from "../config/databases";
import logger from "./logger";
import * as schema from "../../../../../packages/db/drizzle/pg/schema";

export type DrizzleDb = NodePgDatabase<typeof schema>;

const clientCache = new Map<string, DrizzleDb>();

export const TABLES: Record<string, any> = {
	user: schema.user,
	estabelecimento: schema.estabelecimento,
	curso: schema.curso,
	aula: schema.aula,
	licao: schema.licao,
	quiz: schema.quiz,
	quizPergunta: schema.quizPergunta,
	quizResponse: schema.quizResponse,
	progresso: schema.progresso,
	certificate: schema.certificate,
	notification: schema.notification,
	activityLog: schema.activityLog,
	pointsTransaction: schema.pointsTransaction,
	forumPost: schema.forumPost,
	moduleConfig: schema.moduleConfig,
	xpConfig: schema.xpConfig,
	roleConfig: schema.roleConfig,
	conquista: schema.conquista,
	userConquista: schema.userConquista,
};

function getDrizzleClient(entry: DatabaseEntry): DrizzleDb | null {
	if (!entry.pool) return null;
	const cached = clientCache.get(entry.name);
	if (cached) return cached;
	try {
		const db = drizzle({ client: entry.pool, schema });
		clientCache.set(entry.name, db);
		return db;
	} catch (error: any) {
		logger.error(`[DRIZZLE] Failed to create client for ${entry.name}:`, error.message);
		return null;
	}
}

export interface DrizzleModelDelegate {
	db: DrizzleDb;
	table: any;
	name: string;
	dbName: string;
}

export interface DrizzleModelDelegates {
	primary: DrizzleModelDelegate;
	backups: DrizzleModelDelegate[];
	mysql: null;
}

export function getDrizzleModelDelegates(modelName: string): DrizzleModelDelegates {
	const table = TABLES[modelName];
	if (!table) {
		throw new Error(`[DRIZZLE] Unknown model: "${modelName}"`);
	}

	const all = dbRegistry.getAll();
	if (all.length === 0) {
		throw new Error("[DRIZZLE] No databases registered. Set PG_URL_1 or DATABASE_URL");
	}

	const primaryEntry = dbRegistry.getPrimary() ?? all[0];
	if (!primaryEntry.pool) {
		throw new Error(`[DRIZZLE] Primary ${primaryEntry.name} has no pool`);
	}
	const primaryDb = getDrizzleClient(primaryEntry);
	if (!primaryDb) {
		throw new Error(`[DRIZZLE] Primary ${primaryEntry.name} client could not be created`);
	}

	const backups: DrizzleModelDelegate[] = [];
	for (const entry of all) {
		if (entry.name === primaryEntry.name) continue;
		const db = getDrizzleClient(entry);
		if (db) backups.push({ db, table, name: modelName, dbName: entry.name });
	}

	return { primary: { db: primaryDb, table, name: modelName, dbName: primaryEntry.name }, backups, mysql: null };
}

export function invalidateDrizzleDelegateCache(): void {
	clientCache.clear();
}

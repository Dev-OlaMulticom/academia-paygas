/**
 * Sync all data from PostgreSQL to MySQL
 * Run with: tsx prisma/sync-mysql.ts
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/mysql";

const pgClient = new PrismaClient({
	adapter: new PrismaPg({ connectionString: process.env.PG_URL_1 || process.env.DATABASE_URL }),
});

const mysqlClient = new PrismaClient({
	adapter: (() => {
		const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
		const url = new URL(process.env.MYSQL_URL || "mysql://root:@localhost:3306/academia_paygas");
		return new PrismaMariaDb({
			host: url.hostname,
			port: parseInt(url.port || "3306", 10),
			user: url.username || "root",
			password: url.password || "",
			database: url.pathname.replace("/", "") || undefined,
			connectionLimit: 5,
		});
	})(),
});

const TABLES = [
	{
		name: "Estabelecimento",
		pg: () => pgClient.estabelecimento.findMany(),
		insert: (d: any) => mysqlClient.estabelecimento.createMany({ data: d }),
	},
	{ name: "User", pg: () => pgClient.user.findMany(), insert: (d: any) => mysqlClient.user.createMany({ data: d }) },
	{
		name: "Curso",
		pg: () => pgClient.curso.findMany(),
		insert: (d: any) => mysqlClient.curso.createMany({ data: d }),
	},
	{ name: "Aula", pg: () => pgClient.aula.findMany(), insert: (d: any) => mysqlClient.aula.createMany({ data: d }) },
	{ name: "Licao", pg: () => pgClient.licao.findMany(), insert: (d: any) => mysqlClient.licao.createMany({ data: d }) },
	{ name: "Quiz", pg: () => pgClient.quiz.findMany(), insert: (d: any) => mysqlClient.quiz.createMany({ data: d }) },
	{
		name: "QuizPergunta",
		pg: () => pgClient.quizPergunta.findMany(),
		insert: (d: any) => mysqlClient.quizPergunta.createMany({ data: d }),
	},
	{
		name: "QuizResponse",
		pg: () => pgClient.quizResponse.findMany(),
		insert: (d: any) => mysqlClient.quizResponse.createMany({ data: d }),
	},
	{
		name: "Progresso",
		pg: () => pgClient.progresso.findMany(),
		insert: (d: any) => mysqlClient.progresso.createMany({ data: d }),
	},
	{
		name: "Certificate",
		pg: () => pgClient.certificate.findMany(),
		insert: (d: any) => mysqlClient.certificate.createMany({ data: d }),
	},
	{
		name: "Notification",
		pg: () => pgClient.notification.findMany(),
		insert: (d: any) => mysqlClient.notification.createMany({ data: d }),
	},
	{
		name: "ActivityLog",
		pg: () => pgClient.activityLog.findMany(),
		insert: (d: any) => mysqlClient.activityLog.createMany({ data: d }),
	},
	{
		name: "PointsTransaction",
		pg: () => pgClient.pointsTransaction.findMany(),
		insert: (d: any) => mysqlClient.pointsTransaction.createMany({ data: d }),
	},
	{
		name: "ForumPost",
		pg: () => pgClient.forumPost.findMany(),
		insert: (d: any) => mysqlClient.forumPost.createMany({ data: d }),
	},
	{
		name: "ModuleConfig",
		pg: () => pgClient.moduleConfig.findMany(),
		insert: (d: any) => mysqlClient.moduleConfig.createMany({ data: d }),
	},
	{
		name: "XPConfig",
		pg: () => pgClient.xPConfig.findMany(),
		insert: (d: any) => mysqlClient.xPConfig.createMany({ data: d }),
	},
	{
		name: "Conquista",
		pg: () => pgClient.conquista.findMany(),
		insert: (d: any) => mysqlClient.conquista.createMany({ data: d }),
	},
	{
		name: "UserConquista",
		pg: () => pgClient.userConquista.findMany(),
		insert: (d: any) => mysqlClient.userConquista.createMany({ data: d }),
	},
];

async function syncTable(table: (typeof TABLES)[0]) {
	try {
		process.stdout.write(`  ${table.name}... `);
		const data = await table.pg();
		if (data.length === 0) {
			console.log("empty, skipped");
			return;
		}
		// Remove any enum-like fields that MySQL might not accept directly
		const cleanData = data.map((row: any) => {
			const clean = { ...row };
			// Remove computed/readonly fields
			delete clean._count;
			return clean;
		});
		await table.insert(cleanData);
		console.log(`${data.length} rows synced`);
	} catch (error: any) {
		console.log(`FAILED: ${error.message}`);
	}
}

async function main() {
	console.log("=== PostgreSQL → MySQL Sync ===\n");

	// Test connections
	try {
		await pgClient.$queryRaw`SELECT 1`;
		console.log("PG connection: OK");
	} catch (error: any) {
		console.error("PG connection FAILED:", error.message);
		process.exit(1);
	}

	try {
		await mysqlClient.$queryRaw`SELECT 1`;
		console.log("MySQL connection: OK");
	} catch (error: any) {
		console.error("MySQL connection FAILED:", error.message);
		console.error("Make sure MySQL is running and MYSQL_URL is configured in .env");
		process.exit(1);
	}

	console.log("\nSyncing tables...");

	// Sync in order (respect foreign keys)
	for (const table of TABLES) {
		await syncTable(table);
	}

	console.log("\n=== Sync complete ===");
	await pgClient.$disconnect();
	await mysqlClient.$disconnect();
}

main().catch((error) => {
	console.error("Sync failed:", error);
	process.exit(1);
});

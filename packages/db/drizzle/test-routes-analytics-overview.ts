import "dotenv/config";
import { drizzleDb } from "../../../apps/api/src/server/lib/drizzle-db";

async function main() {
	const now = new Date();
	const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

	const [totalUsers, totalAulas, _totalProgressos, totalCertificates, quizzesAprovados] = await Promise.all([
		drizzleDb.count("user"),
		drizzleDb.count("aula"),
		drizzleDb.count("progresso", { concluido: true }),
		drizzleDb.count("certificate"),
		drizzleDb.count("quizResponse", { concluido: true }),
	]);

	const totalModulos = await drizzleDb.count("curso");
	const progressosMes = await drizzleDb.count("progresso", { createdAt: { $gte: thirtyDaysAgo } });
	const usersMes = await drizzleDb.count("user", { createdAt: { $gte: thirtyDaysAgo } });

	console.log("[DRIZZLE-ANALYTICS-OVERVIEW]", {
		totalUsers,
		totalModulos,
		totalAulas,
		totalCertificates,
		quizzesAprovados,
		progressosMes,
		usersMes,
	});

	console.log("[DRIZZLE-ANALYTICS-OVERVIEW] all checks OK");
}

main().catch((err: any) => {
	console.error("[DRIZZLE-ANALYTICS-OVERVIEW] FAIL:", err?.message || err);
	process.exit(1);
});

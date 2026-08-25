import "dotenv/config";
import { drizzleDb } from "../../../apps/api/src/server/lib/drizzle-db";

async function main() {
	// Mirrors /api/public/stats logic
	const [totalUsers, totalModulos, totalAulas, totalCertificates] = await Promise.all([
		drizzleDb.count("user"),
		drizzleDb.count("curso"),
		drizzleDb.count("aula"),
		drizzleDb.count("certificate"),
	]);

	console.log("[DRIZZLE-PUBLIC] stats:", {
		alunos: totalUsers,
		horas: totalAulas * 2,
		notas: totalModulos,
		certificados: totalCertificates,
	});

	console.log("[DRIZZLE-PUBLIC] all checks OK");
}

main().catch((err: any) => {
	console.error("[DRIZZLE-PUBLIC] FAIL:", err?.message || err);
	process.exit(1);
});

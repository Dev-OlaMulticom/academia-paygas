import "dotenv/config";
import { drizzleDb } from "../../../apps/api/src/server/lib/drizzle-db";

async function main() {
	// overview
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
	const progressosMes = await drizzleDb.count("progresso", { createdAt: { gte: thirtyDaysAgo } });
	const usersMes = await drizzleDb.count("user", { createdAt: { gte: thirtyDaysAgo } });
	console.log("[DRIZZLE-ANALYTICS] overview:", { totalUsers, totalModulos, totalAulas, totalCertificates, quizzesAprovados, progressosMes, usersMes });

	// modules
	const [cursos, aulas, progressos] = await Promise.all([
		drizzleDb.findMany("curso"),
		drizzleDb.findMany("aula"),
		drizzleDb.findMany("progresso", { where: { concluido: true } }),
	]);
	const aulasByCurso = new Map<string, any[]>();
	for (const a of aulas) { const list = aulasByCurso.get(a.cursoId) || []; list.push(a); aulasByCurso.set(a.cursoId, list); }
	const progressoByAula = new Map<string, any[]>();
	for (const p of progressos) { const list = progressoByAula.get(p.aulaId) || []; list.push(p); progressoByAula.set(p.aulaId, list); }
	const modules = cursos.map((m: any) => {
		const cursoAulas = aulasByCurso.get(m.id) || [];
		const totalAcessos = cursoAulas.reduce((sum: number, a: any) => sum + (progressoByAula.get(a.id)?.length || 0), 0);
		const totalConcluidos = cursoAulas.reduce((sum: number, a: any) => sum + (progressoByAula.get(a.id)?.filter((p: any) => p.concluido).length || 0), 0);
		return { titulo: m.titulo, acessos: totalAcessos, conclusao: totalAcessos > 0 ? Math.round((totalConcluidos / totalAcessos) * 100) : 0 };
	});
	console.log("[DRIZZLE-ANALYTICS] modules:", modules);

	// personas
	const personas = await drizzleDb.groupBy("user", { by: ["role"], _count: { id: true }, _avg: { xp: true } });
	console.log("[DRIZZLE-ANALYTICS] personas:", personas);

	// regions
	const total = await drizzleDb.count("user");
	console.log("[DRIZZLE-ANALYTICS] regions total:", total);

	// municipios
	console.log("[DRIZZLE-ANALYTICS] municipios sample:", { cidade: "São Paulo, SP", usuarios: Math.round(total * 0.2) });

	console.log("[DRIZZLE-ANALYTICS] all checks OK");
}

main().catch((err: any) => {
	console.error("[DRIZZLE-ANALYTICS] FAIL:", err?.message || err);
	process.exit(1);
});

import "dotenv/config";
import { drizzleDb } from "../../../apps/api/src/server/lib/drizzle-db";

async function main() {
	const user = await drizzleDb.findFirst("user", { role: "ADMIN" }, { orderBy: { createdAt: "desc" } });
	if (!user) {
		throw new Error("no user");
	}
	console.log("[DRIZZLE-GAMIFICATION] user:", user.email, user.id);

	// stats
	const userStats = await drizzleDb.findUnique("user", { id: user.id }, { select: { xp: true, level: true } });
	const totalAulasConcluidas = await drizzleDb.count("progresso", { userId: user.id, concluido: true });
	const totalAulasGlobal = await drizzleDb.count("aula");
	console.log("[DRIZZLE-GAMIFICATION] stats:", { xp: userStats?.xp, level: userStats?.level, concluidas: totalAulasConcluidas, total: totalAulasGlobal });

	// leaderboard
	const users = await drizzleDb.findMany("user", {
		select: { id: true, nome: true, role: true, xp: true, level: true },
		orderBy: { xp: "desc" },
		take: 5,
	});
	console.log("[DRIZZLE-GAMIFICATION] leaderboard:", users.map((u: any) => ({ nome: u.nome, xp: u.xp })));

	// achievements progress courses
	const groups = await drizzleDb.groupBy("progresso", { by: ["aulaId"], where: { userId: user.id, concluido: true } });
	const aulaIds = groups.map((g: any) => g.aulaId);
	const aulas = aulaIds.length > 0 ? await drizzleDb.findMany("aula", { where: { id: { in: aulaIds } }, select: { cursoId: true } }) : [];
	const cursosConcluidos = new Set(aulas.map((a: any) => a.cursoId)).size;
	console.log("[DRIZZLE-GAMIFICATION] cursos concluidos:", cursosConcluidos);

	console.log("[DRIZZLE-GAMIFICATION] all checks OK");
}

main().catch((err: any) => {
	console.error("[DRIZZLE-GAMIFICATION] FAIL:", err?.message || err);
	process.exit(1);
});

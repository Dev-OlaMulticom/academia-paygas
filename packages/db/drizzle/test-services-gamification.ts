import "dotenv/config";
import { drizzleDb } from "../../../apps/api/src/server/lib/drizzle-db";
import { getUserPoints, getTeamPoints } from "../../../apps/api/src/server/services/gamification";

async function main() {
	const user = await drizzleDb.findFirst("user", { role: "ADMIN" }, { orderBy: { createdAt: "desc" } });
	if (!user) throw new Error("no admin user");

	const userPoints = await getUserPoints(user.id);
	console.log("[DRIZZLE-SERVICES] getUserPoints:", {
		totalXp: userPoints.totalXp,
		level: userPoints.level,
		transactionsCount: userPoints.transactions.length,
		byActionCount: userPoints.byAction.length,
	});

	const teamPoints = await getTeamPoints();
	console.log("[DRIZZLE-SERVICES] getTeamPoints (all):", {
		users: teamPoints.users.length,
		totalXp: teamPoints.totalXp,
		averageXp: teamPoints.averageXp,
	});

	const gestorTeam = await getTeamPoints(user.id);
	console.log("[DRIZZLE-SERVICES] getTeamPoints (gestor):", {
		users: gestorTeam.users.length,
		totalXp: gestorTeam.totalXp,
	});

	console.log("[DRIZZLE-SERVICES] all checks OK");
}

main().catch((err: any) => {
	console.error("[DRIZZLE-SERVICES] FAIL:", err?.message || err);
	process.exit(1);
});

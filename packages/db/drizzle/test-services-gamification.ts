import "dotenv/config";
import { drizzleDb } from "../../../apps/api/src/server/lib/drizzle-db";
import { getTeamXp, getUserXp } from "../../../apps/api/src/server/services/gamification";

async function main() {
	const user = await drizzleDb.findFirst("user", { role: "ADMIN" }, { orderBy: { createdAt: "desc" } });
	if (!user) throw new Error("no admin user");

	const userXp = await getUserXp(user.id);
	console.log("[DRIZZLE-SERVICES] getUserXp:", {
		totalXp: userXp.totalXp,
		level: userXp.level,
		transactionsCount: userXp.transactions.length,
		byActionCount: userXp.byAction.length,
	});

	const teamXp = await getTeamXp();
	console.log("[DRIZZLE-SERVICES] getTeamXp (all):", {
		users: teamXp.users.length,
		totalXp: teamXp.totalXp,
		averageXp: teamXp.averageXp,
	});

	const gestorTeam = await getTeamXp(user.id);
	console.log("[DRIZZLE-SERVICES] getTeamXp (gestor):", {
		users: gestorTeam.users.length,
		totalXp: gestorTeam.totalXp,
	});

	console.log("[DRIZZLE-SERVICES] all checks OK");
}

main().catch((err: any) => {
	console.error("[DRIZZLE-SERVICES] FAIL:", err?.message || err);
	process.exit(1);
});

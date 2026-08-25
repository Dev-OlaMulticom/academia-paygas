import "dotenv/config";
import { drizzleDb } from "../../../apps/api/src/server/lib/drizzle-db";

async function main() {
	// list
	const conquistas = await drizzleDb.findMany("conquista", { orderBy: { ordem: "asc" } });
	console.log("[DRIZZLE-CONQUISTAS] list:", conquistas.length);

	const user = await drizzleDb.findFirst("user", { role: "ATENDENTE" }, { orderBy: { createdAt: "desc" } });
	if (!user) {
		throw new Error("no ATENDENTE user found");
	}
	console.log("[DRIZZLE-CONQUISTAS] user:", user.email, user.id);

	// my
	const userConquistas = await drizzleDb.findMany("userConquista", { where: { userId: user.id } });
	const allConquistas = await drizzleDb.findMany("conquista");
	const conquistaById = new Map(allConquistas.map((c: any) => [c.id, c]));
	const my = userConquistas.map((uc: any) => ({
		...conquistaById.get(uc.conquistaId),
		dataConquista: uc.dataConquista,
	}));
	console.log("[DRIZZLE-CONQUISTAS] my:", my.length);

	console.log("[DRIZZLE-CONQUISTAS] all checks OK");
}

main().catch((err: any) => {
	console.error("[DRIZZLE-CONQUISTAS] FAIL:", err?.message || err);
	process.exit(1);
});

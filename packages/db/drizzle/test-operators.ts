import "dotenv/config";
import { drizzleDb } from "../../../apps/api/src/server/lib/drizzle-db";

async function main() {
	const now = new Date();
	const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

	const recentUsers = await drizzleDb.count("user", { createdAt: { $gte: thirtyDaysAgo } });
	console.log("[DRIZZLE-OPERATORS] users $gte:", recentUsers);

	const emails = ["admin@paygas.com.br"];
	const found = await drizzleDb.findUnique("user", { email: { $in: emails } });
	console.log("[DRIZZLE-OPERATORS] findUnique $in:", found?.email);

	const selected = await drizzleDb.findMany("user", {
		where: { role: "ATENDENTE" },
		select: { id: true, email: true, nome: true },
		orderBy: { createdAt: "desc" },
		take: 3,
	});
	console.log("[DRIZZLE-OPERATORS] select fields:", selected.map((u: any) => ({ id: u.id, email: u.email })));

	console.log("[DRIZZLE-OPERATORS] all checks OK");
}

main().catch((err: any) => {
	console.error("[DRIZZLE-OPERATORS] FAIL:", err?.message || err);
	process.exit(1);
});

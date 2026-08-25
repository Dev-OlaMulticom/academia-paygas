import "dotenv/config";
import { drizzleDb } from "../../../apps/api/src/server/lib/drizzle-db";

async function main() {
	// list
	const configs = await drizzleDb.findMany("xPConfig", { orderBy: { action: "asc" } });
	console.log("[DRIZZLE-XPCONFIG] list:", configs.length);

	const action = `TEST_XP_${Date.now()}`;
	// upsert (create path)
	const created = await drizzleDb.upsert(
		"xPConfig",
		{ action },
		{ action, label: "Test XP", points: 42, description: "auto" },
		{ points: 42, label: "Test XP" },
	);
	console.log("[DRIZZLE-XPCONFIG] upsert:", created.action, created.points);

	// findUnique
	const found = await drizzleDb.findUnique("xPConfig", { action });
	console.log("[DRIZZLE-XPCONFIG] findUnique:", found?.points);

	// update via upsert
	const updated = await drizzleDb.upsert(
		"xPConfig",
		{ action },
		{ action, label: "Test XP", points: 50 },
		{ points: 50 },
	);
	console.log("[DRIZZLE-XPCONFIG] updated points:", updated.points);

	// delete
	await drizzleDb.delete("xPConfig", { action });
	const gone = await drizzleDb.findUnique("xPConfig", { action });
	console.log("[DRIZZLE-XPCONFIG] deleted:", gone === null);

	console.log("[DRIZZLE-XPCONFIG] all checks OK");
}

main().catch((err: any) => {
	console.error("[DRIZZLE-XPCONFIG] FAIL:", err?.message || err);
	console.error("cause:", err?.cause);
	process.exit(1);
});

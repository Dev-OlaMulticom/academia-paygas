import "dotenv/config";
import { dbRegistry } from "../../../apps/api/src/server/config/databases";
import { drizzleDb } from "../../../apps/api/src/server/lib/drizzle-db";

async function main() {
	const all = dbRegistry.getAll();
	if (all.length < 2) {
		console.log("[DRIZZLE-FAILOVER] skip: only one database in registry");
		return;
	}

	console.log("[DRIZZLE-FAILOVER] initial primary:", drizzleDb.getPrimaryName());

	// Force PG_1 to fail by closing its pool while keeping it "connected"
	// in the registry. The first write must fail, mark it down and retry on PG_2.
	const pg1 = all.find((e) => e.name === "PG_1");
	if (pg1?.pool) {
		console.log("[DRIZZLE-FAILOVER] closing PG_1 pool");
		await pg1.pool.end();
	}
	drizzleDb.invalidateDelegateCache();

	const role = `TEST-FAIL-${Date.now()}`;
	const created = await drizzleDb.create("roleConfig", {
		id: `rc-fail-${Date.now()}`,
		role,
		label: "Failover Test Role",
		description: "Created after PG_1 failure",
		permissions: { actions: ["read"] },
	});
	console.log("[DRIZZLE-FAILOVER] created after failover:", created.id, "primary:", drizzleDb.getPrimaryName());

	// Read from the new primary (PG_2)
	const found = await drizzleDb.findUnique("roleConfig", { id: created.id });
	console.log("[DRIZZLE-FAILOVER] found:", found?.id, found?.label);

	// Cleanup
	await drizzleDb.delete("roleConfig", { id: created.id });
	console.log("[DRIZZLE-FAILOVER] cleaned up");

	console.log("[DRIZZLE-FAILOVER] all checks OK");
}

main().catch((err: any) => {
	console.error("[DRIZZLE-FAILOVER] FAIL:", err?.message || err);
	process.exit(1);
});

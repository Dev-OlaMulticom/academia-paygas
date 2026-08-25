import "dotenv/config";
import { drizzleDb } from "../../../apps/api/src/server/lib/drizzle-db";

async function main() {
	// Test reads
	const users = await drizzleDb.findMany("user", { where: { ativo: undefined }, take: 3 });
	console.log("[DRIZZLE-CRUD] findMany users:", users.length);

	if (users.length === 0) {
		console.log("[DRIZZLE-CRUD] no users to read");
		return;
	}

	const one = await drizzleDb.findUnique("user", { id: users[0].id });
	console.log("[DRIZZLE-CRUD] findUnique:", one?.email);

	const count = await drizzleDb.count("user");
	console.log("[DRIZZLE-CRUD] count:", count);

	// Test create / update / delete on roleConfig to avoid touching real users
	const role = `TEST-${Date.now()}`;
	const created = await drizzleDb.create("roleConfig", {
		id: `rc-${Date.now()}`,
		role,
		label: "Test Role",
		description: "Auto-generated test",
		permissions: { actions: ["read"] },
	});
	console.log("[DRIZZLE-CRUD] create:", created.id, created.role);

	const updated = await drizzleDb.update("roleConfig", { id: created.id }, { label: "Updated Test Role" });
	console.log("[DRIZZLE-CRUD] update:", updated.label);

	const first = await drizzleDb.findFirst("roleConfig", { id: created.id }, { orderBy: { createdAt: "desc" } });
	console.log("[DRIZZLE-CRUD] findFirst:", first?.id);

	const removed = await drizzleDb.delete("roleConfig", { id: created.id });
	console.log("[DRIZZLE-CRUD] delete:", removed.id);

	console.log("[DRIZZLE-CRUD] all checks OK");
}

main().catch((err: any) => {
	console.error("[DRIZZLE-CRUD] FAIL:", err?.message || err);
	process.exit(1);
});

import "dotenv/config";
import { defineAbility } from "../../../apps/api/src/server/auth/casl/defineAbility";
import { getServerEncryptionKey } from "../../../apps/api/src/server/middleware/encryption";
import { drizzleDb } from "../../../apps/api/src/server/lib/drizzle-db";

async function main() {
	// Test 1: read a real user with Drizzle (the same user auth would resolve)
	const user = await drizzleDb.findFirst("user", { role: "ADMIN" }, { orderBy: { createdAt: "desc" } });
	if (!user) {
		throw new Error("no user found");
	}
	console.log("[DRIZZLE-AUTH] user:", user.email, user.role);

	// Test 2: defineAbility reads RoleConfig via drizzleDb and returns ability
	const ability = await defineAbility({ id: user.id, role: user.role, gestorId: user.gestorId });
	console.log("[DRIZZLE-AUTH] ability.can('read','User'):", ability.can("read", "User"));

	// Test 3: encryption key is still available (used by encrypted payloads)
	const key = getServerEncryptionKey();
	console.log("[DRIZZLE-AUTH] encryption key length:", key.length);

	console.log("[DRIZZLE-AUTH] all checks OK");
}

main().catch((err: any) => {
	console.error("[DRIZZLE-AUTH] FAIL:", err?.message || err);
	process.exit(1);
});

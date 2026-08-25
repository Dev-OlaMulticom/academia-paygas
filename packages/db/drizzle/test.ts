import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./pg/schema";

const url = process.env.DATABASE_URL;
if (!url) {
	console.log("[DRIZZLE-TEST] DATABASE_URL no set; skipping test.");
	process.exit(0);
}

const pool = new Pool({ connectionString: url });
const db = drizzle({ client: pool, schema });

async function main() {
	const firstUser = await db.query.user.findFirst({
		columns: { id: true, email: true, role: true },
	});
	console.log("[DRIZZLE-TEST] OK:", firstUser ? `${firstUser.email} (${firstUser.role})` : "no users");
	await pool.end();
}

main().catch((err: any) => {
	console.error("[DRIZZLE-TEST] FAIL:", err?.message || err);
	process.exit(1);
});

import "dotenv/config";
import { drizzleDb } from "../../../apps/api/src/server/lib/drizzle-db";

async function main() {
	// login flow: find user by email and verify password exists
	const user = await drizzleDb.findUnique("user", { email: "admin@paygas.com.br" });
	if (!user) throw new Error("admin not found");
	console.log("[DRIZZLE-AUTH] user:", user.email, user.role);

	const estabelecimento = user.estabelecimentoId
		? await drizzleDb.findUnique("estabelecimento", { id: user.estabelecimentoId })
		: null;
	console.log("[DRIZZLE-AUTH] estabelecimento:", estabelecimento?.nome || null);

	// me: update lastLogin and read back
	await drizzleDb.update("user", { id: user.id }, { lastLogin: new Date() });
	const updated = await drizzleDb.findUnique("user", { id: user.id });
	console.log("[DRIZZLE-AUTH] lastLogin updated:", updated?.lastLogin ? "yes" : "no");

	// verify-email style lookup
	const foundByToken = await drizzleDb.findFirst("user", { tokenVerificacao: "nonexistent" });
	console.log("[DRIZZLE-AUTH] token lookup null:", foundByToken === null);

	console.log("[DRIZZLE-AUTH] all checks OK");
}

main().catch((err: any) => {
	console.error("[DRIZZLE-AUTH] FAIL:", err?.message || err);
	process.exit(1);
});

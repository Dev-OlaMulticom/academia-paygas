/**
 * JWT_SECRET fallback chain — server/middleware/auth.ts.
 *
 * Los escenarios de exit se verifican en un subproceso: Bun cachea el
 * estado de un módulo cuya evaluación arrojó error y repite el throw
 * aunque se limpie require.cache (en Node el borrado sí fuerza
 * re-evaluación). El subproceso es agnóstico al runtime.
 *
 *   1. env var (≥32 chars) gana.
 *   2. secret ausente → exit(1).
 *   3. secret corto (<32) → exit(1).
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const HERE = path.dirname(new URL(import.meta.url).pathname);
const AUTH_MODULE = path.join(HERE, "../apps/api/src/server/middleware/auth.ts");

function clearAuthModuleCache() {
	// Best-effort: clear cache for auth and any file-based dependencies.
	for (const key of Object.keys(require.cache || {})) {
		if (key.includes("server/middleware/auth")) {
			delete require.cache[key];
		}
	}
}

function expectAuthExit(extraEnv: Record<string, string>) {
	// Ensure no file fallback exists
	if (fs.existsSync(".jwt-secret")) fs.unlinkSync(".jwt-secret");

	const script = `try { require(${JSON.stringify(AUTH_MODULE)}); } catch {}`;
	const res = spawnSync(process.execPath, ["-e", script], {
		env: { ...process.env, ...extraEnv },
		encoding: "utf8",
	});
	const output = `${res.stdout}${res.stderr}`;
	assert.equal(res.status, 1, "deberia salir con exit code 1");
	assert.ok(output.includes("JWT_SECRET is required"), "deberia reportar JWT_SECRET invalido");
}

describe("JWT_SECRET fallback chain", () => {
	it("prefers env var when ≥32 chars", () => {
		process.env.JWT_SECRET = "a".repeat(64);
		process.env.NODE_ENV = "production";
		clearAuthModuleCache();
		const auth = require("../apps/api/src/server/middleware/auth");
		assert.equal(auth.JWT_SECRET, "a".repeat(64));
	});

	it("requires env var, no file fallback", () => {
		expectAuthExit({ JWT_SECRET: "", NODE_ENV: "development" });
	});

	it("rejects short env var", () => {
		expectAuthExit({ JWT_SECRET: "short", NODE_ENV: "development" });
	});
});

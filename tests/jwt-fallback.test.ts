/**
 * JWT_SECRET fallback chain — server/middleware/auth.ts.
 *
 * Forces the module to re-evaluate by clearing require.cache for every
 * related module, then asserts:
 *   1. env var (≥32 chars) wins.
 *   2. file-based fallback works.
 *   3. generated secret has expected shape.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const SECRET_RE = /^[0-9a-f]{128}$/; // 64 bytes -> 128 hex chars

function clearAuthModuleCache() {
	// Best-effort: clear cache for auth and any file-based dependencies.
	for (const key of Object.keys(require.cache || {})) {
		if (key.includes("server/middleware/auth")) {
			delete require.cache[key];
		}
	}
}

describe("JWT_SECRET fallback chain", () => {
	it("prefers env var when ≥32 chars", () => {
		process.env.JWT_SECRET = "a".repeat(64);
		process.env.NODE_ENV = "production";
		clearAuthModuleCache();
		const auth = require("../server/middleware/auth");
		assert.equal(auth.JWT_SECRET, "a".repeat(64));
	});

	it("falls back to .jwt-secret file when env is missing", () => {
		const fixture = path.resolve(".jwt-secret-fixture");
		const newSecret = "f".repeat(48); // ≥16 chars
		fs.writeFileSync(fixture, newSecret, { mode: 0o600 });

		try {
			delete process.env.JWT_SECRET;
			process.env.NODE_ENV = "development";

			// Rename the fixture so the middleware sees it.
			if (fs.existsSync(".jwt-secret")) fs.unlinkSync(".jwt-secret");
			fs.renameSync(fixture, ".jwt-secret");
			clearAuthModuleCache();

			const auth = require("../server/middleware/auth");
			assert.equal(auth.JWT_SECRET, newSecret);

			// Restore fixture before next iteration.
			fs.renameSync(".jwt-secret", fixture);
			clearAuthModuleCache();
		} finally {
			if (fs.existsSync(fixture)) fs.unlinkSync(fixture);
			if (fs.existsSync(".jwt-secret")) fs.unlinkSync(".jwt-secret");
		}
	});

	it("generates a 128-char hex secret when nothing else is set", () => {
		delete process.env.JWT_SECRET;
		process.env.NODE_ENV = "development";

		if (fs.existsSync(".jwt-secret")) fs.unlinkSync(".jwt-secret");
		clearAuthModuleCache();

		const auth = require("../server/middleware/auth");
		assert.match(auth.JWT_SECRET, SECRET_RE, "should be 64-byte hex string");
		assert.ok(auth.JWT_SECRET.length >= 32, "should be ≥32 chars");
	});
});

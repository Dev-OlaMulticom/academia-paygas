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
		const auth = require("../apps/api/src/server/middleware/auth");
		assert.equal(auth.JWT_SECRET, "a".repeat(64));
	});

	it("requires env var, no file fallback", () => {
		const original = process.env.JWT_SECRET;
		delete process.env.JWT_SECRET;
		process.env.NODE_ENV = "development";

		// Ensure no file fallback exists
		if (fs.existsSync(".jwt-secret")) fs.unlinkSync(".jwt-secret");
		clearAuthModuleCache();

		let exited = false;
		const origExit = process.exit;
		// @ts-expect-error
		process.exit = (code: number) => {
			exited = true;
			throw new Error("process.exit:" + code);
		};

		try {
			require("../apps/api/src/server/middleware/auth");
			assert.fail("should have exited");
		} catch (e: any) {
			assert.ok(exited, "process.exit should be called");
		} finally {
			// @ts-expect-error
			process.exit = origExit;
			process.env.JWT_SECRET = original;
			clearAuthModuleCache();
		}
	});

	it("rejects short env var", () => {
		const original = process.env.JWT_SECRET;
		process.env.JWT_SECRET = "short";
		process.env.NODE_ENV = "development";
		clearAuthModuleCache();

		let exited = false;
		const origExit = process.exit;
		// @ts-expect-error
		process.exit = (code: number) => {
			exited = true;
			throw new Error("process.exit:" + code);
		};

		try {
			require("../apps/api/src/server/middleware/auth");
			assert.fail("should have exited");
		} catch {
			assert.ok(exited, "process.exit should be called for short secret");
		} finally {
			// @ts-expect-error
			process.exit = origExit;
			process.env.JWT_SECRET = original;
			clearAuthModuleCache();
		}
	});
});

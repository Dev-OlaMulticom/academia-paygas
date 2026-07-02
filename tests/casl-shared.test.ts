/**
 * Tests for the shared CASL constants — the single source of truth.
 *
 * Run: pnpm test
 * Uses node:test via tsx loader.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SHARED_ACTION_OBJECT, SHARED_ACTIONS, SHARED_SUBJECT_OBJECT, SHARED_SUBJECTS } from "../shared/casl/actions";

describe("SHARED_ACTIONS", () => {
	it("contains the 14 canonical CASL actions", () => {
		assert.equal(SHARED_ACTIONS.length, 14, "action count matches docs");
	});

	it("has no duplicates", () => {
		const unique = new Set(SHARED_ACTIONS);
		assert.equal(unique.size, SHARED_ACTIONS.length);
	});

	it("covers the standard CRUD + manage verbs", () => {
		for (const v of ["create", "read", "update", "delete", "manage"]) {
			assert.ok(SHARED_ACTIONS.includes(v as never), `missing ${v}`);
		}
	});
});

describe("SHARED_ACTION_OBJECT mirrors SHARED_ACTIONS", () => {
	it("object values are exactly the list values", () => {
		const values = Object.values(SHARED_ACTION_OBJECT).sort();
		const list = [...SHARED_ACTIONS].sort();
		assert.deepEqual(values, list, "actions object must mirror list — single source of truth");
	});
});

describe("SHARED_SUBJECTS", () => {
	it("includes the core LMS subjects", () => {
		for (const v of ["User", "Curso", "Aula", "Licao", "Quiz", "Certificate", "Progresso", "all"]) {
			assert.ok(SHARED_SUBJECTS.includes(v as never), `missing subject ${v}`);
		}
	});
});

describe("SHARED_SUBJECT_OBJECT mirrors SHARED_SUBJECTS", () => {
	it("subjects object values are exactly the list values", () => {
		const values = Object.values(SHARED_SUBJECT_OBJECT).sort();
		const list = [...SHARED_SUBJECTS].sort();
		assert.deepEqual(values, list);
	});
});

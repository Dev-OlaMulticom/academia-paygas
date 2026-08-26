import assert from "node:assert";
import { describe, it } from "node:test";

import { roundXpUp } from "../apps/api/src/server/services/gamification";

describe("roundXpUp", () => {
	it("redondea siempre para arriba a 2 decimales", () => {
		assert.equal(roundXpUp(4.99999999999999), 5);
		assert.equal(roundXpUp(99.99999999999999), 100);
		assert.equal(roundXpUp(0.05), 0.05);
		assert.equal(roundXpUp(0.5), 0.5);
		assert.equal(roundXpUp(0.07), 0.07);
		assert.equal(roundXpUp(4.501), 4.51);
		assert.equal(roundXpUp(0.001), 0.01);
		assert.equal(roundXpUp(123.456), 123.46);
	});

	it("no supera 2 decimales", () => {
		const cases = [0, 0.05, 0.5, 2, 5, 12.35, 123.45];
		for (const value of cases) {
			const result = roundXpUp(value);
			const decimals = (result.toString().split(".")[1] || "").length;
			assert.ok(decimals <= 2, `${value} -> ${result} tiene ${decimals} decimales`);
		}
	});

	it("mantiene valores enteros", () => {
		assert.equal(roundXpUp(5), 5);
		assert.equal(roundXpUp(0), 0);
		assert.equal(roundXpUp(12), 12);
	});
});

/**
 * Gestor auto-assignment — server/services/gestor-assignment.ts
 *
 * Tests the pure selection logic used to assign a gestor to SSO users
 * that don't have one yet.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickBestGestor, selectGestorForUser } from "../server/services/gestor-assignment";

const gestorA = { id: "g-a", nome: "Ana", marketplaceId: "mp-1", estabelecimentoId: "est-1" };
const gestorB = { id: "g-b", nome: "Bruno", marketplaceId: "mp-1", estabelecimentoId: "est-2" };
const gestorC = { id: "g-c", nome: "Carla", marketplaceId: "mp-2", estabelecimentoId: "est-1" };

const emptyLoad = new Map<string, number>();

describe("pickBestGestor", () => {
	it("returns null for an empty list", () => {
		assert.equal(pickBestGestor([], emptyLoad), null);
	});

	it("picks the least-loaded gestor", () => {
		const load = new Map<string, number>([
			["g-a", 5],
			["g-b", 1],
			["g-c", 3],
		]);
		assert.equal(pickBestGestor([gestorA, gestorB, gestorC], load)?.id, "g-b");
	});

	it("ties are broken alphabetically by nome", () => {
		const load = new Map<string, number>([
			["g-a", 2],
			["g-b", 2],
			["g-c", 2],
		]);
		assert.equal(pickBestGestor([gestorB, gestorA, gestorC], load)?.id, "g-a");
	});

	it("unknown gestors default to load 0", () => {
		const load = new Map<string, number>([["g-b", 7]]);
		assert.equal(pickBestGestor([gestorA, gestorB], load)?.id, "g-a");
	});
});

describe("selectGestorForUser", () => {
	it("prefers a gestor from the same marketplace over a less-loaded one", () => {
		const load = new Map<string, number>([
			["g-a", 8],
			["g-b", 9],
			["g-c", 1],
		]);
		const user = { marketplaceId: "mp-1" };
		assert.equal(selectGestorForUser(user, [gestorA, gestorB, gestorC], load)?.id, "g-a");
	});

	it("picks the least-loaded gestor within the matching marketplace", () => {
		const load = new Map<string, number>([
			["g-a", 8],
			["g-b", 2],
		]);
		const user = { marketplaceId: "mp-1" };
		assert.equal(selectGestorForUser(user, [gestorA, gestorB], load)?.id, "g-b");
	});

	it("falls back to estabelecimento when no marketplace matches", () => {
		const load = new Map<string, number>([
			["g-a", 1],
			["g-b", 1],
			["g-c", 5],
		]);
		const user = { marketplaceId: "mp-zzz", estabelecimentoId: "est-1" };
		assert.equal(selectGestorForUser(user, [gestorA, gestorB, gestorC], load)?.id, "g-a");
	});

	it("falls back to the least-loaded gestor overall when nothing matches", () => {
		const load = new Map<string, number>([
			["g-a", 9],
			["g-b", 3],
			["g-c", 6],
		]);
		const user = { marketplaceId: "mp-zzz", estabelecimentoId: "est-zzz" };
		assert.equal(selectGestorForUser(user, [gestorA, gestorB, gestorC], load)?.id, "g-b");
	});

	it("works for a user without marketplace/estabelecimento", () => {
		const load = new Map<string, number>([
			["g-a", 9],
			["g-b", 3],
			["g-c", 6],
		]);
		assert.equal(selectGestorForUser({}, [gestorA, gestorB, gestorC], load)?.id, "g-b");
	});

	it("returns null when there are no gestores", () => {
		assert.equal(selectGestorForUser({ marketplaceId: "mp-1" }, [], emptyLoad), null);
	});
});

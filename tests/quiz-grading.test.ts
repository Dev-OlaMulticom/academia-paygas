import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { gradeQuiz } from "../server/lib/quiz";

describe("gradeQuiz", () => {
	const perguntas = [
		{ id: "p1", correta: "A" },
		{ id: "p2", correta: "B" },
		{ id: "p3", correta: "C" },
	];

	it("todas corretas -> nota 10 e aprovado", () => {
		const r = gradeQuiz(perguntas, { p1: "A", p2: "B", p3: "C" }, 7);
		assert.equal(r.correct, 3);
		assert.equal(r.total, 3);
		assert.equal(r.nota, 10);
		assert.equal(r.concluido, true);
	});

	it("nenhuma corretas -> nota 0 e reprovado", () => {
		const r = gradeQuiz(perguntas, { p1: "B", p2: "A", p3: "A" }, 7);
		assert.equal(r.correct, 0);
		assert.equal(r.nota, 0);
		assert.equal(r.concluido, false);
	});

	it("arredonda a nota corretamente (1/3 -> 3)", () => {
		const r = gradeQuiz(perguntas, { p1: "A", p2: "X", p3: "X" }, 7);
		assert.equal(r.correct, 1);
		assert.equal(r.nota, 3);
	});

	it("limiar: 6/10 com minimo 7 reprovado, 7/10 aprovado", () => {
		const dez = Array.from({ length: 10 }, (_: unknown, i: number) => ({
			id: `q${i}`,
			correta: i < 7 ? "A" : "B",
		}));
		const seis = { ...Object.fromEntries(dez.slice(0, 6).map((q) => [q.id, q.correta])) };
		const sete = { ...Object.fromEntries(dez.slice(0, 7).map((q) => [q.id, q.correta])) };
		assert.equal(gradeQuiz(dez, seis, 7).concluido, false);
		assert.equal(gradeQuiz(dez, sete, 7).concluido, true);
	});

	it("sem perguntas -> total 0 e nota 0", () => {
		const r = gradeQuiz([], {}, 7);
		assert.equal(r.total, 0);
		assert.equal(r.nota, 0);
		assert.equal(r.concluido, false);
	});

	it("usa notaMinima padrao 7 quando omitida", () => {
		const r = gradeQuiz(perguntas, { p1: "A", p2: "B", p3: "C" });
		assert.equal(r.concluido, true);
	});
});

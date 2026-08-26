import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getQuizPassInfo, quizPassText } from "../packages/shared/src/quiz";

describe("getQuizPassInfo", () => {
	it("total 0 -> needed 0", () => {
		const r = getQuizPassInfo({ notaMinima: 7, perguntas: [] });
		assert.equal(r.needed, 0);
		assert.equal(r.total, 0);
	});

	it("minimo 7 e 10 perguntas -> 7 necessarias", () => {
		const r = getQuizPassInfo({ notaMinima: 7, perguntas: new Array(10) });
		assert.equal(r.needed, 7);
	});

	it("minimo 5 e 10 -> 5", () => {
		const r = getQuizPassInfo({ notaMinima: 5, perguntas: new Array(10) });
		assert.equal(r.needed, 5);
	});

	it("minimo 8 e 10 -> 8 (teto)", () => {
		const r = getQuizPassInfo({ notaMinima: 8, perguntas: new Array(10) });
		assert.equal(r.needed, 8);
	});

	it("minimo 10 e 10 -> 10", () => {
		const r = getQuizPassInfo({ notaMinima: 10, perguntas: new Array(10) });
		assert.equal(r.needed, 10);
	});

	it("usa minimo padrao 7 quando ausente", () => {
		const r = getQuizPassInfo({ perguntas: new Array(10) });
		assert.equal(r.notaMinima, 7);
		assert.equal(r.needed, 7);
	});
});

describe("quizPassText", () => {
	it("gera texto em portugues com quantidade necessaria", () => {
		const txt = quizPassText({ notaMinima: 7, perguntas: new Array(5) });
		assert.match(txt, /Voce precisa de 4 de 5 respostas corretas/);
		assert.match(txt, /nota minima 7\/10/);
	});
});

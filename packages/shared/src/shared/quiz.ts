export interface QuizPassInfo {
	notaMinima: number;
	total: number;
	needed: number;
}

export function getQuizPassInfo(quiz: { notaMinima?: number; perguntas?: unknown[] }): QuizPassInfo {
	const notaMinima = quiz?.notaMinima ?? 7;
	const total = quiz?.perguntas?.length || 0;
	const needed = total > 0 ? Math.ceil((notaMinima / 10) * total) : 0;
	return { notaMinima, total, needed };
}

export function quizPassText(quiz: { notaMinima?: number; perguntas?: unknown[] }): string {
	const { notaMinima, total, needed } = getQuizPassInfo(quiz);
	return `Voce precisa de ${needed} de ${total} respostas corretas para aprovar (nota minima ${notaMinima}/10)`;
}

export interface QuizGrade {
	correct: number;
	total: number;
	nota: number;
	concluido: boolean;
}

export function gradeQuiz(
	perguntas: { id: string; correta: string }[],
	respostas: Record<string, string>,
	notaMinima = 7,
): QuizGrade {
	let correct = 0;
	perguntas.forEach((p) => {
		if (respostas[p.id] === p.correta) correct++;
	});
	const total = perguntas.length;
	const nota = total > 0 ? Math.round((correct / total) * 10) : 0;
	const concluido = nota >= notaMinima;
	return { correct, total, nota, concluido };
}

export function passedQuizResult(quiz: { perguntas: unknown[]; notaMinima?: number }) {
	const total = quiz.perguntas.length;
	const nota = quiz.notaMinima || 7;
	return { nota, total, concluido: true };
}

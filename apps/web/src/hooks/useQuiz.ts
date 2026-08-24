import { useCallback, useState } from "react";
import { api } from "../lib/api";

export interface QuizQuestion {
	id: string;
	correta: string;
}

export interface QuizLike {
	id: string;
	notaMinima?: number;
	perguntas?: QuizQuestion[];
	autoGerarCertificado?: boolean;
}

export interface UseQuizOptions {
	onPass: (quizId: string, passed: boolean) => void;
}

export function useQuiz(options: UseQuizOptions) {
	const { onPass } = options;
	const [answers, setAnswers] = useState<Record<string, Record<string, string>>>({});
	const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
	const [results, setResults] = useState<Record<string, any>>({});
	const [steps, setSteps] = useState<Record<string, number>>({});

	const setAnswer = useCallback(
		(quizId: string, perguntaId: string, letter: string) => {
			if (submitted[quizId]) return;
			setAnswers((prev) => ({ ...prev, [quizId]: { ...(prev[quizId] || {}), [perguntaId]: letter } }));
		},
		[submitted],
	);

	const setStep = useCallback((quizId: string, step: number) => {
		setSteps((prev) => ({ ...prev, [quizId]: step }));
	}, []);

	const reset = useCallback((quizId: string) => {
		setSubmitted((prev) => ({ ...prev, [quizId]: false }));
		setResults((prev) => {
			const n = { ...prev };
			delete n[quizId];
			return n;
		});
		setAnswers((prev) => {
			const n = { ...prev };
			delete n[quizId];
			return n;
		});
		setSteps((prev) => ({ ...prev, [quizId]: 0 }));
	}, []);

	const submit = useCallback(
		async (quiz: QuizLike) => {
			const quizAnswers = answers[quiz.id] || {};
			try {
				const result: any = await api.submitQuiz(quiz.id, quizAnswers);
				const nota = result.nota || 0;
				const total = result.total || quiz.perguntas?.length || 0;
				const correct = result.correct || 0;
				const passed = result.concluido || nota >= (quiz.notaMinima ?? 7);
				setResults((prev) => ({ ...prev, [quiz.id]: { nota, total, correct, passed } }));
				setSubmitted((prev) => ({ ...prev, [quiz.id]: true }));
				onPass(quiz.id, passed);
				return { nota, total, correct, passed };
			} catch {
				setResults((prev) => ({
					...prev,
					[quiz.id]: { nota: 0, total: quiz.perguntas?.length || 0, correct: 0, passed: false },
				}));
				setSubmitted((prev) => ({ ...prev, [quiz.id]: true }));
				return null;
			}
		},
		[answers, onPass],
	);

	return {
		answers: (quizId: string) => answers[quizId] || {},
		submitted: (quizId: string) => !!submitted[quizId],
		result: (quizId: string) => results[quizId] || null,
		step: (quizId: string) => steps[quizId] || 0,
		setAnswer,
		setStep,
		reset,
		submit,
	};
}

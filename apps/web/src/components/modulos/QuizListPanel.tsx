import type { useQuiz } from "../../hooks/useQuiz";
import { QuizPlayer } from "./quiz";

type Qz = ReturnType<typeof useQuiz>;

export function QuizListPanel({
	quizLessons,
	lessons,
	allQuizResults,
	expandedQuizId,
	onToggle,
	qz,
	canOpenQuiz,
}: {
	quizLessons: any[];
	lessons: any[];
	allQuizResults: Record<string, any>;
	expandedQuizId: string | null;
	onToggle: (quizId: string | null) => void;
	qz: Qz;
	canOpenQuiz: (lessonIndex: number) => boolean;
}) {
	return (
		<div className="quizzes-section">
			<h3 className="quizzes-title">📝 Todos os Quizzes</h3>
			{quizLessons.length === 0 ? (
				<div className="empty-state quizzes-empty-p">
					<p className="quizzes-empty-text">Nenhum quiz disponivel neste curso.</p>
				</div>
			) : (
				<div className="quizzes-list">
					{quizLessons.map((lesson) => {
						const quiz = lesson.quiz;
						const result = allQuizResults[quiz.id];
						const passed = result?.concluido;
						const isExpanded = expandedQuizId === quiz.id;
						const lessonIdx = lessons.indexOf(lesson);
						const quizAccessible = canOpenQuiz(lessonIdx);
						const cardClass = passed ? "passed" : isExpanded ? "expanded" : quizAccessible ? "default" : "default";

						return (
							<div key={quiz.id} className={`quiz-card ${cardClass}`}>
								<div
									className="quiz-card-header"
									onClick={() => {
										if (!quizAccessible && !passed) return;
										onToggle(isExpanded ? null : quiz.id);
									}}
								>
									<div className="quiz-card-row">
										<div>
											<div className="quiz-card-title">📝 {quiz.titulo}</div>
											<div className="quiz-card-meta">
												Aula: {lesson.titulo} · {quiz.perguntas?.length || 0} perguntas · Nota minima:{" "}
												{quiz.notaMinima ?? 7}/10
											</div>
										</div>
										<div className="quiz-card-right">
											{!quizAccessible && !passed ? (
												<span className="quiz-badge-not-started">
													<i className="icon-lock icon-sm" /> Bloqueado
												</span>
											) : result ? (
												<span className={passed ? "quiz-badge-passed" : "quiz-badge-failed"}>
													{passed ? `✓ ${result.nota}/10` : `✗ ${result.nota}/10`}
												</span>
											) : (
												<span className="quiz-badge-not-started">Nao resolvido</span>
											)}
											<i className={`icon-chevron-${isExpanded ? "up" : "down"} icon-sm quiz-chevron-gray`} />
										</div>
									</div>
								</div>
								{isExpanded && (
									<div className="quiz-expanded-body">
										<QuizPlayer quiz={quiz} qz={qz} variant="card" />
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}

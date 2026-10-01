import { quizPassText } from "@shared/quiz";
import type { CSSProperties, ReactNode } from "react";
import type { useQuiz } from "../../hooks/useQuiz";

type Qz = ReturnType<typeof useQuiz>;

export interface QuizResult {
	nota: number;
	total: number;
	correct: number;
	passed: boolean;
}

const LETTERS = ["A", "B", "C", "D"];

export function QuizResultBanner({
	result,
	className = "",
	style,
	children,
}: {
	result: QuizResult;
	className?: string;
	style?: CSSProperties;
	children?: ReactNode;
}) {
	return (
		<div className={`quiz-result-banner ${result.passed ? "passed" : "failed"} ${className}`.trim()} style={style}>
			<div className="quiz-result-header">
				<span className="quiz-result-icon">{result.passed ? "🎉" : "❌"}</span>
				<div>
					<h3 className="quiz-result-h3">{result.passed ? "Aprovado!" : "Reprovado"}</h3>
					<p className="quiz-result-sub">
						Nota: {result.nota}/10 ({result.correct}/{result.total} corretas)
					</p>
				</div>
			</div>
			{children}
		</div>
	);
}

export function QuizStepIndicator({ step, total }: { step: number; total: number }) {
	return (
		<div className="quiz-step-indicator">
			<span className="quiz-step-text">
				{step + 1} / {total}
			</span>
			<div className="quiz-step-bar">
				<div className="quiz-step-fill" style={{ width: `${((step + 1) / total) * 100}%` }} />
			</div>
		</div>
	);
}

export function QuizOptions({
	quiz,
	pergunta,
	qz,
	radioPrefix,
	className,
	style,
}: {
	quiz: any;
	pergunta: any;
	qz: Qz;
	radioPrefix: string;
	className?: string;
	style?: CSSProperties;
}) {
	const answers = qz.answers(quiz.id) || {};
	return (
		<div className={className} style={style || { display: "flex", flexDirection: "column", gap: "6px" }}>
			{[pergunta.opcaoA, pergunta.opcaoB, pergunta.opcaoC, pergunta.opcaoD]
				.filter(Boolean)
				.map((opt: string, oIndex: number) => {
					const letter = LETTERS[oIndex];
					const isSelected = answers[pergunta.id] === letter;
					return (
						<label key={oIndex} className={`quiz-opt ${isSelected ? "selected" : ""}`}>
							<input
								type="radio"
								name={`${radioPrefix}${pergunta.id}`}
								checked={isSelected}
								onChange={() => qz.setAnswer(quiz.id, pergunta.id, letter)}
							/>
							<span className="quiz-letter">{letter}</span>
							{opt}
						</label>
					);
				})}
		</div>
	);
}

export function QuizStepNav({
	quiz,
	qz,
	submitClass = "",
	style,
}: {
	quiz: any;
	qz: Qz;
	submitClass?: string;
	style?: CSSProperties;
}) {
	const perguntas = quiz.perguntas || [];
	const step = qz.step(quiz.id) || 0;
	const answers = qz.answers(quiz.id) || {};
	const isLast = step === perguntas.length - 1;
	return (
		<div className="quiz-step-nav" style={style}>
			{step > 0 && (
				<button className="btn-secondary" onClick={() => qz.setStep(quiz.id, step - 1)}>
					<i className="icon-arrow-left icon-sm" /> Anterior
				</button>
			)}
			{isLast ? (
				<button
					className={`btn-primary ${submitClass}`.trim()}
					style={{ flex: 1 }}
					onClick={() => qz.submit(quiz)}
					disabled={Object.keys(answers).length < perguntas.length}
				>
					Enviar Respostas
				</button>
			) : (
				<button
					className={`btn-primary ${submitClass}`.trim()}
					style={{ flex: 1 }}
					onClick={() => qz.setStep(quiz.id, step + 1)}
					disabled={!answers[perguntas[step]?.id]}
				>
					Proxima <i className="icon-chevron-right icon-sm" />
				</button>
			)}
		</div>
	);
}

export function QuizBreakdown({
	perguntas,
	answers,
	variant,
	truncate = 50,
	statusClass = false,
}: {
	perguntas: any[];
	answers: Record<string, string>;
	variant: "text" | "arrow" | "item";
	truncate?: number;
	statusClass?: boolean;
}) {
	if (variant === "item") {
		return (
			<>
				{perguntas.map((pergunta: any, qIndex: number) => {
					const userAnswer = answers[pergunta.id];
					const isCorrect = userAnswer === pergunta.correta;
					return (
						<div
							key={qIndex}
							className={`quiz-breakdown-item${statusClass ? (isCorrect ? " correct" : " wrong") : ""}`}
							style={statusClass ? undefined : { marginBottom: "6px" }}
						>
							<span
								className="quiz-breakdown-icon"
								style={statusClass ? undefined : { color: isCorrect ? "var(--pg-green)" : "var(--pg-red)" }}
							>
								{isCorrect ? "✓" : "✗"}
							</span>
							<span className="quiz-breakdown-text">
								{qIndex + 1}. {pergunta.pergunta.substring(0, truncate)}
								{pergunta.pergunta.length > truncate ? "..." : ""}
							</span>
							<span className="quiz-breakdown-answer">
								{isCorrect ? pergunta.correta : `${userAnswer || "-"} → ${pergunta.correta}`}
							</span>
						</div>
					);
				})}
			</>
		);
	}
	if (variant === "arrow") {
		return (
			<>
				{perguntas.map((p: any, qIndex: number) => (
					<div key={qIndex} style={{ marginBottom: "8px", fontSize: "13px" }}>
						<span
							style={{
								color: answers[p.id] === p.correta ? "var(--pg-green)" : "var(--pg-red)",
								fontWeight: "600",
							}}
						>
							{answers[p.id] === p.correta ? "✓" : "✗"}
						</span>{" "}
						{qIndex + 1}. {p.pergunta.substring(0, 50)}
						{p.pergunta.length > 50 ? "..." : ""}
						{answers[p.id] !== p.correta && (
							<span style={{ color: "var(--gray-400)", fontSize: "11px" }}> → {p.correta}</span>
						)}
					</div>
				))}
			</>
		);
	}
	return (
		<>
			{perguntas.map((pergunta: any, qIndex: number) => (
				<div key={qIndex} style={{ marginBottom: "8px", fontSize: "12px" }}>
					<span
						style={{
							color: answers[pergunta.id] === pergunta.correta ? "var(--pg-green)" : "var(--pg-red)",
							fontWeight: 600,
						}}
					>
						{answers[pergunta.id] === pergunta.correta ? "✓" : "✗"} {qIndex + 1}. {pergunta.pergunta.substring(0, 50)}
						{pergunta.pergunta.length > 50 ? "..." : ""}
					</span>
				</div>
			))}
		</>
	);
}

export type QuizPlayerVariant = "accordion" | "card" | "modal" | "page";

const RADIO_PREFIX: Record<QuizPlayerVariant, (quizId: string) => string> = {
	accordion: (id) => `acc-${id}-`,
	card: (id) => `inline-${id}-`,
	modal: (id) => `modal-${id}-`,
	page: () => "q",
};

function QuizQuestion({
	quiz,
	pergunta,
	step,
	qz,
	variant,
}: {
	quiz: any;
	pergunta: any;
	step: number;
	qz: Qz;
	variant: QuizPlayerVariant;
}) {
	const radioPrefix = RADIO_PREFIX[variant](quiz.id);
	const label = (
		<>
			{step + 1}. {pergunta.pergunta}
		</>
	);
	if (variant === "card") {
		return (
			<div className="quiz-questions-mt">
				<div className="quiz-question-item">
					<p className="quiz-question-text">{label}</p>
					<QuizOptions quiz={quiz} pergunta={pergunta} qz={qz} radioPrefix={radioPrefix} className="quiz-options" />
				</div>
			</div>
		);
	}
	if (variant === "page") {
		return (
			<div className="quiz-questions-mt" style={{ marginTop: "16px" }}>
				<div style={{ padding: "16px", background: "#f9f9f9", borderRadius: "8px" }}>
					<p style={{ fontWeight: "600", marginBottom: "12px" }}>{label}</p>
					<QuizOptions
						quiz={quiz}
						pergunta={pergunta}
						qz={qz}
						radioPrefix={radioPrefix}
						style={{ display: "flex", flexDirection: "column", gap: "8px" }}
					/>
				</div>
			</div>
		);
	}
	return (
		<div style={{ marginBottom: "12px" }}>
			<p
				style={{
					fontWeight: "600",
					marginBottom: "8px",
					fontSize: variant === "modal" ? "14px" : "13px",
				}}
			>
				{label}
			</p>
			<QuizOptions quiz={quiz} pergunta={pergunta} qz={qz} radioPrefix={radioPrefix} />
		</div>
	);
}

export function QuizPlayer({
	quiz,
	qz,
	variant,
	bannerActions,
	footer,
}: {
	quiz: any;
	qz: Qz;
	variant: QuizPlayerVariant;
	bannerActions?: ReactNode;
	footer?: ReactNode;
}) {
	const isSubmitted = qz.submitted(quiz.id);
	const result = qz.result(quiz.id);
	const answers = qz.answers(quiz.id) || {};
	const perguntas = quiz.perguntas || [];
	const step = qz.step(quiz.id) || 0;
	const pergunta = perguntas[step];

	return (
		<>
			{result && (
				<QuizResultBanner
					result={result}
					className={variant === "card" ? "quiz-result-header-mt" : ""}
					style={variant === "accordion" ? { marginBottom: "12px" } : undefined}
				>
					{!result.passed && variant === "card" && (
						<div className="quiz-retry-mt">
							<button className="btn-secondary quiz-retry-btn" onClick={() => qz.reset(quiz.id)}>
								Tentar Novamente
							</button>
						</div>
					)}
					{!result.passed && variant === "modal" && (
						<div style={{ marginTop: "8px" }}>
							<button className="btn-secondary" onClick={() => qz.reset(quiz.id)}>
								Tentar Novamente
							</button>
						</div>
					)}
					{variant === "page" && (
						<div className="quiz-result-breakdown">
							<QuizBreakdown perguntas={perguntas} answers={answers} variant="item" truncate={60} statusClass />
						</div>
					)}
					{bannerActions}
				</QuizResultBanner>
			)}

			{!isSubmitted && <QuizStepIndicator step={step} total={perguntas.length} />}

			{!isSubmitted && pergunta && (
				<QuizQuestion quiz={quiz} pergunta={pergunta} step={step} qz={qz} variant={variant} />
			)}

			{isSubmitted && variant === "card" && <QuizBreakdown perguntas={perguntas} answers={answers} variant="item" />}
			{isSubmitted && variant === "modal" && <QuizBreakdown perguntas={perguntas} answers={answers} variant="arrow" />}
			{isSubmitted && variant === "accordion" && (
				<QuizBreakdown perguntas={perguntas} answers={answers} variant="text" />
			)}

			{!isSubmitted && (
				<QuizStepNav
					quiz={quiz}
					qz={qz}
					submitClass={variant === "card" ? "quiz-submit-btn" : ""}
					style={variant === "modal" ? { marginTop: "12px" } : undefined}
				/>
			)}

			{isSubmitted && !result?.passed && variant === "accordion" && (
				<button className="btn-secondary" style={{ width: "100%" }} onClick={() => qz.reset(quiz.id)}>
					Tentar Novamente
				</button>
			)}

			{footer}
		</>
	);
}

export function QuizAccordion({
	quiz,
	qz,
	isCurrent,
	canOpen,
}: {
	quiz: any;
	qz: Qz;
	isCurrent: boolean;
	canOpen: boolean;
}) {
	if (!isCurrent && !qz.submitted(quiz.id)) return null;
	if (!canOpen) return null;
	return (
		<div className="quiz-in-accordion">
			<h4>📝 {quiz.titulo}</h4>
			<p style={{ fontSize: "12px", color: "var(--gray-500)", marginBottom: "12px" }}>{quizPassText(quiz)}</p>
			<QuizPlayer quiz={quiz} qz={qz} variant="accordion" />
		</div>
	);
}

export function QuizModal({ lesson, qz, onClose }: { lesson: any; qz: Qz; onClose: () => void }) {
	const quiz = lesson?.quiz;
	if (!quiz) return null;
	return (
		<div className="quiz-modal-overlay" onClick={onClose}>
			<div className="quiz-modal-content" onClick={(e) => e.stopPropagation()}>
				<div className="quiz-modal-header">
					<h3>📝 {quiz.titulo}</h3>
					<button className="quiz-modal-close" onClick={onClose}>
						<i className="icon-x" />
					</button>
				</div>

				<p className="quiz-modal-subtitle">
					Aula: {lesson.titulo} · {quizPassText(quiz)}
				</p>

				<QuizPlayer quiz={quiz} qz={qz} variant="modal" />
			</div>
		</div>
	);
}

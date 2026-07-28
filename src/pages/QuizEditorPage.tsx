import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppSelect } from "../components/AppSelect";
import { useConfirm, useToast } from "../components/Toast";
import { useAbility } from "../hooks/useAbility";
import { api } from "../lib/api";
import { pluralize } from "../lib/utils";

interface QuizEditorPageProps {
	user: any;
}

export function QuizEditorPage({ user: _user }: QuizEditorPageProps) {
	const { cursoId, aulaId } = useParams<{ cursoId: string; aulaId: string }>();
	const navigate = useNavigate();
	const { toast } = useToast();
	const { confirm } = useConfirm();
	const { isAdmin } = useAbility();

	const [aula, setAula] = useState<any>(null);
	const [curso, setModulo] = useState<any>(null);
	const [quiz, setQuiz] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const [quizTitle, setQuizTitle] = useState("");
	const [notaMinima, setNotaMinima] = useState(7);
	const [autoCert, setAutoCert] = useState(false);
	const [editingSettings, setEditingSettings] = useState(false);

	const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
	const [formData, setFormData] = useState({
		pergunta: "",
		opcaoA: "",
		opcaoB: "",
		opcaoC: "",
		opcaoD: "",
		correta: "A",
		ordem: 0,
	});
	const [_isEditing, setIsEditing] = useState(false);

	const loadData = useCallback(async () => {
		if (!cursoId || !aulaId) return;
		try {
			setLoading(true);
			const [mod, al, qz] = await Promise.all([
				api.getModulo(cursoId),
				api.getAula(cursoId, aulaId).catch(() => null),
				api.getQuiz(cursoId, aulaId).catch(() => null),
			]);
			setModulo(mod);
			setAula(al);
			if (qz) {
				setQuiz(qz);
				setQuizTitle(qz.titulo);
				setNotaMinima(qz.notaMinima ?? 7);
				setAutoCert(qz.autoGerarCertificado ?? false);
			}
		} catch {
			toast("Erro ao carregar dados", "error");
		} finally {
			setLoading(false);
		}
	}, [cursoId, aulaId, toast]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	const handleCreateQuiz = async () => {
		if (!cursoId || !aulaId) return;
		if (!quizTitle.trim()) {
			toast("Título é obrigatório", "error");
			return;
		}
		try {
			setSaving(true);
			const q = await api.createQuiz(cursoId, {
				aulaId,
				titulo: quizTitle,
				autoGerarCertificado: autoCert,
				notaMinima,
			});
			setQuiz(q);
			setEditingSettings(false);
			toast("Quiz criado!", "success");
		} catch (err: any) {
			toast(err.message || "Erro ao criar quiz", "error");
		} finally {
			setSaving(false);
		}
	};

	const handleUpdateSettings = async () => {
		if (!quiz) return;
		try {
			setSaving(true);
			const updated = await api.updateQuiz(quiz.id, { titulo: quizTitle, notaMinima, autoGerarCertificado: autoCert });
			setQuiz(updated);
			setEditingSettings(false);
			toast("Configurações salvas", "success");
		} catch (err: any) {
			toast(err.message || "Erro ao atualizar", "error");
		} finally {
			setSaving(false);
		}
	};

	const handleDeleteQuiz = async () => {
		if (!quiz) return;
		const ok = await confirm({ title: "Excluir quiz", message: "Excluir este quiz e todas as perguntas?" });
		if (!ok) return;
		try {
			await api.deleteQuiz(quiz.id);
			setQuiz(null);
			setQuizTitle(`Quiz: ${aula?.titulo || ""}`);
			setNotaMinima(7);
			setAutoCert(false);
			toast("Quiz excluído", "success");
		} catch (err: any) {
			toast(err.message || "Erro ao excluir", "error");
		}
	};

	const _handleAddQuestion = async () => {
		if (!quiz) return;
		if (!formData.pergunta.trim() || !formData.opcaoA.trim() || !formData.opcaoB.trim()) {
			toast("Pergunta e opções A/B são obrigatórias", "error");
			return;
		}
		try {
			setSaving(true);
			await api.addPergunta(quiz.id, formData);
			setFormData({ pergunta: "", opcaoA: "", opcaoB: "", opcaoC: "", opcaoD: "", correta: "A", ordem: 0 });
			const updated = await api.getQuiz(cursoId!, aulaId!);
			setQuiz(updated);
			toast("Pergunta adicionada", "success");
		} catch (err: any) {
			toast(err.message || "Erro ao adicionar pergunta", "error");
		} finally {
			setSaving(false);
		}
	};

	const handleSelectQuestion = (p: any) => {
		setActiveQuestion(p.id);
		setIsEditing(true);
		setFormData({
			pergunta: p.pergunta,
			opcaoA: p.opcaoA,
			opcaoB: p.opcaoB,
			opcaoC: p.opcaoC || "",
			opcaoD: p.opcaoD || "",
			correta: p.correta,
			ordem: typeof p.ordem === "number" ? p.ordem : 0,
		});
	};

	const handleNewQuestion = () => {
		setActiveQuestion(null);
		setIsEditing(false);
		setFormData({ pergunta: "", opcaoA: "", opcaoB: "", opcaoC: "", opcaoD: "", correta: "A", ordem: 0 });
	};

	const handleSaveQuestion = async () => {
		if (!formData.pergunta.trim() || !formData.opcaoA.trim() || !formData.opcaoB.trim()) {
			toast("Pergunta e opções A/B são obrigatórias", "error");
			return;
		}
		try {
			setSaving(true);
			if (activeQuestion) {
				await api.updatePergunta(activeQuestion, formData);
				toast("Pergunta atualizada", "success");
			} else {
				await api.addPergunta(quiz.id, formData);
				toast("Pergunta adicionada", "success");
			}
			const updated = await api.getQuiz(cursoId!, aulaId!);
			setQuiz(updated);
			handleNewQuestion();
		} catch (err: any) {
			toast(err.message || "Erro ao salvar pergunta", "error");
		} finally {
			setSaving(false);
		}
	};

	const handleDeleteQuestion = async (id: string) => {
		const ok = await confirm({ title: "Excluir pergunta", message: "Excluir esta pergunta?" });
		if (!ok) return;
		try {
			await api.deletePergunta(id);
			if (activeQuestion === id) handleNewQuestion();
			const updated = await api.getQuiz(cursoId!, aulaId!);
			setQuiz(updated);
			toast("Pergunta excluída", "success");
		} catch (err: any) {
			toast(err.message || "Erro ao excluir", "error");
		}
	};

	if (loading) {
		return <div className="quiz-editor-loading">Carregando quiz...</div>;
	}

	return (
		<div className="quiz-editor-root">
			<div className="quiz-editor-header">
				<button className="btn-secondary quiz-editor-back-btn" onClick={() => navigate(-1)}>
					← Voltar
				</button>
				<div className="quiz-editor-header-info">
					<h2 className="quiz-editor-header-title">
						{curso?.titulo || "Módulo"} → {aula?.titulo || "Aula"}
					</h2>
					<p className="quiz-editor-header-sub">
						{quiz
							? `${quiz.perguntas?.length || 0} ${pluralize(quiz.perguntas?.length || 0, "pergunta")}`
							: "Sem quiz ainda"}
					</p>
				</div>
				{quiz && isAdmin && (
					<div className="quiz-editor-actions">
						<button className="btn-secondary quiz-editor-action-btn" onClick={() => setEditingSettings(true)}>
							⚙ Configurações
						</button>
						<button className="btn-secondary quiz-editor-delete-btn" onClick={handleDeleteQuiz}>
							🗑 Excluir Quiz
						</button>
					</div>
				)}
			</div>

			{editingSettings && (
				<div className="quiz-settings-panel">
					<h4 className="quiz-settings-title">Configurações do Quiz</h4>
					<div className="quiz-settings-grid">
						<div className="form-field">
							<label className="form-label">Título</label>
							<input className="form-input" value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} />
						</div>
						<div className="form-field">
							<label className="form-label">Nota Mínima (0-10)</label>
							<input
								className="form-input"
								type="number"
								min="0"
								max="10"
								value={notaMinima}
								onChange={(e) => setNotaMinima(parseInt(e.target.value, 10) || 7)}
							/>
							{quiz && quiz.perguntas?.length > 0 && (
								<p className="quiz-settings-hint">
									{(() => {
										const total = quiz.perguntas.length;
										const needed = Math.ceil((notaMinima / 10) * total);
										return `Acertar ${needed} de ${total} (${notaMinima}/10)`;
									})()}
								</p>
							)}
						</div>
						<div className="form-field">
							<label className="form-label">Certificado Automático</label>
							<AppSelect
								id="quiz-autocert"
								options={[
									{ value: "false", label: "Não" },
									{ value: "true", label: "Sim (ao aprovar)" },
								]}
								value={autoCert ? "true" : "false"}
								onChange={(v) => setAutoCert(v === "true")}
							/>
						</div>
					</div>
					<div className="quiz-settings-actions">
						<button
							className="btn-primary quiz-settings-action-btn"
							onClick={quiz ? handleUpdateSettings : handleCreateQuiz}
							disabled={saving}
						>
							{saving ? "Salvando..." : quiz ? "Salvar" : "Criar Quiz"}
						</button>
						<button
							className="btn-secondary quiz-settings-action-btn"
							onClick={() => {
								setEditingSettings(false);
								if (!quiz) navigate(-1);
							}}
						>
							Cancelar
						</button>
					</div>
				</div>
			)}

			{!quiz && !editingSettings && (
				<div className="quiz-empty-state">
					<div className="quiz-empty-inner">
						<div className="quiz-empty-emoji">📝</div>
						<h3 className="quiz-empty-title">Esta aula não possui quiz</h3>
						<p className="quiz-empty-desc">Crie um quiz para avaliar o conhecimento dos alunos nesta aula.</p>
						{isAdmin && (
							<button
								className="btn-primary"
								onClick={() => {
									setEditingSettings(true);
									setQuizTitle(`Quiz: ${aula?.titulo || ""}`);
								}}
							>
								Criar Quiz
							</button>
						)}
					</div>
				</div>
			)}

			{quiz && (
				<div className="quiz-editor-main">
					<div className="quiz-editor-sidebar">
						<div className="quiz-editor-sidebar-header">
							<span className="quiz-editor-sidebar-title">Perguntas ({quiz.perguntas?.length || 0})</span>
							{isAdmin && (
								<button className="btn-primary quiz-settings-action-btn" onClick={handleNewQuestion}>
									+ Nova
								</button>
							)}
						</div>
						<div className="quiz-editor-sidebar-list">
							{!quiz.perguntas?.length ? (
								<div className="quiz-editor-sidebar-empty">
									Nenhuma pergunta ainda.
									<br />
									Clique em "+ Nova" para começar.
								</div>
							) : (
								quiz.perguntas.map((p: any, i: number) => (
									<div
										key={p.id}
										onClick={() => isAdmin && handleSelectQuestion(p)}
										className={`quiz-q-item ${activeQuestion === p.id ? "active" : "default"}`}
										onMouseEnter={(e) => {
											if (activeQuestion !== p.id) e.currentTarget.style.background = "#f9fafb";
										}}
										onMouseLeave={(e) => {
											if (activeQuestion !== p.id) e.currentTarget.style.background = "transparent";
										}}
									>
										<div className="quiz-q-item-row">
											<span className={`quiz-q-num ${activeQuestion === p.id ? "active" : "default"}`}>{i + 1}</span>
											<div className="quiz-q-info">
												<p className="quiz-q-text">{p.pergunta}</p>
												<p className="quiz-q-answer">
													Resp: <b>{p.correta}</b>
													{p.opcaoC ? " · 4 opts" : " · 2 opts"}
												</p>
											</div>
											{isAdmin && (
												<button
													onClick={(e) => {
														e.stopPropagation();
														handleDeleteQuestion(p.id);
													}}
													className="quiz-q-delete"
													title="Excluir"
													onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
													onMouseLeave={(e) => (e.currentTarget.style.color = "var(--gray-400)")}
												>
													×
												</button>
											)}
										</div>
									</div>
								))
							)}
						</div>
					</div>

					<div className="quiz-editor-content">
						<div className="quiz-editor-content-header">
							<span className="quiz-editor-content-title">
								{activeQuestion ? `Editando Pergunta` : "Nova Pergunta"}
							</span>
						</div>
						<div className="quiz-editor-content-body">
							<div className="quiz-editor-content-max">
								<div className="form-field">
									<label className="form-label">Pergunta *</label>
									<textarea
										className="form-input quiz-textarea"
										rows={3}
										value={formData.pergunta}
										onChange={(e) => setFormData({ ...formData, pergunta: e.target.value })}
										placeholder="Digite a pergunta..."
									/>
								</div>

								<div className="quiz-opts-grid">
									<div className="form-field">
										<label className="form-label quiz-opt-label">
											<span className={`quiz-opt-letter ${formData.correta === "A" ? "correct" : "default"}`}>A</span>
											Opção A *
										</label>
										<input
											className="form-input"
											value={formData.opcaoA}
											onChange={(e) => setFormData({ ...formData, opcaoA: e.target.value })}
											placeholder="Resposta A"
										/>
									</div>
									<div className="form-field">
										<label className="form-label quiz-opt-label">
											<span className={`quiz-opt-letter ${formData.correta === "B" ? "correct" : "default"}`}>B</span>
											Opção B *
										</label>
										<input
											className="form-input"
											value={formData.opcaoB}
											onChange={(e) => setFormData({ ...formData, opcaoB: e.target.value })}
											placeholder="Resposta B"
										/>
									</div>
									<div className="form-field">
										<label className="form-label quiz-opt-label">
											<span className={`quiz-opt-letter ${formData.correta === "C" ? "correct" : "default"}`}>C</span>
											Opção C
										</label>
										<input
											className="form-input"
											value={formData.opcaoC}
											onChange={(e) => setFormData({ ...formData, opcaoC: e.target.value })}
											placeholder="Opcional"
										/>
									</div>
									<div className="form-field">
										<label className="form-label quiz-opt-label">
											<span className={`quiz-opt-letter ${formData.correta === "D" ? "correct" : "default"}`}>D</span>
											Opção D
										</label>
										<input
											className="form-input"
											value={formData.opcaoD}
											onChange={(e) => setFormData({ ...formData, opcaoD: e.target.value })}
											placeholder="Opcional"
										/>
									</div>
								</div>

								<div className="form-field quiz-correct-picker">
									<label className="form-label">Ordem</label>
									<input
										className="form-input"
										type="number"
										min="0"
										value={formData.ordem}
										onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value, 10) || 0 })}
									/>
									<div style={{ fontSize: "12px", color: "var(--gray-500)", marginTop: "4px" }}>
										Menor número aparece primeiro (0 = primeiro).
									</div>
								</div>

								<div className="form-field quiz-correct-picker">
									<label className="form-label">Resposta Correta</label>
									<div className="quiz-correct-opts">
										{["A", "B", ...(formData.opcaoC ? ["C"] : []), ...(formData.opcaoD ? ["D"] : [])].map((opt) => (
											<button
												key={opt}
												type="button"
												onClick={() => setFormData({ ...formData, correta: opt })}
												className={`quiz-correct-opt ${formData.correta === opt ? "selected" : ""}`}
											>
												{opt}
											</button>
										))}
									</div>
								</div>

								{isAdmin && (
									<div className="quiz-editor-save-row">
										<button className="btn-primary quiz-editor-save-btn" onClick={handleSaveQuestion} disabled={saving}>
											{saving ? "Salvando..." : activeQuestion ? "Salvar Alterações" : "+ Adicionar Pergunta"}
										</button>
										{activeQuestion && (
											<button className="btn-secondary quiz-editor-save-btn" onClick={handleNewQuestion}>
												Cancelar
											</button>
										)}
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			)}

			<style>{`
        @media (max-width: 768px) {
          .quiz-editor-main > div:first-child {
            width: 100% !important;
            min-width: 0 !important;
            border-right: none !important;
            border-bottom: 1px solid var(--gray-200) !important;
            max-height: 40vh;
          }
        }
      `}</style>
		</div>
	);
}

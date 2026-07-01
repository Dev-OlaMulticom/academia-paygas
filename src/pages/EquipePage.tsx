import { useCallback, useEffect, useState } from "react";
import { useToast } from "../components/Toast";
import { PERSONAS } from "../data/constants";
import { useAbility } from "../hooks/useAbility";
import type { User } from "../hooks/useAuth";
import { api } from "../lib/api";
import { XP_PER_LEVEL } from "../lib/constants";
import { pluralize } from "../lib/utils";

interface EquipePageProps {
	user: User;
}

export function EquipePage({ user: _user }: EquipePageProps) {
	const { isAdmin, isGestor } = useAbility();
	const { toast } = useToast();
	const [teamData, setTeamData] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [expandedUser, setExpandedUser] = useState<string | null>(null);
	const [detailData, setDetailData] = useState<any[]>([]);
	const [_loadingDetail, setLoadingDetail] = useState(false);
	const [approving, setApproving] = useState<string | null>(null);
	const [expandedModulo, setExpandedModulo] = useState<Record<string, boolean>>({});
	const [expandedAula, setExpandedAula] = useState<Record<string, boolean>>({});

	const loadEquipe = async () => {
		try {
			const data = await api.getEquipe();
			setTeamData(data);
		} catch {
			setTeamData([]);
		} finally {
			setLoading(false);
		}
	};

	const loadDetail = useCallback(async () => {
		try {
			setLoadingDetail(true);
			const data = await api.getEquipeDetalhe();
			setDetailData(data);
		} catch {
			setDetailData([]);
		} finally {
			setLoadingDetail(false);
		}
	}, []);

	useEffect(() => {
		loadEquipe();
	}, [loadEquipe]);
	useEffect(() => {
		if (!loading) loadDetail();
	}, [loading, loadDetail]);

	const handleAutoApprove = async (
		userId: string,
		tipo: "quiz" | "aula" | "modulo",
		targetId: string,
		label: string,
	) => {
		const key = `${tipo}-${targetId}`;
		try {
			setApproving(key);
			await api.autoApprove(userId, tipo, targetId);
			toast(`${label} aprovado(a) com sucesso!`, "success");
			await loadDetail();
		} catch (err: any) {
			toast(err.message || "Erro ao aprovar", "error");
		} finally {
			setApproving(null);
		}
	};

	const handleFixCert = async (userId: string, moduloId: string, moduloTitulo: string) => {
		const key = `fix-cert-${moduloId}`;
		try {
			setApproving(key);
			await api.fixCert(userId, moduloId);
			toast(`Certificado do modulo "${moduloTitulo}" corrigido!`, "success");
			await loadDetail();
		} catch (err: any) {
			toast(err.message || "Erro ao corrigir certificado", "error");
		} finally {
			setApproving(null);
		}
	};

	const handleFixNotify = async (userId: string, nome: string, moduloTitulo: string) => {
		const key = `fix-notify-${moduloTitulo}`;
		try {
			setApproving(key);
			await api.fixNotify(
				userId,
				"Modulo Completo",
				`${nome} completou o modulo "${moduloTitulo}" e recebeu o certificado.`,
			);
			toast(`Notificacao enviada ao gestor sobre ${nome}!`, "success");
			await loadDetail();
		} catch (err: any) {
			toast(err.message || "Erro ao enviar notificacao", "error");
		} finally {
			setApproving(null);
		}
	};

	if (loading) {
		return (
			<div className="page active">
				<div className="page-header">
					<div className="page-title">Carregando...</div>
				</div>
			</div>
		);
	}

	const getDetailForUser = (userId: string) => detailData.find((d: any) => d.id === userId);

	const toggleModulo = (key: string) => {
		setExpandedModulo((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	const toggleAula = (key: string) => {
		setExpandedAula((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	const renderUserDetail = (memberId: string) => {
		const detail = getDetailForUser(memberId);
		if (!detail) return <div className="eq-detail-loading">Carregando detalhes...</div>;

		return (
			<div className="eq-detail">
				{detail.modulos?.map((mod: any) => {
					const pct = mod.totalAulas > 0 ? Math.round((mod.aulasConcluidas / mod.totalAulas) * 100) : 0;
					const modKey = `${memberId}-${mod.id}`;
					const isModExpanded = expandedModulo[modKey];

					return (
						<div key={mod.id} className="eq-detail-mod">
							<div className="eq-detail-mod-header" onClick={() => toggleModulo(modKey)}>
								<div className="eq-detail-mod-info">
									<b className="eq-detail-mod-title">{mod.titulo}</b>
									<span
										className="eq-detail-mod-pct"
										style={{ color: pct === 100 ? "var(--pg-green)" : "var(--gray-500)" }}
									>
										{mod.aulasConcluidas}/{mod.totalAulas} aulas ({pct}%)
									</span>
									{mod.quizzesTotal > 0 && (
										<span
											className="eq-detail-mod-quiz-count"
											style={{
												color: mod.quizzesAprovados === mod.quizzesTotal ? "var(--pg-green)" : "var(--gray-500)",
											}}
										>
											{mod.quizzesAprovados}/{mod.quizzesTotal} quizzes aprovados
										</span>
									)}
									{mod.autoProcessStatus?.certGenerated && (
										<span className="eq-detail-mod-cert">
											<i className="icon-award icon-xs" /> Cert: {mod.autoProcessStatus.certStatus}
										</span>
									)}
								</div>
								<div className="eq-detail-mod-right">
									{(isAdmin || isGestor) && mod.autoProcessStatus?.issues?.length > 0 && (
										<span className="eq-issue-badge">
											<i className="icon-alert-triangle icon-xs" /> {mod.autoProcessStatus.issues.length}
										</span>
									)}
									{(isAdmin || isGestor) && pct < 100 && (
										<button
											className="btn-secondary eq-auto-btn"
											disabled={approving === `modulo-${mod.id}`}
											onClick={(e) => {
												e.stopPropagation();
												handleAutoApprove(memberId, "modulo", mod.id, `Modulo "${mod.titulo}"`);
											}}
										>
											{approving === `modulo-${mod.id}` ? (
												<i className="icon-loader icon-xs" />
											) : (
												<i className="icon-check-circle icon-xs" />
											)}
											Aprovar Modulo
										</button>
									)}
									<i
										className={`icon-chevron-${isModExpanded ? "up" : "down"} icon-sm`}
										style={{ color: "var(--gray-400)" }}
									/>
								</div>
							</div>

							<div className="eq-detail-mod-bar">
								<div className="eq-detail-mod-bar-fill" style={{ width: `${pct}%` }} />
							</div>

							{isModExpanded && (
								<>
									{(isAdmin || isGestor) && mod.autoProcessStatus?.issues?.length > 0 && (
										<div className="eq-audit-panel">
											<div className="eq-audit-header">
												<i className="icon-alert-triangle icon-sm" style={{ color: "#E65100" }} />
												<b>Problemas detectados</b>
											</div>
											{mod.autoProcessStatus.issues.map((issue: string, idx: number) => (
												<div key={idx} className="eq-audit-issue">
													{issue}
												</div>
											))}
											<div className="eq-audit-actions">
												{mod.autoProcessStatus.certExpected && !mod.autoProcessStatus.certGenerated && (
													<button
														className="btn-secondary eq-audit-fix-btn"
														disabled={approving === `fix-cert-${mod.id}`}
														onClick={() => handleFixCert(memberId, mod.id, mod.titulo)}
													>
														{approving === `fix-cert-${mod.id}` ? (
															<i className="icon-loader icon-xs" />
														) : (
															<i className="icon-award icon-xs" />
														)}
														Gerar Certificado
													</button>
												)}
												{!mod.autoProcessStatus.notificationSent && mod.allAulasCompleted && mod.allQuizzesPassed && (
													<button
														className="btn-secondary eq-audit-fix-btn"
														disabled={approving === `fix-notify-${mod.titulo}`}
														onClick={() => handleFixNotify(memberId, detail.nome, mod.titulo)}
													>
														{approving === `fix-notify-${mod.titulo}` ? (
															<i className="icon-loader icon-xs" />
														) : (
															<i className="icon-bell icon-xs" />
														)}
														Enviar Notificacao
													</button>
												)}
											</div>
										</div>
									)}

									{mod.autoProcessStatus?.certGenerated && (
										<div className="eq-audit-ok">
											<i className="icon-check-circle icon-xs" style={{ color: "#2E7D32" }} />
											<span>Certificado: {mod.autoProcessStatus.certStatus}</span>
											{mod.autoProcessStatus.notificationSent && (
												<>
													<i className="icon-bell icon-xs" style={{ color: "#2E7D32", marginLeft: 8 }} /> Notificado
												</>
											)}
										</div>
									)}

									<div className="eq-detail-aulas">
										{mod.aulas?.map((aula: any) => {
											const aulaKey = `${memberId}-${aula.id}`;
											const isAulaExpanded = expandedAula[aulaKey];
											const quiz = aula.quiz;
											const qr = aula.quizResultado;

											return (
												<div key={aula.id} className={`eq-detail-aula ${aula.concluido ? "completed" : ""}`}>
													<div
														className="eq-detail-aula-header"
														onClick={() => (quiz ? toggleAula(aulaKey) : undefined)}
													>
														<i
															className={aula.concluido ? "icon-check-circle icon-xs" : "icon-circle icon-xs"}
															style={{ color: aula.concluido ? "var(--pg-green)" : "var(--gray-300)", flexShrink: 0 }}
														/>
														<div className="eq-detail-aula-info">
															<span className="eq-detail-aula-name">{aula.titulo}</span>
															<span className="eq-detail-aula-type">{aula.tipo === "VIDEO" ? "Video" : "PDF"}</span>
														</div>
														{quiz && (
															<div className="eq-detail-aula-quiz">
																{qr ? (
																	<span className={`eq-quiz-badge ${qr.concluido ? "approved" : "failed"}`}>
																		{qr.concluido ? (
																			<>
																				<i className="icon-check icon-xs" /> {qr.nota}/{qr.total}
																			</>
																		) : (
																			<>
																				<i className="icon-x icon-xs" /> {qr.nota}/{qr.total}
																			</>
																		)}
																	</span>
																) : (
																	<span className="eq-quiz-badge pending">Nao resolvido</span>
																)}
																{(isAdmin || isGestor) && !qr?.concluido && (
																	<button
																		className="btn-secondary eq-auto-btn-sm"
																		disabled={approving === `quiz-${quiz.id}`}
																		onClick={(e) => {
																			e.stopPropagation();
																			handleAutoApprove(memberId, "quiz", quiz.id, `Quiz "${aula.titulo}"`);
																		}}
																	>
																		{approving === `quiz-${quiz.id}` ? (
																			<i className="icon-loader icon-xs" />
																		) : (
																			<i className="icon-check icon-xs" />
																		)}
																	</button>
																)}
																{quiz && (
																	<i
																		className={`icon-chevron-${isAulaExpanded ? "up" : "down"} icon-xs`}
																		style={{ color: "var(--gray-400)" }}
																	/>
																)}
															</div>
														)}
														{!quiz && (isAdmin || isGestor) && !aula.concluido && (
															<button
																className="btn-secondary eq-auto-btn-sm"
																disabled={approving === `aula-${aula.id}`}
																onClick={(e) => {
																	e.stopPropagation();
																	handleAutoApprove(memberId, "aula", aula.id, `Aula "${aula.titulo}"`);
																}}
															>
																{approving === `aula-${aula.id}` ? (
																	<i className="icon-loader icon-xs" />
																) : (
																	<i className="icon-check icon-xs" />
																)}
															</button>
														)}
													</div>

													{isAulaExpanded && quiz && (
														<div className="eq-detail-quiz-body">
															<div className="eq-detail-quiz-meta">
																Nota minima: {quiz.notaMinima}/10 | {quiz.totalPerguntas}{" "}
																{pluralize(quiz.totalPerguntas, "pergunta")}
															</div>

															{qr?.respostas && (
																<div className="eq-detail-quiz-answers">
																	{quiz.perguntas?.map((pergunta: any, idx: number) => {
																		const userAnswer = qr.respostas[pergunta.id];
																		const isCorrect = userAnswer === pergunta.correta;
																		return (
																			<div
																				key={pergunta.id}
																				className={`eq-detail-answer ${isCorrect ? "correct" : "wrong"}`}
																			>
																				<span className="eq-detail-answer-icon">{isCorrect ? "✓" : "✗"}</span>
																				<div className="eq-detail-answer-content">
																					<span className="eq-detail-answer-q">
																						{idx + 1}. {pergunta.pergunta}
																					</span>
																					<span className="eq-detail-answer-opts">
																						<span className="eq-detail-answer-user">
																							Resp: <b>{userAnswer || "-"}</b>
																						</span>
																						{!isCorrect && (
																							<span className="eq-detail-answer-correct">
																								Correta: <b>{pergunta.correta}</b>
																							</span>
																						)}
																					</span>
																				</div>
																			</div>
																		);
																	})}
																</div>
															)}

															{qr && !qr.respostas && (
																<div className="eq-detail-quiz-no-answers">
																	Respostas individuais nao disponiveis (quiz resolvido antes da atualizacao)
																</div>
															)}

															{!qr && (
																<div className="eq-detail-quiz-no-answers">
																	Este quiz ainda nao foi resolvido por este atendente.
																</div>
															)}
														</div>
													)}
												</div>
											);
										})}
									</div>
								</>
							)}
						</div>
					);
				})}
			</div>
		);
	};

	const renderAtendenteRow = (member: any, i: number) => {
		const memberXp = member.xp || 0;
		const level = Math.floor(memberXp / XP_PER_LEVEL) + 1;
		const isExpanded = expandedUser === member.id;
		const detail = getDetailForUser(member.id);
		const totalMods = detail?.modulos?.length || 0;
		const completedMods =
			detail?.modulos?.filter((m: any) => m.aulasConcluidas === m.totalAulas && m.totalAulas > 0).length || 0;
		const totalQuizzes = detail?.modulos?.reduce((sum: number, m: any) => sum + (m.quizzesTotal || 0), 0) || 0;
		const passedQuizzes = detail?.modulos?.reduce((sum: number, m: any) => sum + (m.quizzesAprovados || 0), 0) || 0;

		return (
			<div key={member.id || i} className={`eq-user-card ${isExpanded ? "expanded" : ""}`}>
				<div className="eq-user-row" onClick={() => setExpandedUser(isExpanded ? null : member.id)}>
					<div className="eq-avatar">
						<div className="user-avatar eq-avatar-img" style={{ background: PERSONAS.ATENDENTE?.color || "#8b5cf6" }}>
							{member.nome
								.split(" ")
								.map((n: string) => n[0])
								.slice(0, 2)
								.join("")}
						</div>
						<div>
							<b className="eq-name">{member.nome}</b>
							<div className="eq-email">{member.email}</div>
						</div>
					</div>
					<div className="eq-user-stats">
						<div className="eq-user-stat">
							<span className="eq-level-badge">Lv. {level}</span>
						</div>
						<div className="eq-user-stat">
							<span className="eq-xp">{memberXp} XP</span>
						</div>
						<div className="eq-user-stat eq-user-stat-progress">
							<div className="progress-mini">
								<div
									className={`progress-mini-fill ${(member.progress || 0) === 100 ? "done" : ""}`}
									style={{ width: `${member.progress || 0}%` }}
								/>
							</div>
							<span className="eq-progress-pct">{member.progress || 0}%</span>
						</div>
						{detail && (
							<>
								<div className="eq-user-stat">
									<span className={`eq-mod-badge ${completedMods === totalMods && totalMods > 0 ? "done" : ""}`}>
										{completedMods}/{totalMods} {pluralize(totalMods, "modulo")}
									</span>
								</div>
								{totalQuizzes > 0 && (
									<div className="eq-user-stat">
										<span
											className={`eq-quiz-stat ${passedQuizzes === totalQuizzes && totalQuizzes > 0 ? "done" : ""}`}
										>
											{passedQuizzes}/{totalQuizzes} quizzes
										</span>
									</div>
								)}
							</>
						)}
						<span className={`status-pill ${(member.certCount || 0) > 0 ? "pill-green" : "pill-gray"}`}>
							{(member.certCount || 0) > 0 ? (
								<>
									<i className="icon-check icon-xs" />
									{member.certCount}
								</>
							) : (
								"Pendente"
							)}
						</span>
						<span className={`status-pill ${member.ativo !== false ? "pill-green" : "pill-gray"}`}>
							{member.ativo !== false ? "Ativo" : "Inativo"}
						</span>
						<i className={`icon-chevron-${isExpanded ? "up" : "down"} icon-sm`} style={{ color: "var(--gray-400)" }} />
					</div>
				</div>
				{isExpanded && renderUserDetail(member.id)}
			</div>
		);
	};

	if (isGestor) {
		const members = Array.isArray(teamData) ? teamData : [];
		return (
			<div className="page active">
				<div className="page-header">
					<div>
						<div className="page-title">Minha Equipe</div>
						<div className="page-subtitle">{members.length} atendente(s) atribuido(s)</div>
					</div>
				</div>
				{members.length > 0 ? (
					<div className="eq-users-list">{members.map(renderAtendenteRow)}</div>
				) : (
					<div className="empty-state">
						<div className="empty-icon">👥</div>
						<p>Nenhum atendente atribuido a sua equipe.</p>
					</div>
				)}
			</div>
		);
	}

	const teams = Array.isArray(teamData) ? teamData : [];
	const totalMembros = teams.reduce((sum: number, t: any) => sum + (t.totalMembros || 0), 0);

	return (
		<div className="page active">
			<div className="page-header">
				<div>
					<div className="page-title">Equipes</div>
					<div className="page-subtitle">
						{teams.length} gestor(es) • {totalMembros} atendente(s) no total
					</div>
				</div>
			</div>

			{teams.length === 0 ? (
				<div className="empty-state">
					<div className="empty-icon">👥</div>
					<p>Nenhuma equipe criada ainda.</p>
				</div>
			) : (
				teams.map((team: any, idx: number) => (
					<div key={team.gestor?.id || idx} className="eq-team-section">
						{team.gestor && (
							<div className="eq-team-header">
								<div
									className="user-avatar eq-team-avatar"
									style={{ background: PERSONAS.GESTOR?.color || "var(--pg-gold)" }}
								>
									{team.gestor.nome
										?.split(" ")
										.map((n: string) => n[0])
										.slice(0, 2)
										.join("") || "?"}
								</div>
								<div className="eq-team-info">
									<div className="eq-team-name">{team.gestor.nome}</div>
									<div className="eq-team-email">{team.gestor.email}</div>
								</div>
								<span className="eq-team-count">{team.totalMembros} atendente(s)</span>
							</div>
						)}
						{team.membros?.length > 0 ? (
							<div className="eq-users-list">{team.membros.map(renderAtendenteRow)}</div>
						) : (
							<div className="eq-team-empty">Nenhum atendente nesta equipe</div>
						)}
					</div>
				))
			)}
		</div>
	);
}

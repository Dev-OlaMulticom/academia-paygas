import { useCallback, useEffect, useMemo, useState } from "react";
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

type SortKey = "nome" | "estabelecimento";

interface MemberStat {
	cursosConcl: number;
	aulasConcl: number;
	aulasTotal: number;
	pctAulas: number;
	quizzesAprov: number;
	quizzesTotal: number;
	notaMedia: string;
}

interface ExportRow {
	nome: string;
	email: string;
	gestor: string;
	estabelecimento: string;
	local: string;
	xp: number | string;
	nivel: number | string;
	certificados: number | string;
	cursosConcl: number | string;
	aulasConcl: number | string;
	aulasTotal: number | string;
	pctAulas: string;
	quizzesAprov: number | string;
	quizzesTotal: number | string;
	notaMedia: string;
	status: string;
}

const EXPORT_COLUMNS: { key: keyof ExportRow; header: string; w: number; adminOnly?: boolean }[] = [
	{ key: "nome", header: "Nome", w: 3 },
	{ key: "email", header: "Email", w: 3 },
	{ key: "gestor", header: "Gestor / Equipe", w: 2, adminOnly: true },
	{ key: "estabelecimento", header: "Estabelecimento", w: 2 },
	{ key: "local", header: "Cidade/UF", w: 1.5 },
	{ key: "xp", header: "XP", w: 1 },
	{ key: "nivel", header: "Nivel", w: 1 },
	{ key: "certificados", header: "Certificados", w: 1.2 },
	{ key: "cursosConcl", header: "Cursos Concl.", w: 1.3 },
	{ key: "aulasConcl", header: "Aulas Concl.", w: 1.3 },
	{ key: "aulasTotal", header: "Aulas Total", w: 1.3 },
	{ key: "pctAulas", header: "% Aulas", w: 1.2 },
	{ key: "quizzesAprov", header: "Quizzes Aprov.", w: 1.4 },
	{ key: "quizzesTotal", header: "Quizzes Total", w: 1.4 },
	{ key: "notaMedia", header: "Nota Media", w: 1.3 },
	{ key: "status", header: "Status", w: 1.3 },
];

const localeCompare = (a: string, b: string) => a.localeCompare(b, "pt-BR", { sensitivity: "base" });

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
	const [sortBy, setSortBy] = useState<SortKey>("nome");
	const [exporting, setExporting] = useState<null | "csv" | "pdf">(null);
	const [search, setSearch] = useState("");

	const matchSearch = useCallback((m: any, q: string) => {
		if (!q) return true;
		const term = q.toLowerCase();
		return (
			(m.nome || "").toLowerCase().includes(term) ||
			(m.email || "").toLowerCase().includes(term) ||
			(m.estabelecimento?.nome || "").toLowerCase().includes(term) ||
			`${m.estabelecimento?.cidade || ""} ${m.estabelecimento?.uf || ""}`.toLowerCase().includes(term)
		);
	}, []);

	const teamMatchesSearch = useCallback(
		(team: any, q: string) => {
			if (!q) return true;
			const term = q.toLowerCase();
			if ((team.gestor?.nome || "").toLowerCase().includes(term)) return true;
			if ((team.gestor?.email || "").toLowerCase().includes(term)) return true;
			return (team.membros || []).some((m: any) => matchSearch(m, q));
		},
		[matchSearch],
	);

	const loadEquipe = useCallback(async () => {
		try {
			const data = await api.getEquipe();
			setTeamData(data);
		} catch {
			setTeamData([]);
		} finally {
			setLoading(false);
		}
	}, []);

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
		tipo: "quiz" | "aula" | "curso",
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

	const handleFixCert = async (userId: string, cursoId: string, cursoTitulo: string) => {
		const key = `fix-cert-${cursoId}`;
		try {
			setApproving(key);
			await api.fixCert(userId, cursoId);
			toast(`Certificado do curso "${cursoTitulo}" corrigido!`, "success");
			await loadDetail();
		} catch (err: any) {
			toast(err.message || "Erro ao corrigir certificado", "error");
		} finally {
			setApproving(null);
		}
	};

	const handleFixNotify = async (userId: string, nome: string, cursoTitulo: string) => {
		const key = `fix-notify-${cursoTitulo}`;
		try {
			setApproving(key);
			await api.fixNotify(
				userId,
				"Curso Completo",
				`${nome} completou o curso "${cursoTitulo}" e recebeu o certificado.`,
			);
			toast(`Notificacao enviada ao gestor sobre ${nome}!`, "success");
			await loadDetail();
		} catch (err: any) {
			toast(err.message || "Erro ao enviar notificacao", "error");
		} finally {
			setApproving(null);
		}
	};

	const computeStat = useCallback((detail: any): MemberStat => {
		const cursos = detail?.cursos || [];
		const aulasTotal = cursos.reduce((s: number, c: any) => s + (c.totalAulas || 0), 0);
		const aulasConcl = cursos.reduce((s: number, c: any) => s + (c.aulasConcluidas || 0), 0);
		const cursosConcl = cursos.filter((c: any) => c.totalAulas > 0 && c.aulasConcluidas === c.totalAulas).length;
		const quizzesTotal = cursos.reduce((s: number, c: any) => s + (c.quizzesTotal || 0), 0);
		const quizzesAprov = cursos.reduce((s: number, c: any) => s + (c.quizzesAprovados || 0), 0);
		let soma = 0;
		let count = 0;
		cursos.forEach((c: any) =>
			(c.aulas || []).forEach((a: any) => {
				if (a.quizResultado && typeof a.quizResultado.nota === "number") {
					soma += a.quizResultado.nota;
					count += 1;
				}
			}),
		);
		const pctAulas = aulasTotal > 0 ? Math.round((aulasConcl / aulasTotal) * 100) : 0;
		return {
			cursosConcl,
			aulasConcl,
			aulasTotal,
			pctAulas,
			quizzesAprov,
			quizzesTotal,
			notaMedia: count > 0 ? (soma / count).toFixed(1) : "-",
		};
	}, []);

	const sortMembers = useCallback(
		(arr: any[]) =>
			[...arr].sort((a: any, b: any) => {
				if (sortBy === "estabelecimento") {
					const ea = a.estabelecimento?.nome || "";
					const eb = b.estabelecimento?.nome || "";
					if (ea !== eb) return localeCompare(ea, eb);
					return localeCompare(a.nome || "", b.nome || "");
				}
				return localeCompare(a.nome || "", b.nome || "");
			}),
		[sortBy],
	);

	const buildExportRows = useCallback(
		(members: any[], gestor: string): ExportRow[] => {
			const rows: ExportRow[] = members.map((m: any) => {
				const detail = detailData.find((d: any) => d.id === m.id);
				const st = computeStat(detail);
				const memberXp = m.xp || 0;
				const level = Math.floor(memberXp / XP_PER_LEVEL) + 1;
				return {
					nome: m.nome || "",
					email: m.email || "",
					gestor,
					estabelecimento: m.estabelecimento?.nome || "-",
					local: [m.estabelecimento?.cidade, m.estabelecimento?.uf].filter(Boolean).join("/") || "-",
					xp: memberXp,
					nivel: level,
					certificados: m.certCount || 0,
					cursosConcl: st.cursosConcl,
					aulasConcl: st.aulasConcl,
					aulasTotal: st.aulasTotal,
					pctAulas: `${st.pctAulas}%`,
					quizzesAprov: st.quizzesAprov,
					quizzesTotal: st.quizzesTotal,
					notaMedia: st.notaMedia,
					status: m.ativo !== false ? "Ativo" : "Inativo",
				};
			});
			return sortMembers(rows);
		},
		[detailData, computeStat, sortMembers],
	);

	const allExportRows = useMemo<ExportRow[]>(() => {
		if (isGestor) {
			return buildExportRows(Array.isArray(teamData) ? teamData : [], "-");
		}
		const teams = Array.isArray(teamData) ? teamData : [];
		return teams.reduce((acc: ExportRow[], t: any) => {
			const gestor = t.gestor?.nome || "Sem gestor";
			return acc.concat(buildExportRows(t.membros || [], gestor));
		}, []);
	}, [teamData, isGestor, buildExportRows]);

	const summary = useMemo(() => {
		const total = allExportRows.length;
		const concluidos = allExportRows.filter(
			(r) => r.status === "Ativo" && Number(r.pctAulas.replace("%", "")) === 100,
		).length;
		const certificados = allExportRows.reduce((s, r) => s + Number(r.certificados || 0), 0);
		const pctSoma = allExportRows.reduce((s, r) => s + Number(r.pctAulas.replace("%", "")), 0);
		const avgProgress = total > 0 ? Math.round(pctSoma / total) : 0;
		return { total, concluidos, certificados, avgProgress };
	}, [allExportRows]);

	const exportCsv = useCallback(
		(rows: ExportRow[], fileNameSuffix = "") => {
			try {
				setExporting("csv");
				const cols = EXPORT_COLUMNS.filter((c) => !c.adminOnly || isAdmin);
				const headers = cols.map((c) => c.header);
				const escape = (v: any) => {
					const s = String(v ?? "");
					return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
				};
				const lines = [headers.join(";"), ...rows.map((r) => cols.map((c) => escape(r[c.key])).join(";"))];
				const csv = "﻿" + lines.join("\n");
				const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `equipe${fileNameSuffix}-${new Date().toISOString().slice(0, 10)}.csv`;
				a.click();
				URL.revokeObjectURL(url);
				toast("CSV exportado com sucesso!", "success");
			} catch (err) {
				toast("Erro ao exportar CSV", "error");
			} finally {
				setExporting(null);
			}
		},
		[allExportRows, isAdmin, toast],
	);

	const exportPdf = useCallback(
		async (rows: ExportRow[], fileNameSuffix = "") => {
			try {
				setExporting("pdf");
				const jsPDF = (await import("jspdf")).default;
				const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
				const pageW = doc.internal.pageSize.getWidth();
				const pageH = doc.internal.pageSize.getHeight();
				const margin = 8;
				const pad = 1.5;
				const lineH = 4;

				const cols = EXPORT_COLUMNS.filter((c) => !c.adminOnly || isAdmin);
				const headers = cols.map((c) => c.header);
				const weights = cols.map((c) => c.w);
				const totalWeight = weights.reduce((a, b) => a + b, 0);
				const avail = pageW - margin * 2;
				const colW = weights.map((w) => Math.max(12, (w / totalWeight) * avail));

				doc.setFontSize(11);
				doc.setFont("helvetica", "bold");
				doc.text(isGestor ? "Relatorio da Equipe" : "Relatorio de Equipes", margin, margin);
				doc.setFontSize(8);
				doc.setFont("helvetica", "normal");
				doc.setTextColor(90, 90, 90);
				doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")} • ${rows.length} atendente(s)`, margin, margin + 5);
				doc.setTextColor(30, 30, 30);

				let y = margin + 12;

				const drawHeader = () => {
					doc.setFont("helvetica", "bold");
					doc.setFontSize(7);
					doc.setFillColor(20, 30, 50);
					doc.setTextColor(255, 255, 255);
					const headerLines = headers.map((h, i) => doc.splitTextToSize(h, colW[i] - pad * 2));
					const hH = Math.max(...headerLines.map((t) => t.length)) * lineH + pad * 2;
					doc.rect(
						margin,
						y,
						colW.reduce((a, b) => a + b, 0),
						hH,
						"F",
					);
					let x = margin;
					headerLines.forEach((lines, i) => {
						lines.forEach((ln: string, li: number) => doc.text(ln, x + pad, y + pad + li * lineH + 3));
						x += colW[i];
					});
					y += hH;
				};

				drawHeader();

				rows.forEach((row, ri) => {
					const cellLines = headers.map((_h, i) =>
						doc.splitTextToSize(String(row[cols[i].key] ?? ""), colW[i] - pad * 2),
					);
					const rowH = Math.max(...cellLines.map((t) => t.length)) * lineH + pad * 2;
					if (y + rowH > pageH - margin) {
						doc.addPage();
						y = margin;
						drawHeader();
					}
					if (ri % 2 === 1) {
						doc.setFillColor(245, 245, 245);
						doc.rect(
							margin,
							y,
							colW.reduce((a, b) => a + b, 0),
							rowH,
							"F",
						);
					}
					doc.setFont("helvetica", "normal");
					doc.setFontSize(7);
					doc.setTextColor(30, 30, 30);
					let x = margin;
					cellLines.forEach((lines, i) => {
						lines.forEach((ln: string, li: number) => doc.text(ln, x + pad, y + pad + li * lineH + 3));
						x += colW[i];
					});
					y += rowH;
				});

				doc.save(`equipe-${new Date().toISOString().slice(0, 10)}.pdf`);
				toast("PDF exportado com sucesso!", "success");
			} catch (err) {
				toast("Erro ao exportar PDF", "error");
			} finally {
				setExporting(null);
			}
		},
		[allExportRows, isAdmin, isGestor, toast],
	);

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
				{detail.cursos?.map((mod: any) => {
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
											disabled={approving === `curso-${mod.id}`}
											onClick={(e) => {
												e.stopPropagation();
												handleAutoApprove(memberId, "curso", mod.id, `Curso "${mod.titulo}"`);
											}}
										>
											{approving === `curso-${mod.id}` ? (
												<i className="icon-loader icon-xs" />
											) : (
												<i className="icon-check-circle icon-xs" />
											)}
											Aprovar Curso
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
		const totalMods = detail?.cursos?.length || 0;
		const completedMods =
			detail?.cursos?.filter((m: any) => m.aulasConcluidas === m.totalAulas && m.totalAulas > 0).length || 0;
		const totalQuizzes = detail?.cursos?.reduce((sum: number, m: any) => sum + (m.quizzesTotal || 0), 0) || 0;
		const passedQuizzes = detail?.cursos?.reduce((sum: number, m: any) => sum + (m.quizzesAprovados || 0), 0) || 0;
		const stat = computeStat(detail);

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
							{member.estabelecimento?.nome && (
								<div className="eq-email eq-estabelecimento">
									<i className="icon-building icon-xs" /> {member.estabelecimento.nome}
								</div>
							)}
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
										{completedMods}/{totalMods} {pluralize(totalMods, "curso")}
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
								<div className="eq-user-stat">
									<span className="eq-note-badge" title="Nota media dos quizzes">
										⌀ {stat.notaMedia}
									</span>
								</div>
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

	const renderToolbar = () => (
		<div className="eq-toolbar">
			<div className="eq-toolbar-group eq-toolbar-search">
				<i className="icon-search icon-sm" />
				<input
					className="eq-search-input"
					type="text"
					placeholder="Buscar por nome, e-mail ou estabelecimento..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
				{search && (
					<button className="eq-search-clear" onClick={() => setSearch("")} title="Limpar">
						<i className="icon-x icon-xs" />
					</button>
				)}
			</div>
			<div className="eq-toolbar-group">
				<span className="eq-toolbar-label">Ordenar por:</span>
				<button className={`eq-sort-btn ${sortBy === "nome" ? "active" : ""}`} onClick={() => setSortBy("nome")}>
					<i className="icon-sort-alpha icon-xs" /> Nome
				</button>
				<button
					className={`eq-sort-btn ${sortBy === "estabelecimento" ? "active" : ""}`}
					onClick={() => setSortBy("estabelecimento")}
				>
					<i className="icon-building icon-xs" /> Estabelecimento
				</button>
			</div>
			{isGestor && (
				<div className="eq-toolbar-group">
					<button className="eq-export-btn" disabled={exporting !== null} onClick={() => exportCsv(allExportRows)}>
						{exporting === "csv" ? <i className="icon-loader icon-xs" /> : <i className="icon-download icon-xs" />}
						CSV
					</button>
					<button className="eq-export-btn" disabled={exporting !== null} onClick={() => exportPdf(allExportRows)}>
						{exporting === "pdf" ? <i className="icon-loader icon-xs" /> : <i className="icon-file-text icon-xs" />}
						PDF
					</button>
				</div>
			)}
		</div>
	);

	const renderSummary = () => (
		<div className="eq-summary">
			<div className="eq-summary-card">
				<span className="eq-summary-value">{summary.total}</span>
				<span className="eq-summary-label">Atendentes</span>
			</div>
			<div className="eq-summary-card">
				<span className="eq-summary-value">{summary.avgProgress}%</span>
				<span className="eq-summary-label">Progresso medio</span>
			</div>
			<div className="eq-summary-card">
				<span className="eq-summary-value">{summary.concluidos}</span>
				<span className="eq-summary-label">100% concluido</span>
			</div>
			<div className="eq-summary-card">
				<span className="eq-summary-value">{summary.certificados}</span>
				<span className="eq-summary-label">Certificados</span>
			</div>
		</div>
	);

	if (isGestor) {
		const members = sortMembers((Array.isArray(teamData) ? teamData : []).filter((m: any) => matchSearch(m, search)));
		return (
			<div className="page active">
				<div className="page-header">
					<div>
						<div className="page-title">Minha Equipe</div>
						<div className="page-subtitle">{members.length} atendente(s) atribuido(s)</div>
					</div>
				</div>
				{renderSummary()}
				{renderToolbar()}
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
	const sortedTeams = [...teams].sort((a: any, b: any) => localeCompare(a.gestor?.nome || "", b.gestor?.nome || ""));
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
			{renderSummary()}
			{renderToolbar()}

			{teams.length === 0 ? (
				<div className="empty-state">
					<div className="empty-icon">👥</div>
					<p>Nenhuma equipe criada ainda.</p>
				</div>
			) : (
				sortedTeams
					.filter((team: any) => teamMatchesSearch(team, search))
					.map((team: any, idx: number) => {
						const membros = sortMembers((team.membros || []).filter((m: any) => matchSearch(m, search)));
						const gestorNome = team.gestor?.nome || "sem-gestor";
						const fileSuffix = `-${gestorNome
							.normalize("NFD")
							.replace(/[̀-ͯ]/g, "")
							.toLowerCase()
							.replace(/[^a-z0-9]+/g, "-")
							.replace(/(^-|-$)/g, "")}`;
						return (
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
										<span className="eq-team-count">{membros.length} atendente(s)</span>
										<div className="eq-team-export">
											<button
												className="eq-export-btn eq-export-btn-sm"
												disabled={exporting !== null}
												onClick={() => exportCsv(buildExportRows(team.membros || [], gestorNome), fileSuffix)}
											>
												{exporting === "csv" ? (
													<i className="icon-loader icon-xs" />
												) : (
													<i className="icon-download icon-xs" />
												)}
												CSV
											</button>
											<button
												className="eq-export-btn eq-export-btn-sm"
												disabled={exporting !== null}
												onClick={() => exportPdf(buildExportRows(team.membros || [], gestorNome), fileSuffix)}
											>
												{exporting === "pdf" ? (
													<i className="icon-loader icon-xs" />
												) : (
													<i className="icon-file-text icon-xs" />
												)}
												PDF
											</button>
										</div>
									</div>
								)}
								{membros.length > 0 ? (
									<div className="eq-users-list">{membros.map(renderAtendenteRow)}</div>
								) : (
									<div className="eq-team-empty">Nenhum atendente nesta equipe</div>
								)}
							</div>
						);
					})
			)}
		</div>
	);
}

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppSelect } from "../components/AppSelect";
import { useToast } from "../components/Toast";
import { useAbility } from "../hooks/useAbility";
import type { User } from "../hooks/useAuth";
import { api } from "../lib/api";

interface ExImpPageProps {
	user: User;
}

type TabType = "cursos" | "aulas" | "licoes" | "quiz";

interface CursoItem { id: string; titulo: string; ordem: number; aulaCount: number }
interface AulaItem { id: string; titulo: string; cursoId: string; cursoTitulo: string; tipo: string; licaoCount: number }
interface LicaoItem { id: string; titulo: string; aulaId: string; aulaTitulo: string; cursoId: string; cursoTitulo: string; tipo: string }
interface QuizItem { id: string; titulo: string; aulaId: string; aulaTitulo: string; cursoId: string; cursoTitulo: string; perguntaCount: number }

type ImportStep = "idle" | "detecting" | "detected" | "importing" | "result";

interface ImportResult {
	created: number;
	updated: number;
	skipped: number;
	total: number;
	errors: { row: number; field: string; message: string }[];
	createdItems: { type: string; id: string; titulo: string; cursoId?: string; aulaId?: string }[];
}

const TAB_LABELS: Record<TabType, { label: string; icon: string; desc: string }> = {
	cursos: { label: "Cursos", icon: "icon-book-open", desc: "Trilhas e percursos de aprendizado" },
	aulas: { label: "Aulas", icon: "icon-file-text", desc: "Video, PDF e conteudo das aulas" },
	licoes: { label: "Licoes", icon: "icon-bookmark", desc: "Sub-conteudo e ancoragens" },
	quiz: { label: "Quiz", icon: "icon-help-circle", desc: "Perguntas e respostas" },
};

export function ExImpPage({ user: _user }: ExImpPageProps) {
	const navigate = useNavigate();
	const { toast } = useToast();
	const { isAdmin } = useAbility();

	const [activeTab, setActiveTab] = useState<TabType>("cursos");

	// List data
	const [cursos, setCursos] = useState<CursoItem[]>([]);
	const [aulas, setAulas] = useState<AulaItem[]>([]);
	const [licoes, setLicoes] = useState<LicaoItem[]>([]);
	const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
	const [loadingList, setLoadingList] = useState(false);

	// Export
	const [exportingId, setExportingId] = useState<string | null>(null);

	// Import per tab
	const [importStep, setImportStep] = useState<ImportStep>("idle");
	const [dragging, setDragging] = useState(false);
	const [csvText, setCsvText] = useState("");
	const [fileName, setFileName] = useState("");
	const [detectResult, setDetectResult] = useState<any>(null);
	const [importMode, setImportMode] = useState<"create" | "upsert">("create");
	const [importResult, setImportResult] = useState<ImportResult | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Target selection for quiz import without parent columns
	const [targetCursoId, setTargetCursoId] = useState("");
	const [targetAulaId, setTargetAulaId] = useState("");
	const [targetCursos, setTargetCursos] = useState<{ id: string; titulo: string }[]>([]);
	const [targetAulas, setTargetAulas] = useState<{ id: string; titulo: string }[]>([]);

	const loadList = useCallback(async () => {
		setLoadingList(true);
		try {
			const [c, a, l, q] = await Promise.all([api.listCursos(), api.listAulas(), api.listLicoes(), api.listQuizzes()]);
			setCursos(c);
			setAulas(a);
			setLicoes(l);
			setQuizzes(q);
		} catch {
			// silent
		} finally {
			setLoadingList(false);
		}
	}, []);

	useEffect(() => {
		if (isAdmin) loadList();
	}, [isAdmin, loadList]);

	// Load aulas for target selection when curso changes
	useEffect(() => {
		if (!targetCursoId) {
			setTargetAulas([]);
			setTargetAulaId("");
			return;
		}
		api
			.listAulas()
			.then((all) => {
				setTargetAulas(all.filter((a) => a.cursoId === targetCursoId));
			})
			.catch(() => setTargetAulas([]));
	}, [targetCursoId]);

	// Load target cursos when quiz is detected without parent columns
	useEffect(() => {
		if (importStep === "detected" && detectResult?.type === "quiz_pergunta" && needsParentColumns(detectResult.columns)) {
			api.listCursos().then(setTargetCursos).catch(() => setTargetCursos([]));
		}
	}, [importStep, detectResult]);

	const resetImport = () => {
		setImportStep("idle");
		setCsvText("");
		setFileName("");
		setDetectResult(null);
		setImportResult(null);
		setImportMode("create");
		setTargetCursoId("");
		setTargetAulaId("");
		setTargetAulas([]);
	};

	const needsParentColumns = (columns: string[]) => {
		const h = columns.map((c) => c.toLowerCase().trim());
		return (
			!h.includes("curso_titulo") &&
			!h.includes("curso_id") &&
			!h.includes("aula_titulo") &&
			!h.includes("aula_id")
		);
	};

	const injectParentColumns = (csv: string, cursoTitulo: string, aulaTitulo: string): string => {
		const lines = csv.split("\n").filter((l) => l.trim());
		if (lines.length < 2) return csv;
		const headerLine = lines[0];
		const headerLower = headerLine.toLowerCase();
		const hasCurso = headerLower.includes("curso_titulo") || headerLower.includes("curso_id");
		const hasAula = headerLower.includes("aula_titulo") || headerLower.includes("aula_id");

		let newHeaders = headerLine;
		if (!hasCurso) newHeaders += ",curso_titulo";
		if (!hasAula) newHeaders += ",aula_titulo";

		const dataLines = lines.slice(1).map((line) => {
			let row = line;
			if (!hasCurso) row += `,"${cursoTitulo}"`;
			if (!hasAula) row += `,"${aulaTitulo}"`;
			return row;
		});

		return [newHeaders, ...dataLines].join("\n");
	};

	const handleTabChange = (tab: TabType) => {
		setActiveTab(tab);
		resetImport();
	};

	// ==================== EXPORT ====================

	const handleExportItem = async (type: "curso" | "aula" | "licao" | "quiz", id: string) => {
		setExportingId(id);
		try {
			await api.downloadItemCsv(type, id);
			toast("Exportacao concluida!", "success");
		} catch (err: any) {
			toast(err.message || "Erro ao exportar", "error");
		} finally {
			setExportingId(null);
		}
	};

	// ==================== IMPORT ====================

	const processFile = useCallback(
		async (file: File) => {
			if (!file.name.endsWith(".csv")) {
				toast("Apenas arquivos .csv sao aceitos", "error");
				return;
			}
			setFileName(file.name);
			setImportStep("detecting");
			setDetectResult(null);
			setImportResult(null);
			try {
				const text = await file.text();
				setCsvText(text);
				const result = await api.detectCsv(text);
				setDetectResult(result);
				setImportStep("detected");
			} catch (err: any) {
				toast(err.message || "Erro ao ler CSV", "error");
				setImportStep("idle");
			}
		},
		[toast],
	);

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) processFile(file);
		e.target.value = "";
	};

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setDragging(false);
			const file = e.dataTransfer.files[0];
			if (file) processFile(file);
		},
		[processFile],
	);

	const handleImport = async () => {
		if (!csvText) return;
		let finalCsv = csvText;

		// If parent columns are missing and user selected a target, inject them
		if (detectResult && needsParentColumns(detectResult.columns) && targetCursoId && targetAulaId) {
			const curso = targetCursos.find((c) => c.id === targetCursoId);
			const aula = targetAulas.find((a) => a.id === targetAulaId);
			if (curso && aula) {
				finalCsv = injectParentColumns(csvText, curso.titulo, aula.titulo);
			}
		}

		setImportStep("importing");
		try {
			const result = await api.importUnified(finalCsv, importMode);
			setImportResult(result as ImportResult);
			setImportStep("result");
			toast(`Importacao: ${result.created} criados, ${result.updated} atualizados, ${result.skipped} ignorados`, "success");
			loadList();
		} catch (err: any) {
			toast(err.message || "Erro ao importar", "error");
			setImportStep("idle");
		}
	};

	const getLink = (item: { type: string; cursoId?: string; aulaId?: string }) => {
		if (item.type === "quiz" && item.cursoId && item.aulaId) return `/cms/${item.cursoId}/quiz/${item.aulaId}`;
		return "/cms";
	};

	if (!isAdmin) {
		return (
			<div className="page active">
				<div className="page-header">
					<div>
						<div className="page-title">Acesso Restrito</div>
						<div className="page-subtitle">Apenas administradores podem acessar esta pagina</div>
					</div>
				</div>
			</div>
		);
	}

	const tabMeta = TAB_LABELS[activeTab];

	return (
		<div className="page active">
			<div className="page-header">
				<div>
					<div className="page-title">Importar / Exportar</div>
					<div className="page-subtitle">Gerencie a importacao e exportacao de dados por secao</div>
				</div>
				<div className="cms-header-actions">
					<button className="btn-secondary" onClick={() => navigate("/cms")}>
						<i className="icon-arrow-left icon-xs" /> Voltar ao CMS
					</button>
				</div>
			</div>

			{/* TABS */}
			<div className="eximp-tabs">
				{(["cursos", "aulas", "licoes", "quiz"] as const).map((tab) => (
					<button
						key={tab}
						className={`eximp-tab ${activeTab === tab ? "active" : ""}`}
						onClick={() => handleTabChange(tab)}
					>
						<i className={`${TAB_LABELS[tab].icon} icon-sm`} />
						<span>{TAB_LABELS[tab].label}</span>
					</button>
				))}
			</div>

			{/* ACTIVE SECTION */}
			<div className="eximp-section">
				<div className="eximp-section-header">
					<i className={`${tabMeta.icon} icon-md`} />
					<div>
						<h3 className="eximp-section-title">{tabMeta.label}</h3>
						<p className="eximp-section-subtitle">{tabMeta.desc}</p>
					</div>
				</div>

				{/* LIST + EXPORT */}
				<div className="eximp-list-area">
					<div className="eximp-list-header">
						<b>Itens ({activeTab === "cursos" ? cursos.length : activeTab === "aulas" ? aulas.length : activeTab === "licoes" ? licoes.length : quizzes.length})</b>
					</div>

					{loadingList ? (
						<div className="eximp-status">
							<div className="eximp-spinner" />
							<span>Carregando...</span>
						</div>
					) : (
						<div className="eximp-list-scroll">
							{/* CURSOS */}
							{activeTab === "cursos" && cursos.map((item) => (
								<div key={item.id} className="eximp-list-row">
									<div className="eximp-list-info">
										<span className="eximp-list-title">{item.titulo}</span>
										<span className="eximp-list-meta">{item.aulaCount} aulas</span>
									</div>
									<button
										className="btn-secondary btn-sm"
										onClick={() => handleExportItem("curso", item.id)}
										disabled={exportingId === item.id}
									>
										<i className="icon-download icon-xs" /> {exportingId === item.id ? "..." : "CSV"}
									</button>
								</div>
							))}

							{/* AULAS */}
							{activeTab === "aulas" && aulas.map((item) => (
								<div key={item.id} className="eximp-list-row">
									<div className="eximp-list-info">
										<span className="eximp-list-title">{item.titulo}</span>
										<span className="eximp-list-meta">{item.cursoTitulo} &middot; {item.tipo} &middot; {item.licaoCount} licoes</span>
									</div>
									<button
										className="btn-secondary btn-sm"
										onClick={() => handleExportItem("aula", item.id)}
										disabled={exportingId === item.id}
									>
										<i className="icon-download icon-xs" /> {exportingId === item.id ? "..." : "CSV"}
									</button>
								</div>
							))}

							{/* LICOES */}
							{activeTab === "licoes" && licoes.map((item) => (
								<div key={item.id} className="eximp-list-row">
									<div className="eximp-list-info">
										<span className="eximp-list-title">{item.titulo}</span>
										<span className="eximp-list-meta">{item.cursoTitulo} &middot; {item.aulaTitulo} &middot; {item.tipo}</span>
									</div>
									<button
										className="btn-secondary btn-sm"
										onClick={() => handleExportItem("licao", item.id)}
										disabled={exportingId === item.id}
									>
										<i className="icon-download icon-xs" /> {exportingId === item.id ? "..." : "CSV"}
									</button>
								</div>
							))}

							{/* QUIZZES */}
							{activeTab === "quiz" && quizzes.map((item) => (
								<div key={item.id} className="eximp-list-row">
									<div className="eximp-list-info">
										<span className="eximp-list-title">{item.titulo}</span>
										<span className="eximp-list-meta">{item.cursoTitulo} &middot; {item.aulaTitulo} &middot; {item.perguntaCount} perguntas</span>
									</div>
									<button
										className="btn-secondary btn-sm"
										onClick={() => handleExportItem("quiz", item.id)}
										disabled={exportingId === item.id}
									>
										<i className="icon-download icon-xs" /> {exportingId === item.id ? "..." : "CSV"}
									</button>
								</div>
							))}

							{((activeTab === "cursos" && cursos.length === 0) ||
								(activeTab === "aulas" && aulas.length === 0) ||
								(activeTab === "licoes" && licoes.length === 0) ||
								(activeTab === "quiz" && quizzes.length === 0)) && (
								<div className="eximp-empty">Nenhum item encontrado</div>
							)}
						</div>
					)}
				</div>

				{/* IMPORT DIVIDER */}
				<div className="eximp-divider">
					<span>Importar {tabMeta.label}</span>
				</div>

				{/* IMPORT DROPZONE */}
				{importStep === "idle" && (
					<div
						className={`eximp-dropzone ${dragging ? "dragging" : ""}`}
						onDrop={handleDrop}
						onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
						onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
						onClick={() => fileInputRef.current?.click()}
					>
						<i className="icon-upload icon-xl" />
						<div className="eximp-dropzone-text">Arraste o CSV de {tabMeta.label} aqui</div>
						<div className="eximp-dropzone-subtext">ou clique para selecionar</div>
						<input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} style={{ display: "none" }} />
					</div>
				)}

				{importStep === "detecting" && (
					<div className="eximp-status">
						<div className="eximp-spinner" />
						<span>Analisando arquivo...</span>
					</div>
				)}

				{importStep === "detected" && detectResult && (
					<div className="eximp-detected">
						<div className="eximp-detected-header">
							<div className="eximp-detected-info">
								<span className="eximp-badge">{detectResult.type}</span>
								<span>{fileName}</span>
							</div>
							<button className="btn-secondary btn-sm" onClick={resetImport}>
								<i className="icon-x icon-xs" /> Cancelar
							</button>
						</div>

						<div className="eximp-stats-row">
							<div className="eximp-stat">
								<span className="eximp-stat-label">Linhas</span>
								<span className="eximp-stat-value">{detectResult.rowCount}</span>
							</div>
							<div className="eximp-stat">
								<span className="eximp-stat-label">Colunas</span>
								<span className="eximp-stat-value">{detectResult.columns.length}</span>
							</div>
							<div className="eximp-stat">
								<span className="eximp-stat-label">Status</span>
								<span className={`eximp-stat-value ${detectResult.valid ? "success" : "error"}`}>
									{detectResult.valid ? "Valido" : "Colunas faltando"}
								</span>
							</div>
						</div>

						{detectResult.missingRequired?.length > 0 && (
							<div className="eximp-alert error">
								Colunas obrigatorias ausentes: {detectResult.missingRequired.join(", ")}
							</div>
						)}

						{detectResult.preview?.length > 0 && (
							<details className="eximp-preview">
								<summary>Preview (primeiras 3 linhas)</summary>
								<div className="eximp-table-wrap">
									<table className="eximp-table">
										<thead>
											<tr>
												{detectResult.columns.map((col: string) => (
													<th key={col}>{col}</th>
												))}
											</tr>
										</thead>
										<tbody>
											{detectResult.preview.map((row: Record<string, string>, i: number) => (
												<tr key={i}>
													{detectResult.columns.map((col: string) => (
														<td key={col}>{row[col] || ""}</td>
													))}
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</details>
						)}

					{detectResult.valid && (
						<div className="eximp-actions">
							{needsParentColumns(detectResult.columns) && (
								<div className="eximp-target-select">
									<div className="eximp-alert warning">
										<i className="icon-info icon-sm" /> Este CSV nao inclui curso/aula. Selecione o destino:
									</div>
									<div className="eximp-target-fields">
										<div className="form-field" style={{ minWidth: 200 }}>
											<label className="form-label">Curso *</label>
											<AppSelect
												options={targetCursos.map((c) => ({ value: c.id, label: c.titulo }))}
												value={targetCursoId || null}
												onChange={(v: string | null) => {
													setTargetCursoId(v || "");
													setTargetAulaId("");
												}}
												placeholder="Selecionar curso..."
												isSearchable
											/>
										</div>
										<div className="form-field" style={{ minWidth: 200 }}>
											<label className="form-label">Aula *</label>
											<AppSelect
												options={targetAulas.map((a) => ({ value: a.id, label: a.titulo }))}
												value={targetAulaId || null}
												onChange={(v: string | null) => setTargetAulaId(v || "")}
												placeholder={targetCursoId ? "Selecionar aula..." : "Primeiro selecione o curso"}
												isSearchable
												isDisabled={!targetCursoId}
											/>
										</div>
									</div>
								</div>
							)}
								<div className="eximp-mode-selector">
									<label className="eximp-radio">
										<input type="radio" name="importMode" checked={importMode === "create"} onChange={() => setImportMode("create")} />
										Apenas criar
									</label>
									<label className="eximp-radio">
										<input type="radio" name="importMode" checked={importMode === "upsert"} onChange={() => setImportMode("upsert")} />
										Criar ou atualizar
									</label>
							</div>
							<button
								className="btn-primary"
								onClick={handleImport}
								disabled={needsParentColumns(detectResult.columns) && (!targetCursoId || !targetAulaId)}
							>
								<i className="icon-upload icon-xs" /> Importar
							</button>
							</div>
						)}
					</div>
				)}

				{importStep === "importing" && (
					<div className="eximp-status">
						<div className="eximp-spinner" />
						<span>Importando...</span>
					</div>
				)}

				{importStep === "result" && importResult && (
					<div className="eximp-result">
						<div className="eximp-result-header">
							<h4>Resultado</h4>
							<button className="btn-secondary btn-sm" onClick={resetImport}>
								<i className="icon-upload icon-xs" /> Nova Importacao
							</button>
						</div>

						<div className="eximp-stats-row">
							<div className="eximp-stat">
								<span className="eximp-stat-label">Criados</span>
								<span className="eximp-stat-value success">{importResult.created}</span>
							</div>
							<div className="eximp-stat">
								<span className="eximp-stat-label">Atualizados</span>
								<span className="eximp-stat-value info">{importResult.updated}</span>
							</div>
							<div className="eximp-stat">
								<span className="eximp-stat-label">Ignorados</span>
								<span className="eximp-stat-value muted">{importResult.skipped}</span>
							</div>
							<div className="eximp-stat">
								<span className="eximp-stat-label">Total</span>
								<span className="eximp-stat-value">{importResult.total}</span>
							</div>
						</div>

						{importResult.errors?.length > 0 && (
							<div className="eximp-alert error">
								<b>Erros ({importResult.errors.length}):</b>
								<ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
									{importResult.errors.slice(0, 10).map((err, i) => (
										<li key={i}>Linha {err.row}: {err.field} — {err.message}</li>
									))}
									{importResult.errors.length > 10 && <li>...e mais {importResult.errors.length - 10} erros</li>}
								</ul>
							</div>
						)}

						{importResult.createdItems && importResult.createdItems.length > 0 && (
							<div className="eximp-links">
								<h5>Itens importados:</h5>
								<div className="eximp-links-grid">
									{importResult.createdItems.map((item, i) => (
										<a
											key={i}
											className="eximp-link-card"
											href={getLink(item)}
											onClick={(e) => { e.preventDefault(); navigate(getLink(item)); }}
										>
											<span className="eximp-link-type">{item.type}</span>
											<span className="eximp-link-title">{item.titulo}</span>
											<i className="icon-arrow-right icon-xs" />
										</a>
									))}
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

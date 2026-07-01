import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import { XP_PER_LEVEL } from "../lib/constants";

const AI_FIRST: Record<string, string> = {
	ADMIN:
		"Olá, Admin Nacional! Posso ajudar com gestão de conteúdo, usuários, analytics ou o Painel Nacional. O que precisa?",
	GESTOR: "Olá, Gestor! Posso ajudar com KPIs, relatórios de equipe ou as trilhas de gestão. Como posso ajudar?",
	ATENDENTE:
		"Olá! Sou seu assistente na Academia PayGas. Posso tirar dúvidas sobre cashback, terminal ou trilhas de atendimento.",
	PARCEIRO_ACREDITADO:
		"Olá, Parceiro! Posso ajudar com módulos parceiros, certificações ou acesso a conteúdos exclusivos.",
	ERPS_REPRESENTANTE:
		"Olá! Sou seu assistente na Academia PayGas. Posso ajudar com módulos de ERPs, integrações ou trilhas técnicas.",
};

const AI_QUICK: Record<string, string[]> = {
	ADMIN: ["Ver usuários ativos", "Como criar um módulo?", "Analytics nacional"],
	GESTOR: ["KPIs mais importantes", "Relatório da equipe", "Trilha de gestão"],
	ATENDENTE: ["Script de cashback", "Dúvidas do cliente", "Operação do terminal"],
	PARCEIRO_ACREDITADO: ["Módulos disponíveis", "Certificações", "Conteúdo exclusivo"],
	ERPS_REPRESENTANTE: ["Módulos técnicos", "Integrações", "Documentação"],
};

const AI_KNOWLEDGE: Record<string, string[]> = {
	ADMIN: [
		"Você pode gerenciar conteúdo na seção Gestão de Conteúdo.",
		"O painel nacional mostra distribuição por região.",
		"Use Analytics para ver métricas de engajamento.",
	],
	GESTOR: [
		'Acesse "Minha Equipe" para ver o progresso de cada atendente.',
		"O KPI mais importante é o NPS de satisfação do cliente.",
		"Você pode exportar relatórios em CSV.",
	],
	ATENDENTE: [
		"Use o script de cashback para explicar ao cliente de forma simples.",
		"Seu XP aumenta a cada aula concluída.",
		"Dúvidas sobre o terminal? Acesse as trilhas de aprendizado.",
	],
	PARCEIRO_ACREDITADO: [
		"Acesse módulos exclusivos para parceiros na seção de Cursos.",
		"Suas certificações são reconhecidas em todo o ecossistema PayGas.",
		"Conteúdo atualizado mensalmente com as novidades do mercado.",
	],
	ERPS_REPRESENTANTE: [
		"Módulos técnicos disponíveis para integração com ERPs.",
		"Documentação de API disponível na seção de recursos.",
		"Suporte técnico para dúvidas de integração.",
	],
};

interface AIPanelProps {
	open: boolean;
	onClose: () => void;
}

export function AIPanel({ open, onClose }: AIPanelProps) {
	const { user } = useAuth();
	const [messages, setMessages] = useState<{ text: string; type: "bot" | "user" }[]>([]);
	const [input, setInput] = useState("");
	const [typing, setTyping] = useState(false);
	const [stats, setStats] = useState<any>(null);

	const role = user?.role || "ATENDENTE";

	useEffect(() => {
		if (open && messages.length === 0) {
			api
				.getPublicStats()
				.then(setStats)
				.catch(() => {});
			setMessages([{ text: AI_FIRST[role] || "Olá! Como posso ajudar?", type: "bot" }]);
		}
	}, [open]);

	const getKnowledge = (): string[] => {
		const totalUsers = stats?.alunos?.toLocaleString("pt-BR") || "vários";
		const totalModulos = stats?.notas || "vários";
		return [
			`A Academia PayGas tem ${totalUsers} usuários ativos.`,
			`Existem ${totalModulos} módulos disponíveis na plataforma.`,
			...(AI_KNOWLEDGE[role] || []).slice(2),
		];
	};

	const sendAI = () => {
		if (!input.trim()) return;
		const userMsg = input.trim();
		setMessages((prev) => [...prev, { text: userMsg, type: "user" }]);
		setInput("");
		setTyping(true);

		setTimeout(() => {
			setTyping(false);
			const know = getKnowledge();
			let resp =
				know[Math.floor(Math.random() * know.length)] ||
				"Entendido! Consulte as trilhas disponíveis para mais detalhes.";

			if (userMsg.toLowerCase().includes("certif")) {
				resp =
					'Os certificados são emitidos automaticamente ao concluir um módulo. Acesse a seção "Certificados" no menu lateral.';
			} else if (userMsg.toLowerCase().includes("xp")) {
				resp = `Você ganha XP por aula concluída e por quizzes. Cada nível requer ${XP_PER_LEVEL} XP total.`;
			} else if (userMsg.toLowerCase().includes("quiz")) {
				resp =
					"Os quizzes são avaliações ao final de cada módulo. Acerte para ganhar XP bônus e avançar ao certificado.";
			} else if (userMsg.toLowerCase().includes("ranking")) {
				resp =
					'O ranking nacional mostra os alunos com mais XP em todo o Brasil. Você pode ver no menu "Ranking Nacional".';
			}

			setMessages((prev) => [...prev, { text: resp, type: "bot" }]);
		}, 1200);
	};

	if (!open) return null;

	return (
		<div className="ai-panel">
			<div className="ai-header">
				<div className="ai-header-icon">🤖</div>
				<div className="ai-header-info">
					<b>Assistente PayGas IA</b>
					<span>Online agora</span>
				</div>
				<button className="ai-close-btn" onClick={onClose}>
					✕
				</button>
			</div>
			<div className="ai-messages">
				{messages.map((m, i) => (
					<div key={i} className={`ai-msg ${m.type}`}>
						{m.text}
					</div>
				))}
				{typing && (
					<div className="ai-typing">
						<span></span>
						<span></span>
						<span></span>
					</div>
				)}
			</div>
			<div className="ai-input-area">
				<div className="ai-quick">
					{(AI_QUICK[role] || []).map((q, i) => (
						<button
							key={i}
							onClick={() => {
								setInput(q);
								setTimeout(sendAI, 100);
							}}
						>
							{q}
						</button>
					))}
				</div>
				<div className="ai-input-row">
					<input
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && sendAI()}
						placeholder="Pergunte ao assistente..."
					/>
					<button className="ai-send" onClick={sendAI}>
						➤
					</button>
				</div>
			</div>
		</div>
	);
}

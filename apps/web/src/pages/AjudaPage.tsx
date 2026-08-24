export function AjudaPage() {
	const sections = [
		{
			icon: "icon-layout",
			title: "Dashboard",
			desc: "Visao geral do seu desempenho na plataforma. Exibe estatisticas de cursos concluidos, pontos XP acumulados e conquistas desbloqueadas. Caso nao veja dados, verifique se existem cursos publicados e se voce ja comecou alguma trilha de aprendizado.",
		},
		{
			icon: "icon-book-open",
			title: "Trilhas de Aprendizado",
			desc: "Catalogo de cursos disponiveis para inscricao. Navegue pelas trilhas, inscreva-se e acompanhe o progresso de cada modulo. Cada trilha contem aulas com video, PDFs e quizzes. Se nao houver cursos, e necessario que um administrador crie novos modulos na Gestao de Conteudo.",
		},
		{
			icon: "icon-award",
			title: "Certificados",
			desc: "Certificados conquistados apos a conclusao de cursos. Visualize, baixe e compartilhe seus certificados. Alguns cursos geram certificados automaticamente ao concluir todas as aulas e quizzes. Se nao aparece nenhum certificado, e possivel que o curso ainda nao tenha sido concluido ou que o administrador nao tenha ativado a emissao automatica.",
		},
		{
			icon: "icon-star",
			title: "Conquistas",
			desc: "Medalhas e recompensas por suas atividades na plataforma. Se um usuario nao visualiza conquistas, pode ser porque nenhuma conquista foi criada pelo administrador ou porque o usuario ainda nao atingiu os pontos necessarios para desbloquea-las. As conquistas sao desbloqueadas automaticamente ao completar acoes como concluir aulas, responder quizzes ou acumular XP.",
		},
		{
			icon: "icon-bar-chart-2",
			title: "Dashboard Admin",
			desc: "Painel administrativo com metricas gerais da plataforma. Visualize o numero total de usuarios, cursos, aulas e atividades recentes. Indicadores de crescimento e engajamento. Acesse apenas com perfil de Administrador ou Gestor. Se nao aparece no menu, verifique sua role nas configuracoes de usuario.",
		},
		{
			icon: "icon-edit-3",
			title: "Gestao de Conteudo",
			desc: "Gerencie cursos, aulas e quizzes. Crie, edite e exclua modulos. Configure tipos de conteudo (video, PDF, texto), defina aulas obrigatorias e crie perguntas para os quizzes. Para criar um quiz, primeiro crie a aula e depois clique no icone de quiz ao lado dela. Os quizzes precisao ter no minimo uma pergunta com alternativas A e B.",
		},
		{
			icon: "icon-users",
			title: "Equipes",
			desc: "Gerencie equipes de trabalho. Crie e organize equipes, atribua gestores, visualize o progresso dos membros por aula e aprove automaticamente quizzes e certificados. Um gestor de equipe pode liberar quizzes bloqueados para seus membros usando o botao de auto-aprovacao. Para criar uma equipe, va em Gestao de Conteudo e acesse a aba de equipes.",
		},
		{
			icon: "icon-user-plus",
			title: "Usuarios",
			desc: "Cadastro e gestao de usuarios da plataforma. Crie contas, atribua roles (Admin, Gestor, Atendente), valide emails e gerencie acessos. Visualize o progresso individual de cada usuario por curso. Se um usuario nao aparece na lista, verifique se ele ja completou o cadastro via link de verificacao enviado por email.",
		},
		{
			icon: "icon-file-text",
			title: "Relatorios",
			desc: "Relatorios detalhados de desempenho dos usuarios e cursos. Filtre por periodo, curso ou usuario. Exporte dados para analise e acompanhe metricas de conclusao, notas de quizzes e tempo de estudo. Util para identificar gaps de aprendizado e ajustar o conteudo das trilhas.",
		},
		{
			icon: "icon-activity",
			title: "Logs de Atividade",
			desc: "Registro completo de todas as acoes realizadas na plataforma. Visualize quem fez o que e quando. Util para auditoria e acompanhamento de atividades dos usuarios. Os logs incluem logins, acessos a aulas, submissoes de quizzes e alteracoes de configuracao. Filtre por data ou tipo de acao para encontrar informacoes especificas.",
		},
		{
			icon: "icon-zap",
			title: "Configuracao de XP",
			desc: "Configure o sistema de pontos XP da plataforma. Defina quantos pontos cada acao concede (concluir aula, responder quiz, acessar conteudo, etc.) e gerencie as recompensas por atividades. Os pontos sao acumulados automaticamente e exibidos no Dashboard e no perfil do usuario. Se um usuario nao recebe XP, verifique se a acao correspondente esta configurada nesta tela.",
		},
		{
			icon: "icon-bell",
			title: "Notificacoes",
			desc: "Envie notificacoes para usuarios ou grupos selecionados. Crie mensagens personalizadas, acompanhe notificacoes enviadas e gerencie lembretes importantes para a equipe. Util para comunicar atualizacoes de cursos, prazos ou avisos gerais. As notificacoes aparecem para os destinatarios no painel de notificacoes.",
		},
		{
			icon: "icon-user",
			title: "Meu Perfil",
			desc: "Visualize e edite suas informacoes pessoais. Atualize nome, email e configuracoes da conta. Acompanhe seu historico de atividades, conquistas desbloqueadas e progresso nos cursos. Para alterar a senha, acesse as configuracoes de seguranca dentro desta pagina.",
		},
	];

	return (
		<div className="page active">
			<div className="page-header">
				<div>
					<div className="page-title">Ajuda</div>
					<div className="page-subtitle">
						Guia completo da plataforma — entenda cada modulo e como resolve problemas comuns
					</div>
				</div>
			</div>
			<div className="ajuda-grid">
				{sections.map((s, i) => (
					<div key={i} className="ajuda-card">
						<div className="ajuda-card-icon">
							<i className={s.icon} />
						</div>
						<div className="ajuda-card-body">
							<h3 className="ajuda-card-title">{s.title}</h3>
							<p className="ajuda-card-desc">{s.desc}</p>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

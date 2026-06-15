# Agents - Academia PayGas

## Arquitetura de Agentes

O sistema Academia PayGas utiliza uma arquitetura baseada em agentes para gerenciar a interacao entre usuarios e funcionalidades da plataforma.

## Agentes do Sistema

### 1. Authentication Agent

Responsavel pela autenticacao e gerenciamento de sessoes.

| Campo | Valor |
|-------|-------|
| **Tipo** | Primario |
| **Escopo** | Global |
| **Responsabilidades** | Login, logout, validacao de sessao, persistencia em localStorage |
| **Arquivo** | `src/hooks/useAuth.ts` |

```
Fluxo:
  Login -> Validacao -> Persistencia -> Dashboard
  Logout -> Limpeza -> Tela de Login
```

### 2. Navigation Agent

Gerencia a navegacao entre paginas e controle de acesso baseado em perfis.

| Campo | Valor |
|-------|-------|
| **Tipo** | Primario |
| **Escopo** | Global |
| **Responsabilidades** | Roteamento, controle de permissoes, historico de navegacao |
| **Arquivo** | `src/App.tsx` (React Router) |

**Sistema de Roteamento:**

| Rota | Componente | Acesso |
|------|-----------|--------|
| `/login` | LoginPage | Publico |
| `/` | DashboardPage | Autenticado |
| `/trilhas-aprendizado` | TrilhasPage | Autenticado |
| `/trilhas-aprendizado/:trilhaId` | TrilhaModulosPage | Autenticado |
| `/modulo/:moduloNombre` | ModulosPage | Autenticado |
| `/certificados` | CertificadosPage | Autenticado |
| `/equipe` | EquipePage | Gestor, Admin |
| `/relatorios` | RelatoriosPage | Gestor, Admin |
| `/cms` | CMSPage | Admin |
| `/cms/criar-modulo` | CriarModuloPage | Admin |
| `/usuarios` | UsuariosPage | Admin |
| `/notif` | NotifPage | Autenticado |
| `/perfil` | PerfilPage | Autenticado |

### 3. Learning Agent

Gerencia trilhas de aprendizagem, progresso e certificacao.

| Campo | Valor |
|-------|-------|
| **Tipo** | Sub-agente |
| **Dependencias** | Navigation Agent |
| **Responsabilidades** | Carregar trilhas, atualizar progresso, emitir certificados |
| **Arquivo** | `src/pages/TrilhasPage.tsx`, `src/pages/TrilhaModulosPage.tsx`, `src/pages/ModulosPage.tsx` |

**Hierarquia de Conteudo:**

```
Trilha (Trilha de Aprendizado)
  └── Modulo (Categoria)
       └── Aula (Video YouTube ou PDF)
            └── Quiz? (Opcional, 1:1 com Aula)
                 └── QuizPergunta (Multipla escolha: A, B, C, D)
```

**Trilhas Disponiveis (8):**

| ID | Trilha | Aulas | Obrigatoria |
|----|--------|-------|-------------|
| atendimento | Excelencia no Atendimento | 6 | Sim |
| cashback | Sistema de Cashback PayGas | 5 | Sim |
| gestao | Gestao e KPIs do Posto | 7 | Nao |
| terminal | Operacao do Terminal | 4 | Sim |
| erp | Integracao via API | 6 | Sim |
| lgpd | LGPD e Seguranca de Dados | 3 | Sim |
| lideranca | Lideranca e Desenvolvimento de Equipe | 5 | Nao |
| financeiro | Gestao Financeira do Posto | 4 | Nao |

**Fluxo do Estudante:**

```
1. Trilhas de Aprendizado (/trilhas-aprendizado)
   → Lista todas as trilhas disponiveis

2. Modulos da Trilha (/trilhas-aprendizado/:trilhaId)
   → Lista os modulos dentro de uma trilha

3. Conteudo do Modulo (/modulo/:moduloNombre)
   → Lista de aulas (video ou PDF)
   → Botao "Concluir e Avançar" em cada aula
   → Botao "Anterior" para voltar
   → Ao final: Quiz (se existir)
   → Quiz: perguntas de selecao simples (A/B/C/D)
   → Ao concluir quiz: nota >= 7 = aprovado
   → Se autoGerarCertificado: certificado gerado automaticamente
```

### 4. Gamification Agent

Gerencia XP, niveis, conquistas e ranking.

| Campo | Valor |
|-------|-------|
| **Tipo** | Sub-agente |
| **Responsabilidades** | Calcular XP, gerenciar niveis, atualizar ranking |
| **Arquivo** | `src/hooks/useAuth.ts` |

**Sistema de XP:**

| Perfil | XP Inicial |
|--------|-----------|
| Admin PayGas | 8.500 |
| Gestor de Posto | 4.100 |
| Atendente | 2.400 |

**Conquistas:**

| Conquista | Condicao | Recompensa |
|-----------|----------|------------|
| Primeira Aula | Completar 1a aula | XP bonus |
| Maratonista | 5 aulas em um dia | XP bonus |
| Certifier | Obter 1 certificado | XP bonus |
| Trilheiro | Concluir 3 trilhas | XP bonus |
| Expert | Nota 10 em 3 quizzes | XP bonus |
| Ranker | Top 10 nacional | XP bonus |

### 5. Notification Agent

Gerencia e exibe notificacoes para os usuarios.

| Campo | Valor |
|-------|-------|
| **Tipo** | Sub-agente |
| **Responsabilidades** | Criar, armazenar e exibir notificacoes |
| **Arquivo** | `src/pages/NotifPage.tsx` |

**Tipos de Notificacao:**
- Novo modulo disponivel
- Subida de nivel
- Certificado emitido
- Atualizacoes de trilhas

### 6. Quiz Agent (Novo)

Gerencia quizzes, perguntas e respostas dos usuarios.

| Campo | Valor |
|-------|-------|
| **Tipo** | Sub-agente |
| **Dependencias** | Learning Agent |
| **Responsabilidades** | Criar/editar quizzes, gerenciar perguntas, processar respostas, calcular notas |
| **Arquivo Frontend** | `src/pages/ModulosPage.tsx` (resposta), `src/pages/CMSPage.tsx` (gestao) |
| **Arquivo Backend** | `server/routes/cms.ts` (endpoints de quiz) |

**Endpoints de Quiz:**

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/api/modulos/:moduloId/quiz` | Criar quiz para uma aula |
| GET | `/api/modulos/:moduloId/quiz/:aulaId` | Obter quiz com perguntas |
| PUT | `/api/modulos/quiz/:quizId` | Atualizar quiz |
| DELETE | `/api/modulos/quiz/:quizId` | Excluir quiz |
| POST | `/api/modulos/quiz/:quizId/perguntas` | Adicionar pergunta |
| PUT | `/api/modulos/perguntas/:perguntaId` | Atualizar pergunta |
| DELETE | `/api/modulos/perguntas/:perguntaId` | Excluir pergunta |
| POST | `/api/modulos/quiz/:quizId/responder` | Enviar respostas |
| GET | `/api/modulos/quiz/:quizId/resultados` | Ver resultados |

**Fluxo de Quiz:**

```
1. Estudante clica em "Concluir e Avançar" na ultima aula (ou aula com quiz)
2. Exibe formulario de quiz com perguntas de multipla escolha
3. Estudante seleciona respostas (A, B, C ou D)
4. Clica em "Enviar Respostas"
5. Sistema calcula nota (0-10)
6. Se nota >= 7: Aprovado
7. Se autoGerarCertificado=true: gera certificado automaticamente
8. Estudante pode tentar novamente se reprovado
```

**Gestao de Quiz no CMS:**

```
1. Admin acessa Gestao de Conteúdo (/cms)
2. Seleciona um modulo → ve as aulas
3. Clica no botao "Criar Quiz" ao lado da aula
4. Modal abre: titulo do quiz, opcao de certificado automatico
5. Adiciona perguntas: texto, opcoes A/B/C/D, marca resposta correta
6. Perguntas sao salvas no banco de dados
7. Quiz fica disponivel para o estudante na aula correspondente
```

## Fluxo de Dados

```
Usuario -> Authentication Agent (useAuth.ts) -> Login
         -> Navigation Agent (App.tsx + Router) -> Dashboard
         -> Learning Agent (TrilhasPage/TrilhaModulosPage/ModulosPage) -> Conteudo
         -> Quiz Agent (ModulosPage + cms.ts) -> Avaliacoes
         -> Gamification Agent (useAuth.ts) -> XP/Conquistas
         -> Notification Agent (NotifPage.tsx) -> Alertas
```

## Persistencia

| Dados | Local | Metodo |
|-------|-------|--------|
| Sessao do usuario | localStorage | `user` key |
| Preferencias | localStorage | `preferences` key |
| Progresso | MySQL (Prisma) | `Progresso` table via API |
| Quizzes | MySQL (Prisma) | `Quiz`, `QuizPergunta`, `QuizResponse` tables |
| XP e nivel | MySQL (Prisma) | Calculado a partir de progresso e certificados |

## API Endpoints Completos

### Auth
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Usuario atual

### Trilhas
- `GET /api/trilhas` - Listar trilhas
- `POST /api/trilhas` - Criar trilha (Admin)
- `PUT /api/trilhas/:id` - Atualizar trilha (Admin)
- `DELETE /api/trilhas/:id` - Excluir trilha (Admin)
- `GET /api/trilhas/:id/modulos` - Modulos de uma trilha

### CMS (Modulos + Aulas + Quiz)
- `GET /api/cms` - Listar modulos (Admin/Gestor)
- `POST /api/cms` - Criar modulo (Admin/Gestor)
- `PUT /api/cms/:id` - Atualizar modulo (Admin/Gestor)
- `DELETE /api/cms/:id` - Excluir modulo (Admin)
- `GET /api/modulos/:id/aulas` - Aulas de um modulo
- `POST /api/modulos/:id/aulas` - Criar aula (Admin/Gestor)
- `PUT /api/modulos/aulas/:id` - Atualizar aula (Admin/Gestor)
- `DELETE /api/modulos/aulas/:id` - Excluir aula (Admin)

### Quiz
- `POST /api/modulos/:moduloId/quiz` - Criar quiz
- `GET /api/modulos/:moduloId/quiz/:aulaId` - Obter quiz
- `PUT /api/modulos/quiz/:quizId` - Atualizar quiz
- `DELETE /api/modulos/quiz/:quizId` - Excluir quiz
- `POST /api/modulos/quiz/:quizId/perguntas` - Adicionar pergunta
- `PUT /api/modulos/perguntas/:perguntaId` - Atualizar pergunta
- `DELETE /api/modulos/perguntas/:perguntaId` - Excluir pergunta
- `POST /api/modulos/quiz/:quizId/responder` - Enviar respostas
- `GET /api/modulos/quiz/:quizId/resultados` - Ver resultados

### Progresso
- `GET /api/progresso` - Progresso do usuario
- `PUT /api/progresso` - Atualizar progresso
- `GET /api/progresso/stats` - Estatisticas

### Certificados
- `GET /api/certificates` - Listar certificados
- `POST /api/certificates` - Solicitar certificado
- `PUT /api/certificates/:id/approve` - Aprovar
- `PUT /api/certificates/:id/issue` - Emitir

### Notificacoes
- `GET /api/notifications` - Listar
- `POST /api/notifications` - Criar
- `POST /api/notifications/:id/read` - Marcar lida
- `POST /api/notifications/read-all` - Marcar todas lidas

### Dashboard
- `GET /api/dashboard` - Estatisticas do dashboard

### Usuarios
- `GET /api/usuarios` - Listar
- `POST /api/usuarios` - Criar
- `PUT /api/usuarios/:id` - Atualizar
- `DELETE /api/usuarios/:id` - Excluir

## Seguranca

- Autenticacao JWT com middleware de autorizacao
- Sessoes persistidas em localStorage (token JWT)
- Controle de acesso por perfil (ADMIN, GESTOR, ATENDENTE)
- Payloads criptografados com AES-256-GCM em requisicoes POST/PUT/PATCH
- Rotas administrativas protegidas por `authorize('ADMIN')`

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
| `/trilhas` | TrilhasPage | Autenticado |
| `/modulos` | ModulosPage | Autenticado |
| `/certificados` | CertificadosPage | Autenticado |
| `/equipe` | EquipePage | Gestor, Admin |
| `/relatorios` | RelatoriosPage | Gestor, Admin |
| `/cms` | CMSPage | Admin |
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
| **Arquivo** | `src/data/constants.ts`, `src/pages/TrilhasPage.tsx`, `src/pages/ModulosPage.tsx` |

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

## Fluxo de Dados

```
Usuario -> Authentication Agent (useAuth.ts) -> Login
         -> Navigation Agent (App.tsx + Router) -> Dashboard
         -> Learning Agent (TrilhasPage/ModulosPage) -> Modulos
         -> Gamification Agent (useAuth.ts) -> XP/Conquistas
         -> Notification Agent (NotifPage.tsx) -> Alertas
```

## Persistencia

| Dados | Local | Metodo |
|-------|-------|--------|
| Sessao do usuario | localStorage | `user` key |
| Preferencias | localStorage | `preferences` key |
| Progresso | localStorage (previsto) | Por trilha |
| XP e nivel | Estado local | useState |

## Seguranca

- Autenticacao simulada (sem backend real)
- Sessoes persistidas apenas em localStorage
- Controle de acesso por perfil no frontend via ProtectedRoute
- Dados mockados (sem conexao com API)

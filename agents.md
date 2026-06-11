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

**Paginas por Perfil:**

| Perfil | Paginas Acessiveis |
|--------|-------------------|
| Todos | Dashboard, Trilhas, Modulos, Certificados, Ranking, Conquistas, Notificacoes, Perfil, Mapa, Forum |
| Gestor | + Equipe, Relatorios |
| Admin | + CMS, Usuarios, Nacional, Analytics |

### 3. Learning Agent

Gerencia trilhas de aprendizagem, progresso e certificacao.

| Campo | Valor |
|-------|-------|
| **Tipo** | Sub-agente |
| **Dependencias** | Navigation Agent |
| **Responsabilidades** | Carregar trilhas, atualizar progresso, emitir certificados |

**Trilhas Disponiveis (12):**

| ID | Trilha | Aulas | Obrigatoria |
|----|--------|-------|-------------|
| atendimento | Excelencia no Atendimento | 6 | Sim |
| cashback | Sistema de Cashback PayGas | 5 | Sim |
| gestao | Gestao e KPIs do Posto | 7 | Nao |
| terminal | Operacao do Terminal | 4 | Sim |
| parceiro | Portal do Parceiro | 5 | Nao |
| comunidade | Pedagio Digital Comunitario | 4 | Nao |
| erp | Integracao via API | 6 | Sim |
| marketing | Marketing Digital | 4 | Nao |
| lgpd | LGPD e Seguranca de Dados | 3 | Sim |
| lideranca | Lideranca e Desenvolvimento de Equipe | 5 | Nao |
| financeiro | Gestao Financeira do Posto | 4 | Nao |
| inovacao | Inovacao no Setor de Combustiveis | 4 | Nao |

### 4. Gamification Agent

Gerencia XP, niveis, conquistas e ranking.

| Campo | Valor |
|-------|-------|
| **Tipo** | Sub-agente |
| **Responsabilidades** | Calcular XP, gerenciar niveis, atualizar ranking |

**Sistema de XP:**

| Perfil | XP Inicial |
|--------|-----------|
| Admin PayGas | 8.500 |
| Integrador ERP | 5.500 |
| Gestor de Posto | 4.100 |
| Lider Comunitario | 3.200 |
| Atendente | 2.400 |
| Parceiro Comercial | 1.800 |

**Conquistas:**

| Conquista | Condicao | Recompensa |
|-----------|----------|------------|
| Primeira Aula | Completar 1a aula | XP bonus |
| Maratonista | 5 aulas em um dia | XP bonus |
| Certifier | Obter 1 certificado | XP bonus |
| Trilheiro | Concluir 3 trilhas | XP bonus |
| Expert | Nota 10 em 3 quizzes | XP bonus |
| Ranker | Top 10 nacional | XP bonus |

### 5. AI Assistant Agent

Assistente virtual para suporte e duvidas dos usuarios.

| Campo | Valor |
|-------|-------|
| **Tipo** | Sub-agente |
| **Modo** | Panel lateral (slide-in) |
| **Responsabilidades** | Responder duvidas, sugerir trilhas, explicar funcionalidades |

**Funcionalidades:**
- Chat em tempo real com respostas simuladas
- Sugestoes rapidas pre-definidas
- Contexto do perfil do usuario para respostas personalizadas

### 6. Notification Agent

Gerencia e exibe notificacoes para os usuarios.

| Campo | Valor |
|-------|-------|
| **Tipo** | Sub-agente |
| **Responsabilidades** | Criar, armazenar e exibir notificacoes |

**Tipos de Notificacao:**
- Novo modulo disponivel
- Subida de nivel
- Certificado emitido
- Atualizacoes de trilhas

## Fluxo de Dados

```
Usuario -> Authentication Agent -> Login
         -> Navigation Agent -> Dashboard
         -> Learning Agent -> Trilhas -> Modulos
         -> Gamification Agent -> XP/Conquistas
         -> AI Assistant Agent -> Suporte
         -> Notification Agent -> Alertas
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
- Controle de acesso por perfil no frontend
- Dados mockados (sem conexao com API)

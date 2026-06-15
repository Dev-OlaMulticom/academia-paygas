# Academia PayGas V26

## Sistema de Gestao de Aprendizagem (LMS) para o Ecossistema PayGas

---

## 1. Descricao Geral

Academia PayGas e uma plataforma de capacitacao corporativa desenhada para o ecossistema de postos de combustivel PayGas no Brasil. O sistema permite a formacao, certificacao e acompanhamento do desempenho de diferentes atores dentro da rede: desde frentistas ate parceiros comerciais e lideres comunitarios.

### Objetivo Principal

Centralizar a educacao corporativa e criar um sistema de certificacao que garanta padroes de qualidade no atendimento ao cliente, operacoes de combustivel e servicos financeiros digitais (PayGas Pay).

---

## 2. Perfis de Usuario

O sistema implementa **3 perfis diferenciados**, cada um com seu proprio dashboard, funcionalidades e metricas:

| Perfil | Descricao | Acessos |
|--------|-----------|---------|
| **Admin PayGas** | Equipe corporativa nacional | Todos + CMS, Usuarios |
| **Gestor de Posto** | Donos/administradores de postos | Dashboard + Equipe, Relatorios |
| **Atendente** | Frentistas e caixas | Trilhas, Modulos, Certificados |

---

## 3. Arquitetura do Sistema

### 3.1 Stack Tecnologico (V26)

```
Frontend:
  Framework:      React 19 + TypeScript
  Bundler:        Vite 6
  Roteamento:     React Router DOM v7
  Estilo:         CSS Vanilla customizado (design system proprio)
  Estado:         useState + localStorage (via useAuth hook)
  Componentes:    shadcn/ui (57 componentes disponiveis)

Backend:
  Runtime:        Node.js + Express 5
  ORM:            Prisma (MySQL)
  Autenticacao:   JWT (jsonwebtoken)
  Criptografia:   AES-256-GCM (payloads)
  Certificados:   HTTPS (auto-signed)
```

### 3.2 Estrutura de Arquivos

```
academia-paygas/
  src/                          # Frontend (React + Vite)
    App.tsx                     # Configuracao de rotas (React Router)
    main.tsx                    # Entry point com BrowserRouter
    index.css                   # Design system completo
    data/
      constants.ts              # PERSONAS e TRACKS (constantes globais)
    hooks/
      useAuth.ts                # Hook de autenticacao e estado do usuario
      use-mobile.ts             # Hook de deteccao mobile
    layouts/
      AppLayout.tsx             # Layout com Header + Sidebar + conteudo
    components/
      ProtectedRoute.tsx        # Rota protegida (redireciona para /login)
      VideoPlayer.tsx           # Player de video YouTube (Plyr)
      VideoPreview.tsx          # Preview de video para CMS
      PDFViewer.tsx             # Visualizador de PDF
      ui/                       # 57 componentes shadcn/ui
    pages/
      LoginPage.tsx             # Tela de login
      DashboardPage.tsx         # Dashboard principal
      TrilhasPage.tsx           # Lista de trilhas de aprendizado
      TrilhaModulosPage.tsx     # Modulos dentro de uma trilha
      ModulosPage.tsx           # Conteudo do modulo (aulas + quiz)
      CertificadosPage.tsx      # Certificados do usuario
      EquipePage.tsx            # Gestao de equipe
      RelatoriosPage.tsx        # Relatorios e metricas
      CMSPage.tsx               # Gestao de conteudo (modulos + aulas + quiz)
      CriarModuloPage.tsx       # Formulario de criacao de modulo
      UsuariosPage.tsx          # Gestao de usuarios
      NotifPage.tsx             # Notificacoes
      PerfilPage.tsx            # Perfil do usuario
    lib/
      api.ts                    # Cliente API (fetch + fallback localStorage)
      db.ts                     # Banco localStorage (fallback)
      crypto.ts                 # Criptografia client-side
      utils.ts                  # Utilitarios

  server/                       # Backend (Express + Prisma)
    index.ts                    # Entry point do servidor (HTTPS/HTTP)
    lib/
      prisma.ts                 # Cliente Prisma (singleton)
      crypto.ts                 # Utilitarios de criptografia
    middleware/
      auth.ts                   # Middleware JWT de autenticacao
      encryption.ts             # Criptografia AES-256-GCM
    routes/
      auth.ts                   # POST /login, GET /me
      usuarios.ts               # CRUD de usuarios
      trilhas.ts                # CRUD de trilhas
      cms.ts                    # CRUD modulos + aulas + quiz
      certificates.ts           # Gestao de certificados
      notifications.ts          # Gestao de notificacoes
      progresso.ts              # Tracking de progresso
      dashboard.ts              # Estatisticas do dashboard
      docs.ts                   # Documentacao da API

  prisma/                       # Banco de dados
    schema.prisma               # Schema do banco (11 tabelas)
    seed.ts                     # Dados iniciais
    migrations/                 # Migracoes do banco

  agents.md                     # Documentacao de agentes
  design.md                     # Documentacao de design
```

### 3.3 Banco de Dados (Prisma + MySQL)

```
Tabelas (11):

User              # Usuarios do sistema (Admin, Gestor, Atendente)
  ├── TrilhaAtendente   # Atribuicao de trilhas a usuarios
  ├── Progresso         # Progresso em aulas
  ├── QuizResponse      # Respostas de quizzes
  ├── Certificate       # Certificados emitidos
  ├── Notification      # Notificacoes enviadas/recebidas
  └── ActivityLog       # Log de atividades

Trilha             # Trilhas de aprendizado (cursos)
  └── Modulo        # Modulos (categorias dentro da trilha)
       └── Aula     # Aulas (video ou PDF)
            └── Quiz        # Quiz opcional (1:1 com aula)
                 └── QuizPergunta  # Perguntas (multipla escolha)
```

### 3.4 Fluxo de Autenticacao

```
1. Usuario acessa o sistema
         |
         v
2. ProtectedRoute verifica localStorage
         |
    +----+----+
    |         |
    v         v
3a. Sem     3b. Com
    dados      dados
    |         |
    v         v
4a. Login   4b. Dashboard
```

### 3.5 Mapa de Rotas

| Rota | Componente | Acesso | Descricao |
|------|-----------|--------|-----------|
| `/login` | LoginPage | Publico | Tela de login |
| `/` | DashboardPage | Autenticado | Dashboard principal |
| `/trilhas-aprendizado` | TrilhasPage | Autenticado | Lista de trilhas |
| `/trilhas-aprendizado/:trilhaId` | TrilhaModulosPage | Autenticado | Modulos de uma trilha |
| `/modulo/:moduloNombre` | ModulosPage | Autenticado | Conteudo do modulo (aulas + quiz) |
| `/certificados` | CertificadosPage | Autenticado | Certificados do usuario |
| `/equipe` | EquipePage | Gestor, Admin | Gestao de equipe |
| `/relatorios` | RelatoriosPage | Gestor, Admin | Relatorios e metricas |
| `/cms` | CMSPage | Admin | Gestao de conteudo |
| `/cms/criar-modulo` | CriarModuloPage | Admin | Criar novo modulo |
| `/usuarios` | UsuariosPage | Admin | Gestao de usuarios |
| `/notif` | NotifPage | Autenticado | Notificacoes |
| `/perfil` | PerfilPage | Autenticado | Perfil do usuario |

---

## 4. Sistema de Aprendizagem

### 4.1 Hierarquia de Conteudo

```
Trilha (Trilha de Aprendizado)
  └── Modulo (Categoria / Secao)
       └── Aula (Video YouTube ou PDF)
            └── Quiz? (Opcional, 1:1 com Aula)
                 └── QuizPergunta (Multipla escolha: A, B, C, D)
```

### 4.2 Fluxo do Estudante

1. Acessa **Trilhas de Aprendizado** (`/trilhas-aprendizado`)
2. Seleciona uma trilha → ve os modulos (`/trilhas-aprendizado/:trilhaId`)
3. Clica em um modulo → ve as aulas (`/modulo/:nombre`)
4. Assist video YouTube ou le PDF
5. Clica em **"Concluir e Avançar"** → progresso salvo
6. Ao final de todas aulas → **Quiz** (se existir)
7. Responde perguntas de selecao simples (A/B/C/D)
8. Nota >= 7 = **Aprovado** → certificado automatico (se configurado)

### 4.3 Trilhas de Aprendizagem (8 trilhas)

| Trilha | Aulas | Obrigatoria | Perfis |
|--------|-------|-------------|--------|
| Excelencia no Atendimento | 6 | Sim | Admin, Gestor, Atendente |
| Sistema de Cashback PayGas | 5 | Sim | Todos |
| Gestao e KPIs do Posto | 7 | Nao | Admin, Gestor |
| Operacao do Terminal | 4 | Sim | Admin, Atendente |
| Integracao via API | 6 | Sim | Admin |
| LGPD e Seguranca de Dados | 3 | Sim | Admin, Gestor |
| Lideranca e Desenvolvimento | 5 | Nao | Admin, Gestor |
| Gestao Financeira do Posto | 4 | Nao | Admin, Gestor |

### 4.4 Sistema de Gamificacao

- **XP (Experiencia)**: Pontos acumulados por atividades
- **Niveis**: Baseados em XP (2000 pts por nivel)
- **Conquistas**: 6 trofeus desbloqueaveis
- **Ranking**: Classificacao nacional

| Perfil | XP Inicial |
|--------|-----------|
| Admin PayGas | 8.500 |
| Gestor de Posto | 4.100 |
| Atendente | 2.400 |

### 4.5 Certificacao Digital

- Certificados gerados automaticamente ao concluir quiz com nota >= 7 (quando `autoGerarCertificado` ativado)
- Ou manualmente via aprovacao do gestor
- Layout visual com header azul, selo laranja, e rodape com data
- Opcoes de download (PDF/HTML) e compartilhamento

### 4.6 Sistema de Quiz

- **Criacao**: Admin cria quiz no CMS (`/cms`) ao lado de cada aula
- **Perguntas**: Selecao simples (A, B, C, D) com resposta correta marcada
- **Aplicacao**: Estudante responde ao final da aula
- **Correcao**: Automatica, nota de 0 a 10
- **Aprovacao**: Nota >= 7
- **Certificado**: Gerado automatico se `autoGerarCertificado = true`

**Endpoints de Quiz:**

| Metodo | Rota | Descricao |
|--------|------|-----------|
| POST | `/api/modulos/:moduloId/quiz` | Criar quiz |
| GET | `/api/modulos/:moduloId/quiz/:aulaId` | Obter quiz com perguntas |
| PUT | `/api/modulos/quiz/:quizId` | Atualizar quiz |
| DELETE | `/api/modulos/quiz/:quizId` | Excluir quiz |
| POST | `/api/modulos/quiz/:quizId/perguntas` | Adicionar pergunta |
| PUT | `/api/modulos/perguntas/:perguntaId` | Atualizar pergunta |
| DELETE | `/api/modulos/perguntas/:perguntaId` | Excluir pergunta |
| POST | `/api/modulos/quiz/:quizId/responder` | Enviar respostas |
| GET | `/api/modulos/quiz/:quizId/resultados` | Ver resultados |

---

## 5. Funcionalidades por Modulo

| Modulo | Descricao | Acesso |
|--------|-----------|--------|
| **Dashboard** | Vista resumida com metricas e progresso | Todos |
| **Trilhas de Aprendizado** | Catalogo de trilhas com filtros | Todos |
| **Modulos da Trilha** | Modulos dentro de uma trilha | Todos |
| **Conteudo do Modulo** | Aulas (video/PDF) + concluir/avancar + quiz | Todos |
| **Certificados** | Historico de certificacoes | Todos |
| **Equipe** | Gestao de colaboradores | Gestor, Admin |
| **Relatorios** | Metricas e desempenho | Gestor, Admin |
| **CMS** | Gestao de conteudo (modulos + aulas + quiz) | Admin |
| **Usuarios** | Gestao de usuarios | Admin |
| **Notificacoes** | Alertas e novidades | Todos |
| **Perfil** | Edicao de dados pessoais | Todos |

---

## 6. Instalacao e Execucao

### Requisitos

- Node.js 18+ ou pnpm
- MySQL 8+
- Navegador web moderno

### Como Executar

```bash
# Instalar dependencias
pnpm install

# Configurar banco de dados
cp .env.example .env  # Configurar variaveis de ambiente
pnpm prisma migrate dev  # Executar migracoes
pnpm prisma db seed      # Dados iniciais

# Iniciar backend (porta 3001)
pnpm server

# Iniciar frontend (porta 5173)
pnpm dev

# Build de producao
pnpm build

# Preview do build
pnpm preview
```

### Variaveis de Ambiente (.env)

```env
# Banco de dados
DATABASE_URL="mysql://user:password@localhost:3306/academia_paygas"

# JWT
JWT_SECRET="sua-chave-secreta"

# API
VITE_API_BASE_URL="https://localhost:3001/api"
VITE_API_KEY="sua-chave-api"
```

### Credenciais de Teste

| Perfil | Email | Senha |
|--------|-------|-------|
| Admin | admin@paygas.com.br | 123456 |
| Gestor | gestor@paygas.com.br | 123456 |
| Atendente | atendente@paygas.com.br | 123456 |

---

## 7. Deploy

### Deploy estatico (cPanel, Nginx, Apache)

```bash
pnpm build
# Subir conteudo de dist/ para o servidor
```

Criar `.htaccess` para SPA routing no cPanel:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

---

## 8. Documentacao Adicional

- [agents.md](agents.md) - Arquitetura de agentes do sistema
- [design.md](design.md) - Design system e componentes
- API Docs: `GET /api/docs` (quando servidor rodando)

---

## 9. Roadmap

### Fase 1 - MVP Frontend (Concluido)

- [x] Autenticacao por perfil
- [x] 3 perfis diferenciados
- [x] Dashboard personalizado
- [x] 8 trilhas de aprendizagem
- [x] Sistema de gamificacao (XP, conquistas)
- [x] Certificacao digital
- [x] Roteamento com React Router DOM

### Fase 2 - Backend (Concluido)

- [x] Banco de dados MySQL (Prisma ORM)
- [x] API REST com autenticacao JWT
- [x] Persistencia real de progresso
- [x] CRUD completo (usuarios, trilhas, modulos, aulas)
- [x] Sistema de quiz (criacao, perguntas, respostas)
- [x] Certificados automaticos via quiz
- [x] Notificacoes server-side
- [x] Criptografia de payloads (AES-256-GCM)
- [x] HTTPS com certificados auto-signed

### Fase 3 - LMS Completo (Concluido)

- [x] Routing: `/trilhas-aprendizado` → `/modulo/[nombre]`
- [x] Aulas com video YouTube e PDF
- [x] Botao "Concluir e Avançar" funcional
- [x] Quiz com perguntas de selecao simples
- [x] Correcao automatica e notas
- [x] Integracao quiz → certificado automatico
- [x] Gestao de quiz no CMS

### Fase 4 - Avancado (Pendente)

- [ ] App movel (React Native)
- [ ] Notificacoes push
- [ ] Conteudo offline
- [ ] Sistema de avaliacao avancado

### Fase 5 - Analytics (Pendente)

- [ ] Dashboard de BI
- [ ] Machine Learning para recomendacoes
- [ ] Predicao de abandono
- [ ] A/B testing de conteudo

---

## 10. Tecnologias

### Frontend

| Tecnologia | Versao | Uso |
|-----------|--------|-----|
| React | 19 | Framework UI |
| TypeScript | 5.7 | Tipagem |
| Vite | 6 | Bundler |
| React Router DOM | 7 | Roteamento |
| shadcn/ui | - | 57 componentes UI |
| Plyr | - | Player de video YouTube |

### Backend

| Tecnologia | Versao | Uso |
|-----------|--------|-----|
| Node.js | 18+ | Runtime |
| Express | 5 | Framework HTTP |
| Prisma | 5 | ORM (MySQL) |
| MySQL | 8 | Banco de dados |
| jsonwebtoken | - | Autenticacao JWT |
| bcrypt | - | Hash de senhas |

### Infraestrutura

| Tecnologia | Uso |
|-----------|-----|
| HTTPS | Comunicacao segura (cert auto-signed) |
| AES-256-GCM | Criptografia de payloads |
| CORS | Controle de acesso cross-origin |

---

## 11. Contato e Suporte

| Canal | Informacao |
|-------|------------|
| **Email** | academia@paygas.com.br |
| **Telefone** | 0800-XXX-XXXX |
| **Horario** | Segunda a Sexta, 8h as 18h (Brasilia) |

---

## 12. Licenca

Este software e propriedade da PayGas Brasil. Todos os direitos reservados.

---

**Versao**: 26.0  
**Ultima atualizacao**: Junho 2026  
**Autor**: Equipe de Produto PayGas

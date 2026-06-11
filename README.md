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
Framework:      React 19 + TypeScript
Bundler:        Vite 6
Roteamento:     React Router DOM v7
Estilo:         CSS Vanilla customizado (design system proprio)
Estado:         useState + localStorage (via useAuth hook)
Componentes:    shadcn/ui (disponiveis, nao utilizados na app principal)
```

### 3.2 Estrutura de Arquivos

```
academia-paygas/
  src/
    App.tsx                    # Configuracao de rotas (React Router)
    main.tsx                   # Entry point com BrowserRouter
    index.css                  # Design system completo
    data/
      constants.ts             # PERSONAS e TRACKS (constantes globais)
    hooks/
      useAuth.ts               # Hook de autenticacao e estado do usuario
      use-mobile.ts            # Hook de deteccao mobile
    layouts/
      AppLayout.tsx            # Layout com Header + Sidebar + conteudo
    components/
      ProtectedRoute.tsx       # Rota protegida (redireciona para /login)
    pages/
      LoginPage.tsx            # Tela de login
      DashboardPage.tsx        # Dashboard principal
      TrilhasPage.tsx          # Trilhas de aprendizado
      ModulosPage.tsx          # Modulo individual (aulas + quiz)
      CertificadosPage.tsx     # Certificados do usuario
      EquipePage.tsx           # Gestao de equipe
      RelatoriosPage.tsx       # Relatorios e metricas
      CMSPage.tsx              # Gestao de conteudo
      UsuariosPage.tsx         # Gestao de usuarios
      NotifPage.tsx            # Notificacoes
      PerfilPage.tsx           # Perfil do usuario
    components/
      ui/                      # 57 componentes shadcn/ui (disponiveis)
  hooks/                       # Custom hooks (use-toast)
  lib/                         # Utilitarios (cn)
  styles/                      # Config Tailwind v4
  public/                      # Assets estaticos
  agents.md                    # Documentacao de agentes
  design.md                    # Documentacao de design
```

### 3.3 Fluxo de Autenticacao

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

### 3.4 Mapa de Rotas

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

---

## 4. Sistema de Aprendizagem

### 4.1 Trilhas de Aprendizagem (8 trilhas)

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

### 4.2 Sistema de Gamificacao

- **XP (Experiencia)**: Pontos acumulados por atividades
- **Niveis**: Baseados em XP (2000 pts por nivel)
- **Conquistas**: 6 trofeus desbloqueaveis
- **Ranking**: Classificacao nacional

| Perfil | XP Inicial |
|--------|-----------|
| Admin PayGas | 8.500 |
| Gestor de Posto | 4.100 |
| Atendente | 2.400 |

### 4.3 Certificacao Digital

- Certificados gerados automaticamente ao concluir trilhas obrigatorias
- Layout visual com header azul, selo laranja, e rodape com data
- Opcoes de download (PDF/HTML) e compartilhamento

---

## 5. Funcionalidades por Modulo

| Modulo | Descricao | Acesso |
|--------|-----------|--------|
| **Dashboard** | Vista resumida com metricas e progresso | Todos |
| **Trilhas** | Catalogo de cursos com filtros | Todos |
| **Modulos** | Visualizador de aulas (sidebar + conteudo) | Todos |
| **Certificados** | Historico de certificacoes | Todos |
| **Equipe** | Gestao de colaboradores | Gestor, Admin |
| **Relatorios** | Metricas e desempenho | Gestor, Admin |
| **CMS** | Gestao de conteudo | Admin |
| **Usuarios** | Gestao de usuarios | Admin |
| **Notificacoes** | Alertas e novidades | Todos |
| **Perfil** | Edicao de dados pessoais | Todos |

---

## 6. Instalacao e Execucao

### Requisitos

- Node.js 18+ ou pnpm
- Navegador web moderno

### Como Executar

```bash
# Instalar dependencias
pnpm install

# Iniciar em modo desenvolvimento
pnpm dev

# Build de producao
pnpm build

# Preview do build
pnpm preview
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

---

## 9. Roadmap

### Fase 1 - MVP (Atual)

- [x] Autenticacao por perfil
- [x] 3 perfis diferenciados
- [x] Dashboard personalizado
- [x] 8 trilhas de aprendizagem
- [x] Sistema de gamificacao (XP, conquistas)
- [x] Certificacao digital
- [x] Roteamento com React Router DOM

### Fase 2 - Backend

- [ ] Banco de dados PostgreSQL
- [ ] API REST com autenticacao JWT
- [ ] Persistencia real de progresso
- [ ] Upload de conteudo multimedia

### Fase 3 - Avancado

- [ ] App movel (React Native)
- [ ] Notificacoes push
- [ ] Conteudo em video (YouTube embed)
- [ ] Sistema de avaliacao avancado

### Fase 4 - Analytics

- [ ] Dashboard de BI
- [ ] Machine Learning para recomendacoes
- [ ] Predicao de abandono
- [ ] A/B testing de conteudo

---

## 10. Tecnologias

| Tecnologia | Versao | Uso |
|-----------|--------|-----|
| React | 19 | Framework UI |
| TypeScript | 5.7 | Tipagem |
| Vite | 6 | Bundler |
| React Router DOM | 7 | Roteamento |
| Tailwind CSS | 4 | Configurado (nao utilizado na app) |
| shadcn/ui | - | 57 componentes disponiveis |
| Zustand | 5 | Gerenciamento de estado (disponivel) |
| React Query | 5 | Server state (disponivel) |
| Recharts | 2 | Graficos (disponivel) |
| Zod | 3 | Validacao (disponivel) |

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

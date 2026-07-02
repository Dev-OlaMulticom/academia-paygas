# Design System - Academia PayGas V27

## Visao Geral

O design system da Academia PayGas define os padroes visuais, componentes e interacoes utilizados em toda a plataforma. Versao atual: **V27 - Cores Unificadas**.

### Regra de Ouro: Cor Primaria

> **TODOS os elementos visuais devem usar `--pg-orange (#F47C20)` como cor primaria.** Seja em solid, gradiente ou gradient, o laranja PayGas sempre deve ter prioridade. Nenhuma outra cor deve substitui-lo em botoes de acao principal, headers de email, ou elementos de destaque.

---

## 1. Tokens de Design

### 1.1 Paleta de Cores

#### Cores Primarias (PayGas Brand)

```css
--pg-orange: #F47C20;       /* Laranja PayGas - Acoes principais */
--pg-orange-dk: #C45E0A;    /* Laranja escuro - Hover/active */
--pg-orange-lt: #FEF0E6;    /* Laranja claro - Fundos, badges */
--pg-blue: #0A2E6E;         /* Azul corporativo - Headers, sidebar */
--pg-blue-md: #1A4FAD;      /* Azul medio - Gradientes */
--pg-blue-lt: #E6EEF9;      /* Azul claro - Fundos */
--pg-green: #16A34A;        /* Verde - Sucesso, conclusao */
--pg-green-lt: #DCFCE7;     /* Verde claro - Badges de sucesso */
--pg-red: #DC2626;          /* Vermelho - Erro, obrigatorio */
--pg-red-lt: #FEE2E2;       /* Vermelho claro - Fundos de erro */
--pg-gold: #D97706;         /* Dourado - Gamificacao,XP */
--pg-gold-lt: #FEF3C7;      /* Dourado claro - Fundos de gamificacao */
```

#### Escala de Cinza

```css
--gray-50: #F9FAFB;
--gray-100: #F3F4F6;
--gray-200: #E5E7EB;
--gray-300: #D1D5DB;
--gray-400: #9CA3AF;
--gray-500: #6B7280;
--gray-600: #4B5563;
--gray-700: #374151;
--gray-800: #1F2937;
--gray-900: #111827;
```

### 1.2 Tipografia

```css
Font-family: 'Segoe UI', system-ui, sans-serif;
Font-size base: 14px;

Titulos:
  .page-title:      20px / 700 / var(--gray-900)
  .section-title:   14px / 700 / var(--gray-900)
  h2 (lesson):      18px / 700 / var(--gray-900)
  h3 (card):        14px / 600 / var(--gray-900)

Corpo:
  p / span:         13px / 400-500 / var(--gray-500-700)
  small:            11-12px / 400 / var(--gray-400-500)

Labels:
  .form-label:      12px / 600 / var(--gray-700) / uppercase
  .nav-badge:       10px / 700 / #fff
```

### 1.3 Espacamento

```css
--sidebar-w: 260px;
--header-h: 60px;
--radius: 10px;
--radius-sm: 6px;
```

### 1.4 Sombras

```css
--shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.06);
--shadow-md: 0 4px 6px rgba(0,0,0,.07), 0 2px 4px rgba(0,0,0,.06);
```

---

## 2. Layout

### 2.1 Estrutura Principal

```
+------------------------------------------+
|              App Header (60px)            |
+--------+---------------------------------+
|        |                                 |
| Side   |       Main Content              |
| bar    |       (scrollable)              |
| (260px)|                                 |
|        |                                 |
+--------+---------------------------------+
```

### 2.2 Header

- Altura fixa: 60px
- Background: #fff
- Border-bottom: 1px solid var(--gray-200)
- Logo (PG) + Titulo + Busca + Notificacoes + Avatar + Logout

### 2.3 Sidebar

- Largura fixa: 260px
- Background: #fff
- Border-right: 1px solid var(--gray-200)
- Secoes: Principal, Gestao, Administracao, Comunidade, Suporte
- XP Bar no rodape

### 2.4 Main Content

- Flex: 1
- Overflow-y: auto (scroll)
- Padding: 24px

---

## 3. Componentes

### 3.1 Cards

#### Stat Card
```css
.stat-card {
  background: #fff;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 20px;
  box-shadow: var(--shadow);
}
```
- Icone 40x40px com fundo colorido
- Valor: 26px / 800
- Label: 12px / var(--gray-500)
- Trend: 11px / var(--pg-green) ou var(--pg-red)

#### Stat Card Variants

**Clickable (navega para outra pagina)**
```css
.stat-card--clickable {
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
}
.stat-card--clickable:hover {
  border-color: var(--pg-orange);
  box-shadow: 0 0 0 3px var(--pg-orange-lt), var(--shadow-md);
  transform: translateY(-2px);
}
```

**Static (informativo, sem acao)**
```css
.stat-card--static {
  position: relative;
  border-left: 3px solid var(--gray-300);
}
.stat-card--static .stat-card-info {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--gray-100);
  color: var(--gray-400);
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  font-style: italic;
}
```
- Indicador `[i]` no canto superior direito
- Tooltip Radix UI explica o conteudo ao hover

#### Quick Action Card
```css
.quick-action-card {
  padding: 20px;
  background: white;
  border: 2px solid var(--gray-200);
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
}
.quick-action-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}
```
- Sub-elementos: `.qa-icon`, `.qa-title`, `.qa-desc`
- Usado no Dashboard para "Acoes Rapidas"

#### Track Card
```css
.track-card {
  background: #fff;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 20px;
  cursor: pointer;
  transition: .15s;
}
.track-card:hover {
  border-color: var(--pg-orange);
  box-shadow: 0 0 0 3px var(--pg-orange-lt), var(--shadow);
}
```
- Icone 44x44px com fundo colorido
- Titulo + descricao
- Progress bar (6px)
- Meta: percentual + badge de status

### 3.2 Botoes

O sistema utiliza o componente **Button** do shadcn/ui, configurado com as cores e estilos da PayGas. Todos os botoes devem seguir o padrao btn-primary para acoes principais.

#### Componente Button (shadcn/ui)

```tsx
import { Button } from '@/components/ui/button'
```

#### Variantes Disponiveis

**Primary (Padrao - Acoes principais)**
```css
background: #F47C20 (var(--pg-orange))
color: #fff
border: none
border-radius: 6px (var(--radius-sm))
padding: 10px 20px
font-size: 13px
font-weight: 600
hover: background: #C45E0A (var(--pg-orange-dk))
```

**Destructive (Acoes destrutivas)**
```css
background: #DC2626 (var(--pg-red))
color: #fff
border: none
hover: background: #B91C1C
```

**Outline (Secundario)**
```css
background: #fff
color: #4B5563 (var(--gray-600))
border: 1px solid #E5E7EB (var(--gray-200))
hover: background: #F3F4F6 (var(--gray-100))
```

**Secondary**
```css
background: #F3F4F6 (var(--gray-100))
color: #374151 (var(--gray-700))
border: 1px solid #E5E7EB (var(--gray-200))
hover: background: #E5E7EB (var(--gray-200))
```

**Ghost (Sem borda)**
```css
background: transparent
color: #4B5563 (var(--gray-600))
hover: background: #F3F4F6 (var(--gray-100))
```

**Link**
```css
background: transparent
color: #F47C20 (var(--pg-orange))
text-decoration: underline
```

#### Tamanhos Disponiveis

- **default**: height: 40px, padding: 10px 20px, font-size: 13px
- **sm**: height: 32px, padding: 8px 12px, font-size: 12px
- **lg**: height: 44px, padding: 12px 28px, font-size: 14px
- **icon**: size: 40px (quadrado)
- **icon-sm**: size: 32px
- **icon-lg**: size: 44px

#### Uso

```tsx
// Botao primario (padrao)
<Button>Salvar</Button>

// Botao destrutivo
<Button variant="destructive">Excluir</Button>

// Botao outline
<Button variant="outline">Cancelar</Button>

// Botao com icone
<Button variant="ghost" size="icon">
  <Menu className="h-5 w-5" />
</Button>

// Botao primario customizado
<Button className="btn-primary">Acao Principal</Button>
```

#### Classes CSS Especificas

**btn-primary** - Deve ser usado para todas as acoes principais do sistema:
```css
.btn-primary {
  background: var(--pg-orange);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  padding: 10px 20px;
  font-size: 13px;
  font-weight: 600;
}
.btn-primary:hover {
  background: var(--pg-orange-dk);
}
```

**Botoes do Sistema (Header e Sidebar):**
- `#btn-menu` - Botao de menu do header (usa btn-primary)
- `#btn-notif` - Botao de notificacoes do header (usa btn-primary)
- `#btn-logout` - Botao de logout do sidebar footer (usa btn-primary)

#### Regras de Uso

1. **Acoes principais**: Sempre usar variante `default` (primary) com cor laranja PayGas
2. **Acoes secundarias**: Usar variante `outline` ou `secondary`
3. **Acoes destrutivas**: Usar variante `destructive` com cor vermelha
4. **Icones**: Usar variante `ghost` com `size="icon"` para botoes com apenas icone
5. **Links**: Usar variante `link` para acoes que se comportam como links
6. **Consistencia**: Todos os botoes de acao principal devem seguir o padrao btn-primary

### 3.3 Tooltips

O sistema utiliza **Radix UI Tooltip** (`@radix-ui/react-tooltip`) para tooltips explicativos em toda a plataforma.

#### Componente
```tsx
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

<Tooltip>
  <TooltipTrigger asChild>
    <button>Acao</button>
  </TooltipTrigger>
  <TooltipContent side="right">Descricao da acao</TooltipContent>
</Tooltip>
```

#### Onde aplicar Tooltips

| Elemento | Posicao | Descricao |
|----------|---------|-----------|
| Sidebar nav-items | `side="right"` | Explica a secao de navegacao |
| Header buttons | `side="bottom"` | Explica a funcao do botao |
| Stat cards (static) | `side="top"` | Explica a metrica exibida |
| Quick action cards | `side="bottom"` | Explica para onde navega |

#### Regra
Todo elemento interativo ou informativo que nao e auto-explicativo DEVE ter um tooltip. Priorize claridade e simplicidade.

### 3.4 Badges

| Classe | Background | Cor | Uso |
|--------|-----------|-----|-----|
| `.badge-new` | var(--pg-blue-lt) | var(--pg-blue) | Novo, disponivel |
| `.badge-progress` | var(--pg-gold-lt) | var(--pg-gold) | Em andamento |
| `.badge-done` | var(--pg-green-lt) | var(--pg-green) | Concluido |
| `.badge-locked` | var(--gray-100) | var(--gray-400) | Bloqueado |
| `.badge-required` | var(--pg-red-lt) | var(--pg-red) | Obrigatorio |

### 3.5 Status Pills

| Classe | Background | Cor |
|--------|-----------|-----|
| `.pill-green` | var(--pg-green-lt) | var(--pg-green) |
| `.pill-orange` | var(--pg-gold-lt) | var(--pg-gold) |
| `.pill-gray` | var(--gray-100) | var(--gray-500) |
| `.pill-blue` | var(--pg-blue-lt) | var(--pg-blue) |

### 3.6 Tabelas

```css
.table-wrap {
  background: #fff;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  overflow: hidden;
}
th: 11px / 700 / uppercase / var(--gray-500)
td: 13px / var(--gray-700)
```

### 3.7 Formularios

```css
.form-field { margin-bottom: 12px; }
.form-label: 12px / 600 / var(--gray-700) / uppercase
.form-input: 13px / padding: 9px 12px / border: 1.5px solid var(--gray-200)
.form-input:focus: border-color: var(--pg-orange)
```

### 3.8 Progress Bar

```css
.track-prog-bar {
  height: 6px;
  background: var(--gray-100);
  border-radius: 3px;
}
.track-prog-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--pg-orange), var(--pg-gold));
}
.track-prog-fill.done {
  background: linear-gradient(90deg, var(--pg-green), #22C55E);
}
```

### 3.9 Notifications

```css
.notif-item {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--gray-100);
}
.notif-item.unread {
  background: var(--pg-orange-lt);
}
```

### 3.10 AI Panel

```css
.ai-panel {
  width: 320px;
  border-left: 1px solid var(--gray-200);
  display: flex;
  flex-direction: column;
}
.ai-header {
  background: var(--pg-blue);
  color: #fff;
}
.ai-msg.bot { background: var(--gray-100); align-self: flex-start; }
.ai-msg.user { background: var(--pg-orange); color: #fff; align-self: flex-end; }
```

### 3.11 Gamification

#### Trophy Card
```css
.trophy-card {
  background: #fff;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 16px;
  text-align: center;
}
.trophy-card.earned {
  border-color: var(--pg-gold);
  background: var(--pg-gold-lt);
}
.trophy-card.locked { opacity: .4; }
```

### 3.12 Emails

Todos os emails transacionais devem seguir o padrao visual unificado com `--pg-orange` como cor primaria.

#### Template Base
```html
<!-- Header: gradiente laranja -->
<div style="background:linear-gradient(135deg,#F47C20 0%,#C45E0A 100%);color:white;padding:30px;text-align:center;">
  <h1>Academia PayGas</h1>
  <p>Subtitulo do email</p>
</div>

<!-- Botao de acao: laranja solido -->
<a href="..." style="background:#F47C20;color:white;padding:14px 36px;text-decoration:none;border-radius:6px;font-weight:bold;">
  Acao
</a>
```

#### Regras de Cores para Emails

| Elemento | Cor | Exemplo |
|----------|-----|---------|
| Header gradiente | `linear-gradient(135deg, #F47C20, #C45E0A)` | Todos os emails |
| Botao primario | `#F47C20` (solid) | Confirmar, Acessar, Enviar |
| Link de texto | `#F47C20` | Links inline no corpo |
| Fundo da pagina | `#f4f4f4` | Body background |
| Card | `#fff` | Container principal |

#### Template de Verificacao de Email
- Header: gradiente orange `#F47C20` → `#C45E0A`
- Botao "Confirmar Meu Email": `#F47C20`
- Link alternativo: cor `#F47C20`

#### Template de Redefinicao de Senha
- Header: gradiente orange `#F47C20` → `#C45E0A`
- Botao "Ir para o Login": `#F47C20`

#### Template de Notificacao
- Header: gradiente orange `#F47C20` → `#C45E0A`
- Botao "Ir para a Academia": `#F47C20`

#### Template de Certificado
- Botao "Ver Certificado": `#F47C20`

#### Template de Boas-vindas
- Botao "Acessar Academia": `#F47C20`

### 3.13 Sandbox (Admin Profile)

Bloque visible solo para ADMIN en `/perfil` que muestra usuarios de prueba del seed. Misma estructura visual que los demas bloques del perfil.

```css
.sandbox-block {
  background: #fff;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius);
  padding: 24px;
}
.sandbox-user-card {
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--gray-50);
  border: 1px solid var(--gray-100);
}
```

#### Colores por rol (avatar y badge)

| Rol | Avatar BG | Badge BG | Badge Text |
|-----|-----------|----------|------------|
| ADMIN | var(--pg-red) | var(--pg-red-lt) | var(--pg-red) |
| GESTOR | var(--pg-gold) | var(--pg-gold-lt) | var(--pg-gold) |
| ATENDENTE | var(--pg-green) | var(--pg-green-lt) | var(--pg-green) |

#### Level Badge
```css
.level-badge {
  background: linear-gradient(135deg, var(--pg-gold), #F59E0B);
  color: #fff;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
}
```

---

## 4. Iconografia

O sistema utiliza **emojis** como icones principais:

| Contexto | Icones |
|----------|--------|
| Navegacao | 🏠 📚 📖 🏆 👥 📊 ✏️ 🧑‍💼 🗺️ 🥇 💬 ⭐ 🔔 👤 🤖 📄 🔒 |
| Trilhas | 👤 💰 📊 📱 🏪 ⛪ 💻 📣 🔒 🚀 💼 ⚡ |
| Status | ✅ ✓ ⚠️ 📥 ➜ |
| Gamificacao | ⭐ 📖 🏃 🏆 🗺️ 🎯 🥇 |

---

## 5. Responsividade

### Breakpoints

```css
@media(max-width: 768px) {
  .sidebar { /* Mobile: sidebar visivel como accordion */ }
  .lesson-layout { grid-template-columns: 1fr; }
  .lesson-content { display: none; } /* Conteudo vive dentro do accordion */
  .ai-panel { display: none; }
}

@media(max-width: 600px) {
  .login-panel { width: 100%; min-width: 0; }
  .login-bg { display: none; }
}
```

### Mobile Accordion (Ate 768px)

Em dispositivos moveis, o sidebar de aulas se transforma em um **acordeon vertical**:

```
┌─────────────────────────┐
│ 📚 Curso: Seguranca    │
│ 3/5 aulas concluidas    │
├─────────────────────────┤
│ ▶ 1. Introducao    PDF  │  ← accordion header
├─────────────────────────┤
│ ▼ 2. EPIs          Video│  ← accordion aberto
│ ┌───────────────────┐   │
│ │ [Video Player]    │   │  ← conteudo expandido
│ │ Descricao...      │   │
│ │ ┌───────────────┐ │   │
│ │ │ INICIAR QUIZ  │ │   │  ← botao grande
│ │ └───────────────┘ │   │
│ └───────────────────┘   │
├─────────────────────────┤
│ 🔒 3. Protetor  PDF     │  ← locked
├─────────────────────────┤
│ 📝 Todos os Quizzes (2) │  ← accordion
├─────────────────────────┤
│ 📜 Meu Certificado  ✓   │  ← accordion
└─────────────────────────┘
```

### Grid Responsivo

```css
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.track-grid {
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

.two-col {
  grid-template-columns: 1fr 1fr;
}

.region-grid {
  grid-template-columns: repeat(5, 1fr);
}
```

---

## 6. Animacoes

```css
/* Transicoes suaves */
transition: .15s;  /* Cards, botoes, hover */
transition: .6s;   /* Progress bars */
transition: .8s;   /* Region bars */

/* Progress bar fill */
.track-prog-fill { transition: width .6s; }

/* XP bar fill */
.xp-fill { transition: width .8s ease; }

/* AI typing indicator */
@keyframes bounce {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
}
```

---

## 7. Temas por Perfil

| Perfil | Cor Principal | Icone |
|--------|--------------|-------|
| Admin PayGas | #0A2E6E (Azul) | 🌐 |
| Gestor de Posto | #D97706 (Dourado) | ⛽ |
| Atendente | #16A34A (Verde) | 👤 |
| Parceiro Comercial | #7C3AED (Roxo) | 🏪 |
| Lider Comunitario | #0891B2 (Ciano) | ⛪ |
| Integrador ERP | #1F2937 (Cinza) | 💻 |

---

## 8. Regra: Zero Inline Styles

> **NENHUM componente deve usar `style={{...}}` no JSX.** Todo estilo deve ser definido em `src/index.css` usando classes CSS.

### 8.1 Excecao: Valores Dinamicos

O unico caso permitido para inline styles sao valores que mudam em tempo de execucao:

```tsx
// PERMITIDO - valor dinamico
<div style={{ width: `${percent}%` }} />
<div style={{ background: item.color }} />
<div style={{ opacity: isActive ? 1 : 0.5 }} />

// PROIBIDO - valor estatico
<div style={{ padding: '20px', background: '#fff' }} />
<button style={{ color: 'var(--pg-orange)' }}>Acao</button>
```

### 8.2 Convencao de Nomes de Classes

Todas as classes CSS usam **nomes em portugues** seguindo o padrao:

| Prefixo | Descricao | Exemplo |
|---------|-----------|---------|
| `admin-` | Dashboard administrativo | `.admin-stats-grid`, `.admin-tab-btn` |
| `rel-` | Pagina de relatorios | `.rel-action-grid`, `.rel-level-badge` |
| `conq-` | Pagina de conquistas | `.conq-meta`, `.conq-progress-bar` |
| `cert-` | Pagina de certificados | `.cert-card`, `.cert-template-preview` |
| `notif-` | Notificacoes | `.notif-unread-dot`, `.notif-modal` |
| `login-` | Pagina de login | `.login-alert`, `.login-back-btn` |
| `verify-` | Verificacao de email | `.verify-page`, `.verify-btn-primary` |
| `gamif-` | Card de gamificacao | `.gamif-card`, `.gamif-bar-fill` |
| `stat-` | Cards de metricas | `.stat-info`, `.stat-card-icon` |
| `modal-` | Modais genericos | `.modal-overlay`, `.modal-card` |
| `form-` | Formularios | `.form-field`, `.form-grid-2` |

### 8.3 Classes Utilitarias Recentes

| Classe | Uso |
|--------|-----|
| `.modal-overlay` | Overlay de modal (fixo, inset:0, z-index:1000) |
| `.modal-card` | Container do modal (branco, border-radius, padding) |
| `.modal-footer` | Footer do modal (flex, gap:8px) |
| `.form-grid-2` | Grid de 2 colunas para formularios |
| `.section-mb` | margin-bottom: 12px |
| `.section-mb-lg` | margin-bottom: 16px |
| `.section-mb-xl` | margin-bottom: 24px |
| `.admin-loading` | Estado de carregamento |
| `.admin-empty` | Estado vazio |
| `.admin-table` | Tabela completa |
| `.admin-tab-btn.active` | Tab ativa (laranja) |
| `.login-alert.error` | Alerta de erro (vermelho) |
| `.login-alert.success` | Alerta de sucesso (verde) |

### 8.4 Regra de Ouro: Cor Primaria

> **TODOS os elementos visuais devem usar `--pg-orange (#F47C20)` como cor primaria.** Seja em solid, gradiente ou gradient, o laranja PayGas sempre deve ter prioridade. Nenhuma outra cor deve substitui-lo em botoes de acao principal, headers de email, ou elementos de destaque.

---

## 9. Arquivos

| Arquivo | Descricao | Linhas |
|---------|-----------|--------|
| `src/index.css` | Design system completo (~3400 linhas) | ~3400 |
| `src/App.tsx` | Componentes React | ~136 |
| `src/pages/DashboardPage.tsx` | Dashboard com gamificacao | ~120 |
| `src/pages/ModulosPage.tsx` | Pagina de curso com accordion mobile | ~976 |
| `src/layouts/AppLayout.tsx` | Layout principal | ~174 |
| `server/services/email.ts` | Templates de email (orange) | ~349 |
| `src/pages/VerificarEmailPage.tsx` | Verificacao de email (orange) | ~70 |
| `src/pages/AdminDashboardPage.tsx` | Dashboard admin (CSS classes) | ~200 |
| `src/pages/LoginPage.tsx` | Login com recuperacao (CSS classes) | ~170 |
| `src/pages/NotifPage.tsx` | Notificacoes (CSS classes) | ~140 |

**Nota:** O sistema atual utiliza CSS vanilla customizado em vez de Tailwind utility classes, apesar do Tailwind estar configurado no projeto. Todos os estilos estao em `src/index.css` — nenhum inline style e usado nos componentes (exceto valores dinamicos).

---

## 10. Form Inputs & Controls

### Input Text

```tsx
import { Input } from '@/components/ui/input'

<Input 
  type="text" 
  placeholder="Digite aqui..."
  className="form-input"
/>
```

**Estilo:**
```css
.form-input {
  width: 100%;
  padding: 9px 12px;
  font-size: 13px;
  border: 1.5px solid var(--gray-200);
  border-radius: 6px;
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus {
  border-color: var(--pg-orange);
  box-shadow: 0 0 0 3px var(--pg-orange-lt);
}

.form-input:disabled {
  background: var(--gray-100);
  color: var(--gray-400);
  cursor: not-allowed;
}

.form-input.error {
  border-color: var(--pg-red);
}
```

### Select / Dropdown

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

<Select>
  <SelectTrigger className="form-input">
    <SelectValue placeholder="Selecione uma opção..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="opt1">Opção 1</SelectItem>
    <SelectItem value="opt2">Opção 2</SelectItem>
  </SelectContent>
</Select>
```

### Checkbox

```tsx
import { Checkbox } from '@/components/ui/checkbox'

<div className="form-field">
  <Checkbox id="agree" />
  <label htmlFor="agree" className="form-label">Concordo com os termos</label>
</div>
```

### Radio Group

```tsx
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

<RadioGroup defaultValue="opt1">
  <div className="form-field">
    <RadioGroupItem value="opt1" id="opt1" />
    <label htmlFor="opt1">Opção 1</label>
  </div>
  <div className="form-field">
    <RadioGroupItem value="opt2" id="opt2" />
    <label htmlFor="opt2">Opção 2</label>
  </div>
</RadioGroup>
```

### Form Field Wrapper

```tsx
// Container padrão para um campo de formulário
<div className="form-field">
  <label className="form-label">Email</label>
  <Input type="email" placeholder="seu@email.com" className="form-input" />
  {error && <p className="form-error">{error}</p>}
</div>
```

**Estilo:**
```css
.form-field {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--gray-700);
}

.form-error {
  font-size: 12px;
  color: var(--pg-red);
  margin-top: 2px;
}

.form-hint {
  font-size: 11px;
  color: var(--gray-400);
  margin-top: 2px;
}
```

---

## 11. Accessibility (A11y)

### Keyboard Navigation

- **Tab order:** Segue a ordem visual (header → sidebar → main → footer)
- **Focus outline:** Sempre visível com cor `var(--pg-orange)`
- **Skip links:** `<a href="#main" className="sr-only">Pular para conteúdo</a>`

### Semantic HTML

```tsx
// ✅ CORRETO
<button onClick={...}>Ação</button>
<a href="/path">Link</a>
<label htmlFor="input">Label</label>

// ❌ ERRADO
<div onClick={...} role="button">Ação</div>
<div onClick={...} role="link">Link</div>
<span>Label</span>
```

### ARIA Attributes

```tsx
// Buttons
<button aria-label="Abrir menu">☰</button>

// Icons as buttons
<button aria-label="Excluir item">
  <Trash2 className="h-4 w-4" />
</button>

// Modals
<dialog aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">Confirmar ação</h2>
</dialog>

// Notifications
<div role="status" aria-live="polite">
  Operação concluída com sucesso
</div>
```

### Color Contrast

- **Text on light backgrounds:** Minimum 4.5:1 ratio
- **Use:** `var(--gray-900)` on `#fff` (AAA compliant)
- **Links:** `var(--pg-orange)` on light backgrounds meets 4.5:1

### Screen Reader Only

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

## 12. Component Gallery Reference

**shadcn/ui components** (pre-configured in `src/components/ui/`):

| Component | Path | Usage |
|-----------|------|-------|
| Button | `ui/button` | Primary actions, secondary, destructive, ghost, link |
| Input | `ui/input` | Text, email, password, number inputs |
| Select | `ui/select` | Dropdowns |
| Checkbox | `ui/checkbox` | Multiple selections |
| Radio Group | `ui/radio-group` | Single selection |
| Label | `ui/label` | Form labels |
| Textarea | `ui/textarea` | Multi-line text |
| Card | `ui/card` | Container with border + shadow |
| Dialog | `ui/dialog` | Modal dialogs |
| Dropdown Menu | `ui/dropdown-menu` | Dropdown menus |
| Popover | `ui/popover` | Floating popover |
| Tooltip | `ui/tooltip` | Hover tooltips |
| Tabs | `ui/tabs` | Tab navigation |
| Accordion | `ui/accordion` | Collapsible sections |
| Progress | `ui/progress` | Progress bars |
| Badge | `ui/badge` | Status badges |
| Avatar | `ui/avatar` | User avatars |

**All components from Radix UI** — see [shadcn/ui documentation](https://ui.shadcn.com) for full API.

---

## 13. Design System Changelog

| Version | Date | Changes |
|---------|------|---------|
| V27 | Jul 2024 | Unified orange brand, new roles (PARCEIRO_ACREDITADO, ERPS_REPRESENTANTE), mobile accordion |
| V26 | May 2024 | Biome linter, CSS vanilla migration, form patterns |
| V25 | Mar 2024 | Gamification badges, trophy cards, XP visualization |
| Earlier | — | Foundation components, grid system, typography |

---

## 14. Quick Reference

### When implementing a new page/component:

1. **Check if component exists** in `src/components/ui/`
2. **Use CSS classes** for styling (no inline styles)
3. **Follow naming convention** — use Portuguese class names with appropriate prefix
4. **Use `--pg-orange`** for primary actions
5. **Add tooltips** for non-obvious interactive elements
6. **Test responsive** — mobile accordion for <768px
7. **Verify accessibility** — keyboard navigation, ARIA labels, color contrast

### Golden Rules

✅ **DO**
- Use shadcn/ui components from `src/components/ui/`
- Define styles in `src/index.css` with class names
- Use `@shared/*` for shared types
- Style with CSS classes (dynamic values via `style={{}}` only)
- Follow Portuguese naming for classes and identifiers

❌ **DON'T**
- Use inline styles for static properties
- Create new components when shadcn/ui exists
- Import components from external UI libraries
- Use Tailwind utility classes directly
- Hardcode colors (use CSS variables)
- Mix Portuguese and English in class names

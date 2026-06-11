# Design System - Academia PayGas V26

## Visao Geral

O design system da Academia PayGas define os padroes visuais, componentes e interacoes utilizados em toda a plataforma. Versao atual: **V26 - Edicao Nacional**.

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

#### Primary
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
```

#### Secondary
```css
.btn-secondary {
  background: #fff;
  color: var(--gray-700);
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-sm);
  padding: 10px 20px;
}
```

#### Success
```css
.btn-success {
  background: var(--pg-green);
  color: #fff;
  border: none;
}
```

### 3.3 Badges

| Classe | Background | Cor | Uso |
|--------|-----------|-----|-----|
| `.badge-new` | var(--pg-blue-lt) | var(--pg-blue) | Novo, disponivel |
| `.badge-progress` | var(--pg-gold-lt) | var(--pg-gold) | Em andamento |
| `.badge-done` | var(--pg-green-lt) | var(--pg-green) | Concluido |
| `.badge-locked` | var(--gray-100) | var(--gray-400) | Bloqueado |
| `.badge-required` | var(--pg-red-lt) | var(--pg-red) | Obrigatorio |

### 3.4 Status Pills

| Classe | Background | Cor |
|--------|-----------|-----|
| `.pill-green` | var(--pg-green-lt) | var(--pg-green) |
| `.pill-orange` | var(--pg-gold-lt) | var(--pg-gold) |
| `.pill-gray` | var(--gray-100) | var(--gray-500) |
| `.pill-blue` | var(--pg-blue-lt) | var(--pg-blue) |

### 3.5 Tabelas

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

### 3.6 Formularios

```css
.form-field { margin-bottom: 12px; }
.form-label: 12px / 600 / var(--gray-700) / uppercase
.form-input: 13px / padding: 9px 12px / border: 1.5px solid var(--gray-200)
.form-input:focus: border-color: var(--pg-orange)
```

### 3.7 Progress Bar

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

### 3.8 Notifications

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

### 3.9 AI Panel

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

### 3.10 Gamification

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
  .sidebar { display: none; }
  .lesson-layout { grid-template-columns: 1fr; }
  .lesson-sidebar { display: none; }
  .ai-panel { display: none; }
}

@media(max-width: 600px) {
  .login-panel { width: 100%; min-width: 0; }
  .login-bg { display: none; }
}
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

## 8. Arquivos

| Arquivo | Descricao | Linhas |
|---------|-----------|--------|
| `src/index.css` | Design system completo | ~2233 |
| `src/App.tsx` | Componentes React | ~1273 |
| `styles/globals.css` | Config Tailwind (nao utilizado) | 125 |

**Nota:** O sistema atual utiliza CSS vanilla customizado em vez de Tailwind utility classes, apesar do Tailwind estar configurado no projeto.

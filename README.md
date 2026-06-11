# Academia PayGas V26

## Sistema de Gestao de Aprendizagem (LMS) para o Ecossistema PayGas

---

## 1. Descricao Geral

Academia PayGas e uma plataforma de capacitacao corporativa desenhada para o ecossistema de postos de combustivel PayGas no Brasil. O sistema permite a formacao, certificacao e acompanhamento do desempenho de diferentes atores dentro da rede: desde frentistas ate parceiros comerciais e lideres comunitarios.

### Objetivo Principal

Centralizar a educacao corporativa e criar um sistema de certificacao que garanta padroes de qualidade no atendimento ao cliente, operacoes de combustivel e servicos financeiros digitais (PayGas Pay).

---

## 2. Perfis de Usuario

O sistema implementa **6 perfis diferenciados**, cada um com seu proprio dashboard, funcionalidades e metricas:

| Perfil | Descricao | Acessos |
|--------|-----------|---------|
| **Admin PayGas** | Equipe corporativa nacional | Todos + CMS, Usuarios, Nacional, Analytics |
| **Gestor de Posto** | Donos/administradores de postos | Dashboard + Equipe, Relatorios |
| **Atendente** | Frentistas e caixas | Trilhas, Modulos, Certificados |
| **Parceiro Comercial** | Lojas de conveniencia associadas | Trilhas, Cashback, Portal |
| **Lider Comunitario** | Representantes de comunidades | Pedagio Digital, Forum |
| **Integrador ERP** | Empresas de software | API, Integracao, Documentacao |

---

## 3. Arquitetura do Sistema

### 3.1 Stack Tecnologico (V26)

```
Framework:      React 19 + TypeScript
Bundler:        Vite 6
Estilo:         CSS Vanilla customizado (design system proprio)
Roteamento:     State-based (useState)
Estado:         useState + localStorage
Componentes:    shadcn/ui (disponiveis, nao utilizados na app principal)
```

### 3.2 Estrutura de Arquivos

```
academia-paygas/
  src/
    App.tsx          # Aplicacao principal (1273 linhas)
    main.tsx         # Entry point
    index.css        # Design system completo (2233 linhas)
  components/
    ui/              # 57 componentes shadcn/ui (disponiveis)
  hooks/             # Custom hooks
  lib/               # Utilitarios (cn)
  styles/            # Config Tailwind v4
  public/            # Assets estaticos
  agents.md          # Documentacao de agentes
  design.md          # Documentacao de design
```

### 3.3 Fluxo de Autenticacao

```
1. Usuario acessa o sistema
         |
         v
2. Tela de login (email + selecao de perfil)
         |
         v
3. Persistencia em localStorage
         |
         v
4. Redirecionamento ao dashboard conforme perfil
```

---

## 4. Sistema de Aprendizagem

### 4.1 Trilhas de Aprendizagem (12 trilhas)

| Trilha | Aulas | Obrigatoria | Perfis |
|--------|-------|-------------|--------|
| Excelencia no Atendimento | 6 | Sim | Admin, Gestor, Atendente |
| Sistema de Cashback PayGas | 5 | Sim | Todos |
| Gestao e KPIs do Posto | 7 | Nao | Admin, Gestor |
| Operacao do Terminal | 4 | Sim | Admin, Atendente |
| Portal do Parceiro | 5 | Nao | Admin, Parceiro |
| Pedagio Digital Comunitario | 4 | Nao | Admin, Lider |
| Integracao via API | 6 | Sim | Admin, ERP |
| Marketing Digital | 4 | Nao | Admin, Parceiro, Gestor |
| LGPD e Seguranca de Dados | 3 | Sim | Admin, Gestor, ERP |
| Lideranca e Desenvolvimento | 5 | Nao | Admin, Gestor |
| Gestao Financeira do Posto | 4 | Nao | Admin, Gestor |
| Inovacao no Setor de Combustiveis | 4 | Nao | Admin, Gestor, ERP |

### 4.2 Sistema de Gamificacao

- **XP (Experiencia)**: Pontos acumulados por atividades
- **Niveis**: Baseados em XP (2000 pts por nivel)
- **Conquistas**: 6 trofeus desbloqueaveis
- **Ranking**: Classificacao nacional

| Perfil | XP Inicial |
|--------|-----------|
| Admin PayGas | 8.500 |
| Integrador ERP | 5.500 |
| Gestor de Posto | 4.100 |
| Lider Comunitario | 3.200 |
| Atendente | 2.400 |
| Parceiro Comercial | 1.800 |

### 4.3 Certificacao Digital

- Certificados gerados automaticamente ao concluir trilhas obrigatorias
- Layout visual com header azul, selo laranja, e rodape com data
- Opcoes de download e compartilhamento

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
| **Nacional** | Painel Brasil | Admin |
| **Analytics** | Metricas avancadas | Admin |
| **Ranking** | Classificacao nacional | Todos |
| **Conquistas** | Gamificacao e trofeus | Todos |
| **Notificacoes** | Alertas e novidades | Todos |
| **Perfil** | Edicao de dados pessoais | Todos |
| **Mapa** | Distribuicao regional | Todos |
| **Forum** | Comunidade e discussao | Todos |
| **Assistente IA** | Suporte virtual | Todos |

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
| Parceiro | parceiro@paygas.com.br | 123456 |
| Lider | lider@paygas.com.br | 123456 |
| ERP | erp@paygas.com.br | 123456 |

---

## 7. Documentacao Adicional

- [agents.md](agents.md) - Arquitetura de agentes do sistema
- [design.md](design.md) - Design system e componentes

---

## 8. Roadmap

### Fase 1 - MVP (Atual)

- [x] Autenticacao por perfil
- [x] 6 perfis diferenciados
- [x] Dashboard personalizado
- [x] 12 trilhas de aprendizagem
- [x] Sistema de gamificacao (XP, conquistas, ranking)
- [x] Certificacao digital
- [x] Forum da comunidade
- [x] Mapa nacional
- [x] Assistente IA

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

## 9. Tecnologias

| Tecnologia | Versao | Uso |
|-----------|--------|-----|
| React | 19 | Framework UI |
| TypeScript | 5.7 | Tipagem |
| Vite | 6 | Bundler |
| Tailwind CSS | 4 | Configurado (nao utilizado na app) |
| shadcn/ui | - | 57 componentes disponiveis |
| Zustand | 5 | Gerenciamento de estado (disponivel) |
| React Query | 5 | Server state (disponivel) |
| React Router | 1 | Roteamento (disponivel) |
| Recharts | 2 | Graficos (disponivel) |
| Zod | 3 | Validacao (disponivel) |

---

## 10. Contato e Suporte

| Canal | Informacao |
|-------|------------|
| **Email** | academia@paygas.com.br |
| **Telefone** | 0800-XXX-XXXX |
| **Horario** | Segunda a Sexta, 8h as 18h (Brasilia) |

---

## 11. Licenca

Este software e propriedade da PayGas Brasil. Todos os direitos reservados.

---

**Versao**: 26.0  
**Ultima atualizacao**: Junho 2026  
**Autor**: Equipe de Produto PayGas

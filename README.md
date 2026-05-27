# Academia PayGas V22

## Sistema de Gestao de Aprendizagem (LMS) para o Ecossistema PayGas

---

## 1. Descricao Geral

Academia PayGas e uma plataforma de capacitacao corporativa desenhada para o ecossistema de postos de combustivel PayGas no Brasil. O sistema permite a formacao, certificacao e acompanhamento do desempenho de diferentes atores dentro da rede: desde frentistas ate parceiros comerciais e lideres comunitarios.

### Objetivo Principal

Centralizar a educacao corporativa e criar um sistema de certificacao que garanta padroes de qualidade no atendimento ao cliente, operacoes de combustivel e servicos financeiros digitais (PayGas Pay).

---

## 2. Perfis de Usuario

O sistema implementa **6 perfis diferenciados**, cada um com seu proprio dashboard, funcionalidades e metricas:

### 2.1 Aluno/Atendente (Funcionario do Posto)

| Aspecto | Descricao |
|---------|-----------|
| **Descricao** | Frentistas, caixas e pessoal de atendimento direto |
| **Funcionalidades** | Trilhas de aprendizagem, avaliacoes, certificados, progresso pessoal |
| **Metricas** | Cursos concluidos, certificacoes obtidas, horas de estudo |

### 2.2 Gestor (Gerente/Proprietario do Posto)

| Aspecto | Descricao |
|---------|-----------|
| **Descricao** | Donos ou administradores de postos de combustivel |
| **Funcionalidades** | Dashboard de equipe, monitoramento de progresso, relatorios de certificacao |
| **Metricas** | % da equipe certificada, cursos pendentes, ranking de desempenho |

### 2.3 Parceiro Comercial

| Aspecto | Descricao |
|---------|-----------|
| **Descricao** | Lojas de conveniencia, minimercados e comercios associados |
| **Funcionalidades** | Programa de cashback, gestao de clientes, catalogo de produtos |
| **Metricas** | Clientes ativos, cashback distribuido, volume de transacoes |

### 2.4 Comunidade (Lider Comunitario)

| Aspecto | Descricao |
|---------|-----------|
| **Descricao** | Representantes de comunidades locais, associacoes de moradores |
| **Funcionalidades** | Sistema de pedagio digital, renda passiva, rede de contatos |
| **Metricas** | Renda gerada, familias beneficiadas, transacoes comunitarias |

### 2.5 ERP/Representante (Integrador Tecnico)

| Aspecto | Descricao |
|---------|-----------|
| **Descricao** | Empresas de software, integradores de sistemas |
| **Funcionalidades** | Documentacao de API, configuracao de split, webhooks, sandbox |
| **Metricas** | Integracoes ativas, volume de API calls, comissoes por split |

### 2.6 Admin PayGas (Administracao Central)

| Aspecto | Descricao |
|---------|-----------|
| **Descricao** | Equipe corporativa PayGas a nivel nacional |
| **Funcionalidades** | Visao 360 do ecossistema, gestao de postos e parceiros, criacao de conteudo |
| **Metricas** | Postos ativos, usuarios totais, certificacoes emitidas, NPS |

---

## 3. Arquitetura do Sistema

### 3.1 Stack Tecnologico

```
Frontend:     HTML5 + CSS3 + JavaScript (Vanilla)
Arquitetura:  Single Page Application (SPA)
Renderizacao: Client-side rendering
Estado:       Variaveis globais em memoria
```

### 3.2 Estrutura de Codigo

| Secao | Descricao |
|-------|-----------|
| CSS Variables | Design tokens e tema visual |
| Componentes CSS | Estilos de cards, badges, layouts |
| Temas por Perfil | Gradientes e cores especificas |
| JavaScript Core | Logica de autenticacao e navegacao |
| Renderizacao | Funcoes que geram HTML dinamico |
| Dashboards | Vistas especificas por perfil |

### 3.3 Fluxo de Autenticacao

```
1. Usuario acessa o sistema
         |
         v
2. Tela de login (email + senha)
         |
         v
3. Simulacao SSO (OAuth2/JWT mock)
         |
         v
4. Modal de Termos de Uso (LGPD)
         |
         v
5. Redirecionamento ao dashboard conforme perfil
```

---

## 4. Sistema de Aprendizagem

### 4.1 Trilhas de Aprendizagem

O sistema organiza o conteudo em trilhas tematicas:

| Trilha | Modulos | Duracao | Certificacao |
|--------|---------|---------|--------------|
| Atendimento Nota 10 | 5 | 4h | Sim |
| PayGas Pay Basico | 3 | 2h | Sim |
| Seguranca em Pista | 4 | 3h | Sim |
| Lideranca de Equipe | 6 | 5h | Sim |

### 4.2 Sistema de Avaliacao

| Aspecto | Valor |
|---------|-------|
| **Tipo** | Questionarios de multipla escolha |
| **Nota minima** | 80% para aprovacao |
| **Tentativas** | Ilimitadas |
| **Certificado** | Gerado automaticamente ao aprovar |

### 4.3 Certificacao Digital

Os certificados incluem:
- Nome completo do aluno
- Nome do curso concluido
- Data de emissao
- Codigo de verificacao unico
- Logo corporativo PayGas

---

## 5. Sistema de Design

### 5.1 Paleta de Cores

```css
/* Cores Primarias */
--or: #F47C20;    /* Laranja PayGas - Acoes principais */
--bl: #0A2E6E;    /* Azul corporativo - Headers, textos */

/* Cores de Fundo */
--bg: #F5F3EE;    /* Bege claro - Fundo geral */
--card: #FFFFFF;  /* Branco - Cartoes e containers */

/* Cores de Estado */
--success: #22C55E;  /* Verde - Concluido, aprovado */
--warning: #F59E0B;  /* Amarelo - Em andamento, atencao */
--danger: #EF4444;   /* Vermelho - Erro, pendente */
```

### 5.2 Temas por Perfil

Cada perfil tem um gradiente unico para seu sidebar:

| Perfil | Gradiente |
|--------|-----------|
| Aluno | Laranja para Azul |
| Gestor | Azul para Indigo |
| Parceiro | Verde para Esmeralda |
| Comunidade | Roxo para Rosa |
| ERP | Cinza para Slate |
| Admin | Dourado para Ambar |

### 5.3 Componentes UI

- **Cards**: Containers com sombra sutil e bordas arredondadas
- **Badges**: Etiquetas de estado (Concluido, Em andamento, Pendente)
- **Progress Bars**: Indicadores visuais de avanco
- **Hero Banners**: Cabecalhos destacados com gradiente
- **Toast Notifications**: Mensagens temporarias (3 segundos)
- **Modais**: Overlays para termos de uso e confirmacoes

---

## 6. Funcionalidades por Modulo

### 6.1 Modulo de Dashboard

- Vista personalizada conforme perfil
- Metricas KPI em tempo real (simulado)
- Acessos rapidos a funcoes frequentes
- Notificacoes e alertas

### 6.2 Modulo de Cursos (Trilhas)

- Catalogo de cursos disponiveis
- Filtros por categoria e estado
- Progresso visual por modulo
- Acesso a materiais (PDF, video, quiz)

### 6.3 Modulo de Certificados

- Historico de certificacoes
- Download em formato PDF
- Verificacao de autenticidade
- Compartilhar em redes sociais

### 6.4 Modulo de Equipe (Apenas Gestores)

- Lista de funcionarios
- Estado de certificacao individual
- Atribuicao de cursos obrigatorios
- Relatorios de cumprimento

### 6.5 Modulo de Relatorios (Gestores e Admin)

- Graficos de progresso temporal
- Exportacao para Excel/PDF
- Comparativas entre postos
- Tendencias e projecoes

---

## 7. Integracoes Previstas

### 7.1 PayGas Pay (Fintech)

- Wallet digital para funcionarios
- Cashback por certificacoes concluidas
- Pagamentos de bonificacoes

### 7.2 Sistema de Folha de Pagamento

- Sincronizacao de funcionarios
- Atualizacao automatica de cargos
- Relatorios de capacitacao para RH

### 7.3 API REST (Para ERPs)

```
POST /api/v1/auth/login
GET  /api/v1/users/{id}/progress
GET  /api/v1/courses
POST /api/v1/certificates/verify
```

---

## 8. Compliance e Seguranca

### 8.1 LGPD (Lei Geral de Protecao de Dados)

- Termos de uso obrigatorios
- Consentimento explicito para dados
- Direito ao esquecimento (solicitacao via suporte)

### 8.2 Seguranca Implementada

- Autenticacao por token (simulado)
- Sessoes com expiracao
- Perfis e permissoes granulares

### 8.3 Auditoria

- Log de acessos (previsto)
- Historico de avaliacoes
- Rastreabilidade de certificados

---

## 9. Roadmap de Desenvolvimento

### Fase 1 - MVP (Atual)

- [x] Autenticacao basica
- [x] 6 perfis diferenciados
- [x] Dashboards personalizados
- [x] Sistema de certificacao

### Fase 2 - Backend Real

- [ ] Banco de dados PostgreSQL
- [ ] API REST com Node.js/Next.js
- [ ] Autenticacao OAuth2 real
- [ ] Armazenamento de progresso

### Fase 3 - Funcionalidades Avancadas

- [ ] Gamificacao (pontos, rankings)
- [ ] Conteudo multimidia (videos)
- [ ] App movel (React Native)
- [ ] Notificacoes push

### Fase 4 - Analytics

- [ ] Dashboard de BI
- [ ] Machine Learning para recomendacoes
- [ ] Predicao de abandono
- [ ] A/B testing de conteudo

---

## 10. Glossario

| Termo | Definicao |
|-------|-----------|
| **Trilha** | Caminho de aprendizagem, conjunto de modulos relacionados |
| **Posto** | Estacao de servico/posto de gasolina |
| **Frentista** | Funcionario que atende nas bombas de combustivel |
| **PayGas Pay** | Sistema de pagamentos digitais do PayGas |
| **Split** | Divisao automatica de pagamentos entre multiplos destinatarios |
| **Cashback** | Devolucao de porcentagem da compra ao cliente |

---

## 11. Instalacao e Execucao

### Requisitos

- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Nenhuma dependencia de servidor (aplicacao 100% client-side)

### Como Executar

1. Baixe o arquivo `academia-paygas.html`
2. Abra o arquivo diretamente no navegador
3. Use as credenciais de teste para cada perfil

### Credenciais de Teste

| Perfil | Email | Senha |
|--------|-------|-------|
| Aluno | aluno@paygas.com | 123456 |
| Gestor | gestor@paygas.com | 123456 |
| Parceiro | parceiro@paygas.com | 123456 |
| Comunidade | comunidade@paygas.com | 123456 |
| ERP | erp@paygas.com | 123456 |
| Admin | admin@paygas.com | 123456 |

---

## 12. Contato e Suporte

| Canal | Informacao |
|-------|------------|
| **Email** | academia@paygas.com.br |
| **Telefone** | 0800-XXX-XXXX |
| **Horario** | Segunda a Sexta, 8h as 18h (Brasilia) |

---

## 13. Licenca

Este software e propriedade da PayGas Brasil. Todos os direitos reservados.

---

**Versao do documento**: 1.0  
**Ultima atualizacao**: Maio 2026  
**Autor**: Equipe de Produto PayGas

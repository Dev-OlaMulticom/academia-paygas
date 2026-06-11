export const PERSONAS = {
  ADMIN: { label: 'Administrador', icon: '🌐', color: '#0A2E6E', initials: 'AD' },
  GESTOR: { label: 'Gestor de Posto', icon: '⛽', color: '#D97706', initials: 'GP' },
  ATENDENTE: { label: 'Atendente', icon: '👤', color: '#16A34A', initials: 'AT' },
}

export const TRACKS = [
  { id: 'atendimento', label: 'Excelência no Atendimento', icon: '👤', color: '#DCFCE7', desc: 'Técnicas de atendimento e satisfação do cliente', personas: ['ADMIN', 'GESTOR', 'ATENDENTE'], lessons: 6, required: true },
  { id: 'cashback', label: 'Sistema de Cashback PayGas', icon: '💰', color: '#FEF3C7', desc: 'Como funciona e como comunicar o cashback ao cliente', personas: ['ADMIN', 'GESTOR', 'ATENDENTE'], lessons: 5, required: true },
  { id: 'gestao', label: 'Gestão e KPIs do Posto', icon: '📊', color: '#E6EEF9', desc: 'Dashboard, relatórios e indicadores de desempenho', personas: ['ADMIN', 'GESTOR'], lessons: 7, required: false },
  { id: 'terminal', label: 'Operação do Terminal', icon: '📱', color: '#F3E8FF', desc: 'Configuração e uso do terminal PayGas', personas: ['ADMIN', 'ATENDENTE'], lessons: 4, required: true },
  { id: 'erp', label: 'Integração via API', icon: '💻', color: '#F1F5F9', desc: 'Endpoints, autenticação JWT e sincronização', personas: ['ADMIN'], lessons: 6, required: true },
  { id: 'lgpd', label: 'LGPD e Segurança de Dados', icon: '🔒', color: '#F0FDF4', desc: 'Proteção de dados e compliance', personas: ['ADMIN', 'GESTOR'], lessons: 3, required: true },
  { id: 'lideranca', label: 'Liderança e Desenvolvimento de Equipe', icon: '🚀', color: '#EDE9FE', desc: 'Gestão de pessoas, metas e cultura de alta performance', personas: ['ADMIN', 'GESTOR'], lessons: 5, required: false },
  { id: 'financeiro', label: 'Gestão Financeira do Posto', icon: '💼', color: '#FEF9C3', desc: 'Fluxo de caixa, conciliação e relatórios financeiros', personas: ['ADMIN', 'GESTOR'], lessons: 4, required: false },
]

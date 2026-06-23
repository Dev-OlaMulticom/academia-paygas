import Dexie, { type Table } from 'dexie'

export interface Modulo {
  id: string
  titulo: string
  descricao: string
  ordem: number
  videoUrl?: string | null
  videoInicio?: number | null
  videoFim?: number | null
  createdAt?: string
  updatedAt?: string
}

export interface Aula {
  id: string
  moduloId: string
  titulo: string
  descricao: string
  ordem: number
  videoUrl?: string | null
  videoInicio?: number | null
  videoFim?: number | null
  duracaoMin?: number | null
  createdAt?: string
  updatedAt?: string
}

export interface Quiz {
  id: string
  aulaId: string
  titulo: string
  autoGerarCertificado: boolean
  createdAt?: string
  updatedAt?: string
}

export interface QuizPergunta {
  id: string
  quizId: string
  pergunta: string
  opcaoA: string
  opcaoB: string
  opcaoC?: string | null
  opcaoD?: string | null
  correta: string
  ordem: number
  createdAt?: string
  updatedAt?: string
}

export interface QuizResponse {
  id: string
  quizId: string
  userId: string
  nota: number
  total: number
  concluido: boolean
  createdAt?: string
  updatedAt?: string
}

export interface Progresso {
  id: string
  moduloId: string
  aulaId: string
  userId: string
  concluido: boolean
  createdAt?: string
  updatedAt?: string
}

export interface Certificate {
  id: string
  userId: string
  moduloId: string
  status: string
  pdfUrl?: string | null
  htmlContent?: string | null
  aprovadoPor?: string | null
  aprovadoEm?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Notification {
  id: string
  fromId: string
  toId: string
  titulo: string
  mensagem: string
  lida: boolean
  createdAt?: string
}

export interface ActivityLog {
  id: string
  userId: string
  acao: string
  detalhes?: string | null
  createdAt?: string
}

export interface PointsTransaction {
  id: string
  userId: string
  action: string
  points: number
  details?: string | null
  createdAt?: string
}

export interface User {
  id: string
  email: string
  nome: string
  role: string
  xp: number
  emailVerificado?: boolean
  gestorId?: string | null
  createdAt?: string
  updatedAt?: string
  lastLogin?: string | null
}

export interface SyncQueueItem {
  id?: number
  method: string
  path: string
  body: string
  createdAt: string
  retryCount: number
}

class AcademiaDB extends Dexie {
  modulos!: Table<Modulo>
  aulas!: Table<Aula>
  quizzes!: Table<Quiz>
  perguntas!: Table<QuizPergunta>
  quizResponses!: Table<QuizResponse>
  progressos!: Table<Progresso>
  certificates!: Table<Certificate>
  notifications!: Table<Notification>
  activityLogs!: Table<ActivityLog>
  pointsTransactions!: Table<PointsTransaction>
  users!: Table<User>
  syncQueue!: Table<SyncQueueItem>

  constructor() {
    super('academia-paygas')
    this.version(2).stores({
      modulos: 'id',
      aulas: 'id, moduloId',
      quizzes: 'id, aulaId',
      perguntas: 'id, quizId',
      quizResponses: 'id, quizId, userId',
      progressos: 'id, [moduloId+aulaId+userId], userId',
      certificates: 'id, userId, moduloId',
      notifications: 'id, toId',
      activityLogs: 'id, userId',
      pointsTransactions: 'id, userId',
      users: 'id, email',
      syncQueue: '++id, createdAt',
    })
  }

  async clearAll() {
    await Promise.all([
      this.modulos.clear(),
      this.aulas.clear(),
      this.quizzes.clear(),
      this.perguntas.clear(),
      this.quizResponses.clear(),
      this.progressos.clear(),
      this.certificates.clear(),
      this.notifications.clear(),
      this.activityLogs.clear(),
      this.pointsTransactions.clear(),
      this.users.clear(),
      this.syncQueue.clear(),
    ])
  }
}

export const db = new AcademiaDB()

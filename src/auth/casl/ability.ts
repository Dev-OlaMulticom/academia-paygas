/**
 * Frontend CASL Ability builder.
 *
 * Mirrors the backend ability rules so the UI can conditionally
 * render elements based on permissions.
 *
 * IMPORTANT: Backend is always the source of truth.
 * This is only for UI hints — never trust client-side abilities for security.
 */

/**
 * Actions available in the system
 */
export const Actions = {
  create: 'create',
  read: 'read',
  update: 'update',
  delete: 'delete',
  manage: 'manage',
  assignRole: 'assignRole',
  sendNotification: 'sendNotification',
  approveCertificate: 'approveCertificate',
  issueCertificate: 'issueCertificate',
  viewTeam: 'viewTeam',
  exportData: 'exportData',
} as const

export type Action = typeof Actions[keyof typeof Actions]

/**
 * Subjects (entities) available in the system
 */
export const Subjects = {
  User: 'User',
  Modulo: 'Modulo',
  Aula: 'Aula',
  Licao: 'Licao',
  Quiz: 'Quiz',
  Certificate: 'Certificate',
  Notification: 'Notification',
  ActivityLog: 'ActivityLog',
  PointsTransaction: 'PointsTransaction',
  ForumPost: 'ForumPost',
  ModuleConfig: 'ModuleConfig',
  XPConfig: 'XPConfig',
  Conquista: 'Conquista',
  Progresso: 'Progresso',
  Team: 'Team',
  Message: 'Message',
  Dashboard: 'Dashboard',
  All: 'all',
} as const

export type Subject = typeof Subjects[keyof typeof Subjects]

/**
 * Simple ability checker — no CASL dependency needed at runtime.
 * This mirrors the backend defineAbility logic.
 */
interface AbilityRule {
  action: string
  subject: string
  conditions?: Record<string, any>
}

interface FrontendUser {
  id?: string
  role: string
  gestorId?: string | null
}

function buildRules(user: FrontendUser | null): AbilityRule[] {
  if (!user) return []

  const rules: AbilityRule[] = []

  // ADMIN: full access
  if (user.role === 'ADMIN') {
    rules.push({ action: 'manage', subject: 'all' })
    return rules
  }

  // GESTOR: team-scoped access
  if (user.role === 'GESTOR') {
    rules.push({ action: 'read', subject: 'User' })
    rules.push({ action: 'update', subject: 'User', conditions: { gestorId: user.id } })
    rules.push({ action: 'create', subject: 'User', conditions: { role: 'ATENDENTE' } })
    rules.push({ action: 'viewTeam', subject: 'Team' })
    rules.push({ action: 'sendNotification', subject: 'Notification' })
    rules.push({ action: 'read', subject: 'Notification' })
    rules.push({ action: 'read', subject: 'Certificate' })
    rules.push({ action: 'approveCertificate', subject: 'Certificate' })
    rules.push({ action: 'issueCertificate', subject: 'Certificate' })
    rules.push({ action: 'read', subject: 'Modulo' })
    rules.push({ action: 'read', subject: 'Aula' })
    rules.push({ action: 'read', subject: 'Licao' })
    rules.push({ action: 'read', subject: 'PointsTransaction' })
    rules.push({ action: 'read', subject: 'Conquista' })
    rules.push({ action: 'read', subject: 'Progresso' })
  }

  // ATENDENTE: own data only
  if (user.role === 'ATENDENTE') {
    rules.push({ action: 'read', subject: 'User', conditions: { id: user.id } })
    rules.push({ action: 'update', subject: 'User', conditions: { id: user.id } })
    rules.push({ action: 'read', subject: 'Progresso' })
    rules.push({ action: 'update', subject: 'Progresso' })
    rules.push({ action: 'read', subject: 'Certificate' })
    rules.push({ action: 'create', subject: 'Certificate' })
    rules.push({ action: 'read', subject: 'Notification' })
    rules.push({ action: 'read', subject: 'Modulo' })
    rules.push({ action: 'read', subject: 'Aula' })
    rules.push({ action: 'read', subject: 'Licao' })
    rules.push({ action: 'read', subject: 'Quiz' })
    rules.push({ action: 'create', subject: 'Quiz' })
    rules.push({ action: 'read', subject: 'PointsTransaction' })
    rules.push({ action: 'read', subject: 'Conquista' })
    rules.push({ action: 'read', subject: 'ForumPost' })
    rules.push({ action: 'create', subject: 'ForumPost' })
  }

  return rules
}

/**
 * Simple ability object with can/cannot methods.
 */
export interface FrontendAbility {
  can: (action: string, subject: string, conditions?: Record<string, any>) => boolean
  cannot: (action: string, subject: string, conditions?: Record<string, any>) => boolean
}

export function defineFrontendAbility(user: FrontendUser | null): FrontendAbility {
  const rules = buildRules(user)

  return {
    can(action: string, subject: string, conditions?: Record<string, any>): boolean {
      // Wildcard: 'manage' on 'all' matches everything
      if (rules.some(r => r.action === 'manage' && r.subject === 'all')) return true

      // Check if any rule matches
      return rules.some(rule => {
        if (rule.action !== action) return false
        if (rule.subject !== subject && rule.subject !== 'all') return false
        // If rule has conditions, they must match (simplified check)
        if (rule.conditions && conditions) {
          return Object.keys(rule.conditions).every(key => rule.conditions![key] === conditions[key])
        }
        if (rule.conditions && !conditions) return false
        return true
      })
    },

    cannot(action: string, subject: string, conditions?: Record<string, any>): boolean {
      return !this.can(action, subject, conditions)
    },
  }
}

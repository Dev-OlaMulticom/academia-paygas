/**
 * Team Policy — defines who can do what with Team aggregates.
 */
export interface PermissionRule {
  action: string
  subject: string
  conditions?: Record<string, any>
}

interface PolicyContext {
  user: {
    id: string
    role: string
    gestorId?: string | null
  }
}

export function teamPolicy({ user }: PolicyContext): PermissionRule[] {
  const rules: PermissionRule[] = []

  if (user.role === 'ADMIN') {
    rules.push({ action: 'manage', subject: 'Team' })
    rules.push({ action: 'viewTeam', subject: 'Team' })
    return rules
  }

  if (user.role === 'GESTOR') {
    rules.push({ action: 'viewTeam', subject: 'Team', conditions: { gestorId: user.id } })
    rules.push({ action: 'update', subject: 'Team', conditions: { gestorId: user.id } })
  }

  if (user.role === 'ATENDENTE') {
    rules.push({ action: 'viewTeam', subject: 'Team', conditions: { id: user.gestorId } })
  }

  return rules
}

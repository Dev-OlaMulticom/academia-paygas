/**
 * User Policy — defines who can do what with User entities.
 *
 * Returns an array of permission rules that are merged into the ability.
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

export function userPolicy({ user }: PolicyContext): PermissionRule[] {
  const rules: PermissionRule[] = []

  if (user.role === 'ADMIN') {
    rules.push({ action: 'manage', subject: 'User' })
    return rules
  }

  if (user.role === 'GESTOR') {
    // Can manage team members
    rules.push({ action: 'read', subject: 'User', conditions: { gestorId: user.id } })
    rules.push({ action: 'update', subject: 'User', conditions: { gestorId: user.id } })

    // Can create ATENDENTE users (assigned to their team)
    rules.push({ action: 'create', subject: 'User', conditions: { role: 'ATENDENTE' } })

    // Can view/update own profile
    rules.push({ action: 'read', subject: 'User', conditions: { id: user.id } })
    rules.push({ action: 'update', subject: 'User', conditions: { id: user.id } })
  }

  if (user.role === 'ATENDENTE') {
    // Can only read/update own profile
    rules.push({ action: 'read', subject: 'User', conditions: { id: user.id } })
    rules.push({ action: 'update', subject: 'User', conditions: { id: user.id } })
  }

  return rules
}

/**
 * Message Policy — defines who can do what with Message/Notification entities.
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

export function messagePolicy({ user }: PolicyContext): PermissionRule[] {
  const rules: PermissionRule[] = []

  if (user.role === 'ADMIN') {
    rules.push({ action: 'manage', subject: 'Notification' })
    rules.push({ action: 'sendNotification', subject: 'Notification' })
    return rules
  }

  if (user.role === 'GESTOR') {
    // Can send to team members
    rules.push({ action: 'sendNotification', subject: 'Notification', conditions: { toId: { gestorId: user.id } } })

    // Can read own messages
    rules.push({ action: 'read', subject: 'Notification', conditions: { toId: user.id } })
  }

  if (user.role === 'ATENDENTE') {
    // Can only read own messages
    rules.push({ action: 'read', subject: 'Notification', conditions: { toId: user.id } })
  }

  return rules
}

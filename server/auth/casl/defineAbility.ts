/**
 * defineAbility — the central CASL ability builder.
 *
 * Combines all policies into a single ability instance.
 * This is the ONLY place where abilities are constructed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let PureAbility: any
try {
  PureAbility = require('@casl/ability').PureAbility
} catch {
  // Fallback: if CASL is not installed, abilities will be empty
}

import { userPolicy } from './policies/user.policy'
import { teamPolicy } from './policies/team.policy'
import { messagePolicy } from './policies/message.policy'

export interface CaslUser {
  id: string
  role: string
  gestorId?: string | null
}

/**
 * Build an ability instance from a user context.
 * All policies are merged into a single ability.
 */
export function defineAbility(user: CaslUser): any {
  if (!PureAbility) {
    // CASL not installed — return a permissive ability for ADMIN, restrictive for others
    return {
      can: () => user.role === 'ADMIN',
      cannot: () => user.role !== 'ADMIN',
      rules: [],
    }
  }

  const { can, build } = new PureAbility()

  const ctx = { user }

  // Apply all rules from each policy
  const allRules = [
    ...userPolicy(ctx),
    ...teamPolicy(ctx),
    ...messagePolicy(ctx),
  ]

  for (const rule of allRules) {
    can(rule.action, rule.subject, rule.conditions)
  }

  return build()
}

/**
 * Quick permission check helper.
 */
export function can(
  user: CaslUser,
  action: string,
  subject: string,
  conditions?: Record<string, any>
): boolean {
  const ability = defineAbility(user)
  if (conditions) {
    return ability.can(action, subject, conditions)
  }
  return ability.can(action, subject)
}

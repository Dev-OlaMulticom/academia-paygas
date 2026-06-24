/**
 * useAbility hook — React hook for CASL permissions.
 *
 * Provides ability checking methods for conditional UI rendering.
 * Backend is always the source of truth — this is only for UI hints.
 *
 * Usage:
 *   const { can, cannot, isRole } = useAbility()
 *
 *   if (can('update', 'User')) {
 *     return <EditButton />
 *   }
 *
 *   if (isRole('ADMIN')) {
 *     return <AdminPanel />
 *   }
 */
import { useMemo } from 'react'
import { useAuth, User } from './useAuth'
import { defineFrontendAbility, FrontendAbility } from '../auth/casl/ability'

interface UseAbilityReturn {
  ability: FrontendAbility

  /** Check if user CAN do action on subject */
  can: (action: string, subject: string, conditions?: Record<string, any>) => boolean

  /** Check if user CANNOT do action on subject */
  cannot: (action: string, subject: string, conditions?: Record<string, any>) => boolean

  /** Quick role check */
  isRole: (role: string) => boolean

  /** Quick role checks */
  isAdmin: boolean
  isGestor: boolean
  isAtendente: boolean

  /** Current user */
  user: User | null
}

export function useAbility(): UseAbilityReturn {
  const { user } = useAuth()

  const ability = useMemo(() => {
    return defineFrontendAbility(user)
  }, [user?.id, user?.role])

  const can = useMemo(() => {
    return (action: string, subject: string, conditions?: Record<string, any>) => {
      return ability.can(action, subject, conditions)
    }
  }, [ability])

  const cannot = useMemo(() => {
    return (action: string, subject: string, conditions?: Record<string, any>) => {
      return ability.cannot(action, subject, conditions)
    }
  }, [ability])

  const isRole = useMemo(() => {
    return (role: string) => user?.role === role
  }, [user?.role])

  return {
    ability,
    can,
    cannot,
    isRole,
    isAdmin: user?.role === 'ADMIN',
    isGestor: user?.role === 'GESTOR',
    isAtendente: user?.role === 'ATENDENTE',
    user,
  }
}

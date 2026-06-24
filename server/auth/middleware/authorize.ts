/**
 * authorize middleware — CASL-based authorization for Express.
 *
 * Replaces the old role-based authorize() middleware.
 * Checks abilities against the user's CASL ability instance.
 *
 * Usage:
 *   router.put('/:id', authenticate, authorize('update', 'User'), handler)
 *   router.delete('/:id', authenticate, authorize('delete', 'User'), handler)
 *   router.post('/', authenticate, authorize('create', 'User'), handler)
 *   router.get('/', authenticate, authorize('read', 'User'), handler)
 *
 * For conditional checks (e.g., GESTOR can only update own team):
 *   authorize('update', 'User', { gestorId: req.userId })
 */
import { Response, NextFunction } from 'express'
import { AuthRequest } from '../../middleware/auth'
import { defineAbility, CaslUser } from '../casl/defineAbility'

/**
 * Build a CaslUser from the AuthRequest (populated by authenticate middleware).
 */
function buildCaslUser(req: AuthRequest): CaslUser {
  return {
    id: req.userId || '',
    role: req.userRole || '',
    gestorId: (req as any).userGestorId,
  }
}

/**
 * authorize() middleware factory.
 *
 * @param action - The CASL action to check (e.g., 'update', 'delete')
 * @param subject - The CASL subject to check against (e.g., 'User', 'Notification')
 * @param conditions - Optional conditions to pass to ability.can()
 * @returns Express middleware
 */
export function authorize(
  action: string,
  subject: string,
  conditions?: Record<string, any>
) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const caslUser = buildCaslUser(req)

    if (!caslUser.id || !caslUser.role) {
      return res.status(401).json({ error: 'Usuario no autenticado' })
    }

    const ability = defineAbility(caslUser)

    const permitted = conditions
      ? ability.can(action, subject, conditions)
      : ability.can(action, subject)

    if (!permitted) {
      return res.status(403).json({
        error: 'Sem permissão',
        required: { action, subject, conditions },
        role: caslUser.role,
      })
    }

    // Attach ability to request for downstream use in controllers
    ;(req as any).ability = ability
    ;(req as any).caslUser = caslUser

    next()
  }
}

/**
 * authorizeAny() — middleware that checks if user has ANY of the provided permissions.
 */
export function authorizeAny(
  checks: Array<[string, string, Record<string, any>?]>
) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const caslUser = buildCaslUser(req)

    if (!caslUser.id || !caslUser.role) {
      return res.status(401).json({ error: 'Usuario no autenticado' })
    }

    const ability = defineAbility(caslUser)

    const permitted = checks.some(([action, subject, conditions]) => {
      return conditions
        ? ability.can(action, subject, conditions)
        : ability.can(action, subject)
    })

    if (!permitted) {
      return res.status(403).json({
        error: 'Sem permissão',
        required: checks.map(([action, subject]) => ({ action, subject })),
        role: caslUser.role,
      })
    }

    ;(req as any).ability = ability
    ;(req as any).caslUser = caslUser

    next()
  }
}

/**
 * getAbility() — extract ability from request (after authenticate + authorize).
 */
export function getAbility(req: AuthRequest) {
  return (req as any).ability
}

/**
 * getCaslUser() — extract casl user context from request.
 */
export function getCaslUser(req: AuthRequest): CaslUser {
  return (req as any).caslUser
}

/**
 * CASL Actions — centralized action definitions.
 *
 * Re-exports the canonical action list from `shared/casl/actions.ts`. All
 * callers (server middleware, server services, frontend hooks) MUST pull from
 * this single source — never inline literals — so that `KNOWN_ACTIONS` stays
 * in sync with what the rest of the app uses.
 */
import { SHARED_ACTION_OBJECT, SHARED_ACTIONS, type SharedAction } from "@shared/casl/actions";

export const Actions = SHARED_ACTION_OBJECT;
export type Action = SharedAction;

/**
 * Ordered, deduplicated list of every supported CASL action. `knownActions`
 * detection in `authorize()` (server/middleware/auth.ts) uses this list to
 * decide whether the caller is doing a CASL ability check or a role check.
 */
export const KNOWN_ACTIONS: readonly string[] = SHARED_ACTIONS;

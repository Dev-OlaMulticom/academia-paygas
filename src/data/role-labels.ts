/**
 * Role Labels Service — database-driven role labels for frontend.
 *
 * Fetches role labels and descriptions from /api/role-permissions/all (admin only)
 * or /api/role-permissions (current user's role).
 * Caches in localStorage for sync access across components.
 *
 * To add a new role label: just UPDATE RoleConfig in DB. No code changes needed.
 */

/**
 * Get the label for a given role from localStorage cache.
 * Falls back to role name if label not found.
 * This is synchronous for immediate rendering.
 */
export function getRoleLabel(role: string): string {
	try {
		const cached = localStorage.getItem("roleLabels");
		if (cached) {
			const labels = JSON.parse(cached) as Record<string, string>;
			return labels[role] || role;
		}
	} catch {
		// Fallback to role name
	}
	return role;
}

/**
 * Get all role labels from localStorage cache.
 * Returns empty object if not cached.
 */
export function getAllRoleLabels(): Record<string, string> {
	try {
		const cached = localStorage.getItem("roleLabels");
		if (cached) {
			return JSON.parse(cached) as Record<string, string>;
		}
	} catch {
		// Fallback to empty object
	}
	return {};
}

/**
 * Clear the role labels cache (call on logout).
 */
export function clearRoleLabelsCache(): void {
	localStorage.removeItem("roleLabels");
}

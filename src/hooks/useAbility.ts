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
import { useEffect, useMemo } from "react";
import { defineFrontendAbility, type FrontendAbility, loadRolePermissions } from "../auth/casl/ability";
import { type User, useAuth } from "./useAuth";

interface UseAbilityReturn {
	ability: FrontendAbility;

	/** Check if user CAN do action on subject */
	can: (action: string, subject: string, conditions?: Record<string, any>) => boolean;

	/** Check if user CANNOT do action on subject */
	cannot: (action: string, subject: string, conditions?: Record<string, any>) => boolean;

	/** Quick role check */
	isRole: (role: string) => boolean;

	/** Quick role checks */
	isAdmin: boolean;
	isGestor: boolean;
	isAtendente: boolean;
	isParceiro: boolean;
	isErps: boolean;

	/** Current user */
	user: User | null;
}

export function useAbility(): UseAbilityReturn {
	const { user } = useAuth();

	// Load DB permissions once on mount / role change
	useEffect(() => {
		if (user?.role) {
			loadRolePermissions();
		}
	}, [user?.role]);

	const ability = useMemo(() => {
		return defineFrontendAbility(user);
	}, [user?.id, user?.role, user?.gestorId]);

	const can = useMemo(() => {
		return (action: string, subject: string, conditions?: Record<string, any>) => {
			return ability.can(action, subject, conditions);
		};
	}, [ability]);

	const cannot = useMemo(() => {
		return (action: string, subject: string, conditions?: Record<string, any>) => {
			return ability.cannot(action, subject, conditions);
		};
	}, [ability]);

	const isRole = useMemo(() => {
		return (role: string) => user?.role === role;
	}, [user?.role]);

	return {
		ability,
		can,
		cannot,
		isRole,
		isAdmin: user?.role === "ADMIN",
		isGestor: user?.role === "GESTOR",
		isAtendente: user?.role === "ATENDENTE",
		isParceiro: user?.role === "PARCEIRO_ACREDITADO",
		isErps: user?.role === "ERPS_REPRESENTANTE",
		user,
	};
}

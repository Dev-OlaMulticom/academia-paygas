import { db } from "../lib/db";
import logger from "../lib/logger";

interface GestorCandidate {
	id: string;
	nome?: string | null;
	marketplaceId?: string | null;
	estabelecimentoId?: string | null;
}

/**
 * Picks the least-loaded gestor from a list using the load map.
 * Deterministic tie-break by nome, then by id.
 */
export function pickBestGestor(candidates: GestorCandidate[], loadMap: Map<string, number>): GestorCandidate | null {
	if (candidates.length === 0) return null;
	return [...candidates].sort((a, b) => {
		const la = loadMap.get(a.id) ?? 0;
		const lb = loadMap.get(b.id) ?? 0;
		if (la !== lb) return la - lb;
		const na = (a.nome || "").localeCompare(b.nome || "");
		if (na !== 0) return na;
		return a.id.localeCompare(b.id);
	})[0];
}

/**
 * Selects the gestor to assign to a user. Selection order:
 *   1. GESTOR sharing the user's marketplaceId
 *   2. GESTOR sharing the user's estabelecimentoId
 *   3. The least-loaded GESTOR overall
 * Returns null when there is no GESTOR at all.
 */
export function selectGestorForUser(
	user: { marketplaceId?: string | null; estabelecimentoId?: string | null },
	gestores: GestorCandidate[],
	loadMap: Map<string, number>,
): GestorCandidate | null {
	let gestor = user.marketplaceId
		? pickBestGestor(
				gestores.filter((g) => g.marketplaceId === user.marketplaceId),
				loadMap,
			)
		: null;
	if (!gestor && user.estabelecimentoId) {
		gestor = pickBestGestor(
			gestores.filter((g) => g.estabelecimentoId === user.estabelecimentoId),
			loadMap,
		);
	}
	if (!gestor) {
		gestor = pickBestGestor(gestores, loadMap);
	}
	return gestor;
}

async function getGestorLoadMap(): Promise<Map<string, number>> {
	const rows = (await db.groupBy("user", {
		by: ["gestorId"],
		where: { role: "ATENDENTE", gestorId: { not: null } },
		_count: { _all: true },
	})) as any[];
	const map = new Map<string, number>();
	for (const row of rows) {
		const count = row?._count?._all ?? 0;
		if (row.gestorId) map.set(row.gestorId, count);
	}
	return map;
}

/**
 * Ensures an ATENDENTE user has a gestor assigned. The frontend blocks access
 * to courses for ATENDENTE users without a gestor, so SSO logins need one.
 * Returns the (possibly updated) user.
 */
export async function ensureGestorAssigned(user: any): Promise<any> {
	if (!user || user.gestorId || user.role !== "ATENDENTE") return user;

	const gestores = (await db.findMany("user", { where: { role: "GESTOR" } })) as GestorCandidate[];
	let gestor = selectGestorForUser(user, gestores, await getGestorLoadMap());

	if (!gestor) {
		const admin = (await db.findFirst("user", { role: "ADMIN" })) as any;
		if (!admin) {
			logger.warn(`[SSO] Nenhum gestor/admin disponível para atribuir a ${user.id}`);
			return user;
		}
		gestor = { id: admin.id, nome: admin.nome };
	}

	user = await db.update("user", { id: user.id }, { gestorId: gestor.id });
	logger.info(`[SSO] Gestor ${gestor.id} asignado automaticamente a ${user.id}`);
	return user;
}

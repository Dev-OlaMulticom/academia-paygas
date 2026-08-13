import { db } from "../lib/db";
import logger from "../lib/logger";

export interface EstabelecimentoData {
	id: string;
	nome?: string;
	cnpj?: string;
	tipo?: string;
	cidade?: string;
	uf?: string;
	ativo?: boolean;
}

/**
 * Upsert (find-or-create + update) an Estabelecimento row from PayGas data.
 * Idempotent — run on every SSO login so names/status stay in sync.
 * Returns the stored row.
 */
export async function upsertEstabelecimento(data: EstabelecimentoData) {
	if (!data.id) return null;

	const create: Record<string, unknown> = {
		id: data.id,
		nome: data.nome || data.id,
		cnpj: data.cnpj || null,
		tipo: data.tipo || null,
		cidade: data.cidade || null,
		uf: data.uf || null,
		ativo: data.ativo ?? true,
	};
	const update: Record<string, unknown> = {};
	if (data.nome) update.nome = data.nome;
	if (data.cnpj) update.cnpj = data.cnpj;
	if (data.tipo) update.tipo = data.tipo;
	if (data.cidade) update.cidade = data.cidade;
	if (data.uf) update.uf = data.uf;
	if (data.ativo !== undefined) update.ativo = data.ativo;

	try {
		return await db.upsert("estabelecimento", { id: data.id }, create, update);
	} catch (err) {
		logger.warn(`[SSO] Erro ao sincronizar estabelecimento ${data.id}:`, err);
		return null;
	}
}

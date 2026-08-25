import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { upsertEstabelecimento } from "./estabelecimento-sync";

export interface SSOUserData {
	sub: string;
	nome: string;
	email: string;
	telefone?: string;
	cpf?: string;
	perfil?: string;
	perfilRotulo?: string;
	setor?: string;
	estabelecimentoId?: string;
	estabelecimentoNome?: string;
	estabelecimentoCnpj?: string;
	estabelecimentoTipo?: string;
	estabelecimentoCidade?: string;
	estabelecimentoUf?: string;
	estabelecimentoAtivo?: boolean;
	marketplaceId?: string;
	retornoUrl?: string;
}

// Roles managed by SSO: perfil decides between them. Privileged roles
// (ADMIN, PARCEIRO_ACREDITADO, ERPS_REPRESENTANTE) are never touched.
const SSO_MANAGED_ROLES = new Set(["GESTOR", "ATENDENTE"]);

function roleFromPerfil(perfil?: string): "GESTOR" | "ATENDENTE" {
	return perfil === "administrador" ? "GESTOR" : "ATENDENTE";
}

/**
 * Computes the role/gestor sync for an existing user based on `perfil`.
 * Returns {} when the current role is not SSO-managed or no perfil is given.
 * When promoting to GESTOR, drops any gestor link.
 */
function roleSyncData(currentRole: string, perfil?: string): Record<string, unknown> {
	if (!perfil || !SSO_MANAGED_ROLES.has(currentRole)) return {};
	const targetRole = roleFromPerfil(perfil);
	const data: Record<string, unknown> = { role: targetRole };
	if (targetRole === "GESTOR") data.gestorId = null;
	return data;
}

// PostgreSQL emails are case-sensitive by default. PayGas sends lowercase, but
// legacy accounts may be stored with mixed case ("Heullerzt@gmail.com").
// Look up case-insensitively so SSO links the account instead of duplicating it.
async function findUserByEmail(email: string) {
	const matches = await drizzleDb.findMany("user", {
		where: { email: { icontains: email } },
	});
	const normalized = email.toLowerCase();
	return matches.find((u: any) => u?.email?.toLowerCase() === normalized) || null;
}

export async function findOrCreateSSOUser(data: SSOUserData) {
	// Sync the Estabelecimento row first so the FK holds on create/update below.
	if (data.estabelecimentoId) {
		await upsertEstabelecimento({
			id: data.estabelecimentoId,
			nome: data.estabelecimentoNome,
			cnpj: data.estabelecimentoCnpj,
			tipo: data.estabelecimentoTipo,
			cidade: data.estabelecimentoCidade,
			uf: data.estabelecimentoUf,
			ativo: data.estabelecimentoAtivo,
		});
	}

	// 1. Lookup by paygasSub (primary identifier)
	let user = await drizzleDb.findUnique("user", { paygasSub: data.sub });

	if (user) {
		// Sync mutable fields. Nome is only updated when the stored value is
		// empty — PayGas names can be noisier than the Academy record.
		const syncData: Record<string, unknown> = {};
		if (data.nome && !user.nome.trim() && data.nome !== user.nome) syncData.nome = data.nome;
		if (data.email && data.email !== user.email) syncData.email = data.email;
		if (data.telefone !== undefined && data.telefone !== user.telefone) syncData.telefone = data.telefone || null;
		if (data.cpf !== undefined && data.cpf !== user.cpf) syncData.cpf = data.cpf || null;
		if (data.perfil !== undefined && data.perfil !== user.perfil) syncData.perfil = data.perfil || null;
		if (data.marketplaceId !== undefined && data.marketplaceId !== user.marketplaceId)
			syncData.marketplaceId = data.marketplaceId || null;
		if (data.estabelecimentoId !== undefined && data.estabelecimentoId !== user.estabelecimentoId)
			syncData.estabelecimentoId = data.estabelecimentoId || null;

		Object.assign(syncData, roleSyncData(user.role, data.perfil));

		if (Object.keys(syncData).length > 0) {
			user = await drizzleDb.update("user", { id: user.id }, syncData);
			logger.info(`[SSO] Usuário ${user.id} sincronizado`);
		}
		return user;
	}

	// 2. No user with this paygasSub — check if email already exists (legacy user)
	if (data.email) {
		const existingByEmail = await findUserByEmail(data.email);
		if (existingByEmail) {
			// Link legacy user to SSO. Preserve the Academy nome and email.
			const linkData: Record<string, unknown> = {
				paygasSub: data.sub,
				telefone: data.telefone || null,
				cpf: data.cpf || null,
				perfil: data.perfil || null,
				marketplaceId: data.marketplaceId || null,
				estabelecimentoId: data.estabelecimentoId || null,
			};
			Object.assign(linkData, roleSyncData(existingByEmail.role, data.perfil));

			user = await drizzleDb.update("user", { id: existingByEmail.id }, linkData);
			logger.info(`[SSO] Usuário existente ${existingByEmail.id} vinculado ao paygasSub`);
			return user;
		}
	}

	// 3. Create new user
	const randomPassword = crypto.randomBytes(32).toString("hex");
	const hashedPassword = await bcrypt.hash(randomPassword, 12);

	try {
		user = await drizzleDb.create("user", {
			email: data.email,
			nome: data.nome,
			senha: hashedPassword,
			role: roleFromPerfil(data.perfil),
			emailVerificado: true,
			paygasSub: data.sub,
			telefone: data.telefone || null,
			cpf: data.cpf || null,
			perfil: data.perfil || null,
			marketplaceId: data.marketplaceId || null,
			estabelecimentoId: data.estabelecimentoId || null,
		});
		logger.info(`[SSO] Novo usuário criado: ${user.id}`);
		return user;
	} catch (createErr: any) {
		// Race condition: another request just created the user
		if (data.email) {
			user = await findUserByEmail(data.email);
			if (user) {
				// Link to SSO
				const linkData: Record<string, unknown> = {
					paygasSub: data.sub,
					telefone: data.telefone || null,
					cpf: data.cpf || null,
					perfil: data.perfil || null,
					marketplaceId: data.marketplaceId || null,
					estabelecimentoId: data.estabelecimentoId || null,
				};
				Object.assign(linkData, roleSyncData(user.role, data.perfil));

				user = await drizzleDb.update("user", { id: user.id }, linkData);
				return user;
			}
		}
		throw createErr;
	}
}

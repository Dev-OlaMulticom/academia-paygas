import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "../lib/db";
import logger from "../lib/logger";

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
	marketplaceId?: string;
	retornoUrl?: string;
}

// PostgreSQL emails are case-sensitive by default. PayGas sends lowercase, but
// legacy accounts may be stored with mixed case ("Heullerzt@gmail.com").
// Look up case-insensitively so SSO links the account instead of duplicating it.
function findUserByEmail(email: string) {
	return db.findFirst("user", {
		email: { equals: email, mode: "insensitive" },
	});
}

export async function findOrCreateSSOUser(data: SSOUserData) {
	// 1. Lookup by paygasSub (primary identifier)
	let user = await db.findUnique("user", { paygasSub: data.sub });

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

		if (Object.keys(syncData).length > 0) {
			user = await db.update("user", { id: user.id }, syncData);
			logger.info(`[SSO] Usuário ${user.id} sincronizado`);
		}
		return user;
	}

	// 2. No user with this paygasSub — check if email already exists (legacy user)
	if (data.email) {
		const existingByEmail = await findUserByEmail(data.email);
		if (existingByEmail) {
			// Link legacy user to SSO. Preserve the Academy nome and email.
			user = await db.update(
				"user",
				{ id: existingByEmail.id },
				{
					paygasSub: data.sub,
					telefone: data.telefone || null,
					cpf: data.cpf || null,
					perfil: data.perfil || null,
					marketplaceId: data.marketplaceId || null,
					estabelecimentoId: data.estabelecimentoId || null,
				},
			);
			logger.info(`[SSO] Usuário existente ${existingByEmail.id} vinculado ao paygasSub`);
			return user;
		}
	}

	// 3. Create new user
	const randomPassword = crypto.randomBytes(32).toString("hex");
	const hashedPassword = await bcrypt.hash(randomPassword, 12);

	try {
		user = await db.create("user", {
			email: data.email,
			nome: data.nome,
			senha: hashedPassword,
			role: "ATENDENTE",
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
				user = await db.update(
					"user",
					{ id: user.id },
					{
						paygasSub: data.sub,
						telefone: data.telefone || null,
						cpf: data.cpf || null,
						perfil: data.perfil || null,
						marketplaceId: data.marketplaceId || null,
						estabelecimentoId: data.estabelecimentoId || null,
					},
				);
				return user;
			}
		}
		throw createErr;
	}
}

import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { db } from "../lib/db";
import logger from "../lib/logger";

export interface SSOUserData {
	sub: string;
	nome: string;
	email: string;
	telefone?: string;
	cpf?: string;
	perfil?: string;
	marketplace_id?: string;
	estabelecimento_id?: string;
}

export async function findOrCreateSSOUser(data: SSOUserData) {
	// 1. Lookup by paygasSub (primary identifier)
	let user = await db.findUnique("user", { paygasSub: data.sub });

	if (user) {
		// Sync mutable fields
		const syncData: Record<string, unknown> = {};
		if (data.nome && data.nome !== user.nome) syncData.nome = data.nome;
		if (data.email && data.email !== user.email) syncData.email = data.email;
		if (data.telefone !== undefined && data.telefone !== user.telefone) syncData.telefone = data.telefone || null;
		if (data.cpf !== undefined && data.cpf !== user.cpf) syncData.cpf = data.cpf || null;
		if (data.perfil !== undefined && data.perfil !== user.perfil) syncData.perfil = data.perfil || null;
		if (data.marketplace_id !== undefined && data.marketplace_id !== user.marketplaceId)
			syncData.marketplaceId = data.marketplace_id || null;
		if (data.estabelecimento_id !== undefined && data.estabelecimento_id !== user.estabelecimentoId)
			syncData.estabelecimentoId = data.estabelecimento_id || null;

		if (Object.keys(syncData).length > 0) {
			user = await db.update("user", { id: user.id }, syncData);
			logger.info(`[SSO] Usuário ${user.id} sincronizado`);
		}
		return user;
	}

	// 2. No user with this paygasSub — check if email already exists (legacy user)
	if (data.email) {
		const existingByEmail = await db.findUnique("user", { email: data.email });
		if (existingByEmail) {
			// Link legacy user to SSO
			user = await db.update("user", { id: existingByEmail.id }, {
				paygasSub: data.sub,
				nome: data.nome || existingByEmail.nome,
				telefone: data.telefone || null,
				cpf: data.cpf || null,
				perfil: data.perfil || null,
				marketplaceId: data.marketplace_id || null,
				estabelecimentoId: data.estabelecimento_id || null,
			});
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
			marketplaceId: data.marketplace_id || null,
			estabelecimentoId: data.estabelecimento_id || null,
		});
		logger.info(`[SSO] Novo usuário criado: ${user.id}`);
		return user;
	} catch (createErr: any) {
		// Race condition: another request just created the user
		if (data.email) {
			user = await db.findUnique("user", { email: data.email });
			if (user) {
				// Link to SSO
				user = await db.update("user", { id: user.id }, {
					paygasSub: data.sub,
					telefone: data.telefone || null,
					cpf: data.cpf || null,
					perfil: data.perfil || null,
					marketplaceId: data.marketplace_id || null,
					estabelecimentoId: data.estabelecimento_id || null,
				});
				return user;
			}
		}
		throw createErr;
	}
}

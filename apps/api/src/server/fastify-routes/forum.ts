import type { FastifyInstance, FastifyPluginCallback, FastifyRequest, FastifyReply } from "fastify";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { authenticate } from "../fastify-plugins/auth";
import { logActivity } from "../services/log";

/**
 * Forum routes — migrated from Express routes/forum.ts.
 * All endpoints require authentication.
 */
const forumRoutes: FastifyPluginCallback = (fastify: FastifyInstance, _opts, done) => {
	const AUTHOR_SELECT = { id: true, nome: true, role: true, avatarUrl: true } as const;

	// GET /api/forum
	fastify.get("/", { preHandler: [authenticate] }, async (_request: FastifyRequest, reply: FastifyReply) => {
		try {
			const posts = (await drizzleDb.findMany("forumPost", {
				orderBy: { createdAt: "desc" },
			})) as any[];

			const autorIds = [...new Set(posts.map((p: any) => p.autorId).filter(Boolean))];
			const autores = autorIds.length
				? (await drizzleDb.findMany("user", {
						where: { id: { in: autorIds } },
						select: AUTHOR_SELECT,
				  })) as any[]
				: [];
			const autorMap = new Map(autores.map((a: any) => [a.id, a]));

			return reply.send(posts.map((p: any) => ({ ...p, autor: autorMap.get(p.autorId) || null })));
		} catch (error) {
			logger.error("[FORUM ERROR]", error);
			return reply.code(500).send({ error: "Erro ao buscar posts do fórum" });
		}
	});

	// POST /api/forum
	fastify.post("/", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const { titulo, conteudo, tags } = request.body as { titulo?: string; conteudo?: string; tags?: string[] | string };
			const userId = request.userId!;
			if (!titulo || !conteudo) {
				return reply.code(400).send({ error: "Título e conteúdo são obrigatórios" });
			}
			const tagsStr = Array.isArray(tags) ? JSON.stringify(tags) : undefined;
			const post = (await drizzleDb.create("forumPost", {
				titulo,
				conteudo,
				...(tagsStr ? { tags: tagsStr } : {}),
				autorId: userId,
			})) as any;
			const autor = (await drizzleDb.findUnique("user", { id: userId }, { select: AUTHOR_SELECT })) as any;
			await logActivity(userId, "Forum Post", `Post: ${titulo}`);
			return reply.code(201).send({ ...post, autor });
		} catch (error) {
			logger.error("[FORUM CREATE ERROR]", error);
			return reply.code(500).send({ error: "Erro ao criar post" });
		}
	});

	// POST /api/forum/:id/like
	fastify.post("/:id/like", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const postId = (request.params as any).id as string;
			const post = (await drizzleDb.findUnique("forumPost", { id: postId })) as any;
			if (!post) {
				return reply.code(404).send({ error: "Post não encontrado" });
			}
			const _updated = await drizzleDb.update("forumPost", { id: postId }, { likes: post.likes + 1 });
			const updated = _updated as any;
			const autor = (await drizzleDb.findUnique("user", { id: updated.autorId }, { select: AUTHOR_SELECT })) as any;
			await logActivity(request.userId!, "Forum Like", `Post: ${post.titulo}`);
			return reply.send({ ...updated, autor });
		} catch (error) {
			logger.error("[FORUM LIKE ERROR]", error);
			return reply.code(500).send({ error: "Erro ao curtir post" });
		}
	});

	// POST /api/forum/:id/reply
	fastify.post("/:id/reply", { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
		try {
			const postId = (request.params as any).id as string;
			const post = (await drizzleDb.findUnique("forumPost", { id: postId })) as any;
			if (!post) {
				return reply.code(404).send({ error: "Post não encontrado" });
			}
			const _updated = await drizzleDb.update("forumPost", { id: postId }, { replies: post.replies + 1 });
			const updated = _updated as any;
			const autor = (await drizzleDb.findUnique("user", { id: updated.autorId }, { select: AUTHOR_SELECT })) as any;
			await logActivity(request.userId!, "Forum Resposta", `Post: ${post.titulo}`);
			return reply.send({ ...updated, autor });
		} catch (error) {
			logger.error("[FORUM REPLY ERROR]", error);
			return reply.code(500).send({ error: "Erro ao responder post" });
		}
	});

	done();
};

export default forumRoutes;

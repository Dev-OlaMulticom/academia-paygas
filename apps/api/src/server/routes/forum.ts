import { Router } from "express";
import { drizzleDb } from "../lib/drizzle-db";
import logger from "../lib/logger";
import { type AuthRequest, authenticate } from "../middleware/auth";
import { logActivity } from "../services/log";

const router = Router();

const AUTHOR_SELECT = { id: true, nome: true, role: true, avatarUrl: true } as const;

// GET /api/forum
router.get("/", authenticate, async (_req: AuthRequest, res) => {
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

		res.json(posts.map((p: any) => ({ ...p, autor: autorMap.get(p.autorId) || null })));
	} catch (error) {
		logger.error("[FORUM ERROR]", error);
		res.status(500).json({ error: "Erro ao buscar posts do fórum" });
	}
});

// POST /api/forum
router.post("/", authenticate, async (req: AuthRequest, res) => {
	try {
		const { titulo, conteudo, tags } = req.body as { titulo?: string; conteudo?: string; tags?: string[] | string };
		const userId = req.userId!;
		if (!titulo || !conteudo) {
			return res.status(400).json({ error: "Título e conteúdo são obrigatórios" });
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
		res.status(201).json({ ...post, autor });
	} catch (error) {
		logger.error("[FORUM CREATE ERROR]", error);
		res.status(500).json({ error: "Erro ao criar post" });
	}
});

// POST /api/forum/:id/like
router.post("/:id/like", authenticate, async (req: AuthRequest, res) => {
	try {
		const postId = req.params.id as string;
		const post = (await drizzleDb.findUnique("forumPost", { id: postId })) as any;
		if (!post) {
			return res.status(404).json({ error: "Post não encontrado" });
		}
		const _updated = await drizzleDb.update("forumPost", { id: postId }, { likes: post.likes + 1 });
		const updated = _updated as any;
		const autor = (await drizzleDb.findUnique("user", { id: updated.autorId }, { select: AUTHOR_SELECT })) as any;
		await logActivity(req.userId!, "Forum Like", `Post: ${post.titulo}`);
		res.json({ ...updated, autor });
	} catch (error) {
		logger.error("[FORUM LIKE ERROR]", error);
		res.status(500).json({ error: "Erro ao curtir post" });
	}
});

// POST /api/forum/:id/reply
router.post("/:id/reply", authenticate, async (req: AuthRequest, res) => {
	try {
		const postId = req.params.id as string;
		const post = (await drizzleDb.findUnique("forumPost", { id: postId })) as any;
		if (!post) {
			return res.status(404).json({ error: "Post não encontrado" });
		}
		const _updated = await drizzleDb.update("forumPost", { id: postId }, { replies: post.replies + 1 });
		const updated = _updated as any;
		const autor = (await drizzleDb.findUnique("user", { id: updated.autorId }, { select: AUTHOR_SELECT })) as any;
		await logActivity(req.userId!, "Forum Resposta", `Post: ${post.titulo}`);
		res.json({ ...updated, autor });
	} catch (error) {
		logger.error("[FORUM REPLY ERROR]", error);
		res.status(500).json({ error: "Erro ao responder post" });
	}
});

export default router;

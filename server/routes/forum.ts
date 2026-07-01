import { Router } from "express";
import { db } from "../lib/db";
import logger from "../lib/logger";
import { prisma } from "../lib/prisma";
import { type AuthRequest, authenticate } from "../middleware/auth";
import { logActivity } from "../services/log";

const router = Router();

const AUTHOR_SELECT = { id: true, nome: true, role: true, avatarUrl: true } as const;

// GET /api/forum
router.get("/", authenticate, async (_req: AuthRequest, res) => {
	try {
		const posts = await prisma.forumPost.findMany({
			include: { autor: { select: AUTHOR_SELECT } },
			orderBy: { createdAt: "desc" },
		});
		res.json(posts);
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
		const post = await db.create("forumPost", {
			titulo,
			conteudo,
			...(tagsStr ? { tags: tagsStr } : {}),
			autorId: userId,
		});
		const postWithAutor = await prisma.forumPost.findUnique({
			where: { id: (post as any).id },
			include: { autor: { select: AUTHOR_SELECT } },
		});
		await logActivity(userId, "Forum Post", `Post: ${titulo}`);
		res.status(201).json(postWithAutor);
	} catch (error) {
		logger.error("[FORUM CREATE ERROR]", error);
		res.status(500).json({ error: "Erro ao criar post" });
	}
});

// POST /api/forum/:id/like
router.post("/:id/like", authenticate, async (req: AuthRequest, res) => {
	try {
		const postId = req.params.id as string;
		const post = await prisma.forumPost.findUnique({ where: { id: postId } });
		if (!post) {
			return res.status(404).json({ error: "Post não encontrado" });
		}
		const _updated = await db.update("forumPost", { id: postId }, { likes: post.likes + 1 });
		const updatedWithAutor = await prisma.forumPost.findUnique({
			where: { id: postId },
			include: { autor: { select: AUTHOR_SELECT } },
		});
		await logActivity(req.userId!, "Forum Like", `Post: ${post.titulo}`);
		res.json(updatedWithAutor);
	} catch (error) {
		logger.error("[FORUM LIKE ERROR]", error);
		res.status(500).json({ error: "Erro ao curtir post" });
	}
});

// POST /api/forum/:id/reply
router.post("/:id/reply", authenticate, async (req: AuthRequest, res) => {
	try {
		const postId = req.params.id as string;
		const post = await prisma.forumPost.findUnique({ where: { id: postId } });
		if (!post) {
			return res.status(404).json({ error: "Post não encontrado" });
		}
		const _updated = await db.update("forumPost", { id: postId }, { replies: post.replies + 1 });
		const updatedWithAutor = await prisma.forumPost.findUnique({
			where: { id: postId },
			include: { autor: { select: AUTHOR_SELECT } },
		});
		await logActivity(req.userId!, "Forum Resposta", `Post: ${post.titulo}`);
		res.json(updatedWithAutor);
	} catch (error) {
		logger.error("[FORUM REPLY ERROR]", error);
		res.status(500).json({ error: "Erro ao responder post" });
	}
});

export default router;

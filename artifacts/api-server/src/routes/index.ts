import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usuariosRouter from "./usuarios";
import cmsRouter from "./cms";
import progressoRouter from "./progresso";
import certificatesRouter from "./certificates";
import notificationsRouter from "./notifications";
import dashboardRouter from "./dashboard";
import { getServerEncryptionKey } from "../middleware/encryption";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.get("/config", (_req, res) => {
  res.json({ encryptionKey: getServerEncryptionKey() });
});
router.use("/usuarios", usuariosRouter);
router.use("/cms", cmsRouter);
router.use("/modulos", cmsRouter);
router.use("/progresso", progressoRouter);
router.use("/certificates", certificatesRouter);
router.use("/notifications", notificationsRouter);
router.use("/dashboard", dashboardRouter);

export default router;

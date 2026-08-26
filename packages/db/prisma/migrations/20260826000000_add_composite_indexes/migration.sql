-- Índices compuestos para acelerar las consultas más frecuentes
-- (dashboard, logs, badge de notificaciones y dedup de gamificación).
-- Idempotente: seguro de reaplicar.

-- Logs endpoint: filtra userId + ordena por createdAt DESC
CREATE INDEX IF NOT EXISTS "ActivityLog_userId_createdAt_idx"
	ON "ActivityLog" USING btree ("userId", "createdAt");

-- Badge de no-leídas: WHERE toId = X AND lida = false
CREATE INDEX IF NOT EXISTS "Notification_toId_lida_idx"
	ON "Notification" USING btree ("toId", "lida");

-- Dedup de awardPointsIfNotAwarded: WHERE userId + action + details
CREATE UNIQUE INDEX IF NOT EXISTS "PointsTransaction_userId_action_details_key"
	ON "PointsTransaction" USING btree ("userId", "action", "details");

-- Dashboard: counts WHERE userId = X AND concluido = true
CREATE INDEX IF NOT EXISTS "Progresso_userId_concluido_idx"
	ON "Progresso" USING btree ("userId", "concluido");

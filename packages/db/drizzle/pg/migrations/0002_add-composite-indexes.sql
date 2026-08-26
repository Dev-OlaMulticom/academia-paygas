CREATE INDEX "ActivityLog_userId_createdAt_idx" ON "ActivityLog" USING btree ("userId","createdAt");--> statement-breakpoint
CREATE INDEX "Notification_toId_lida_idx" ON "Notification" USING btree ("toId","lida");--> statement-breakpoint
CREATE UNIQUE INDEX "PointsTransaction_userId_action_details_key" ON "PointsTransaction" USING btree ("userId","action","details");--> statement-breakpoint
CREATE INDEX "Progresso_userId_concluido_idx" ON "Progresso" USING btree ("userId","concluido");
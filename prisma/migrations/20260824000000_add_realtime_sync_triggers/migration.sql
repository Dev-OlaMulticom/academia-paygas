-- Real-time sync triggers
--
-- Notifies channel `academia_sync` with {table, id, op} on every row change.
-- Consumed by server/services/db-realtime.ts, which LISTENs on every
-- registered database and mirrors the changed row into the others
-- immediately (instead of waiting for the periodic sync worker).
--
-- Safe/idempotent: CREATE OR REPLACE + DROP TRIGGER IF EXISTS so re-running
-- (e.g. via the background migration-sync service against a backup DB) never
-- fails and never touches existing data.

CREATE OR REPLACE FUNCTION academia_notify_change() RETURNS trigger AS $$
DECLARE
	payload TEXT;
BEGIN
	payload := json_build_object(
		'table', TG_TABLE_NAME,
		'id', COALESCE(NEW.id, OLD.id),
		'op', TG_OP
	)::text;
	PERFORM pg_notify('academia_sync', payload);
	RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_academia_sync ON "Estabelecimento";
CREATE TRIGGER trg_academia_sync AFTER INSERT OR UPDATE OR DELETE ON "Estabelecimento" FOR EACH ROW EXECUTE FUNCTION academia_notify_change();

DROP TRIGGER IF EXISTS trg_academia_sync ON "User";
CREATE TRIGGER trg_academia_sync AFTER INSERT OR UPDATE OR DELETE ON "User" FOR EACH ROW EXECUTE FUNCTION academia_notify_change();

DROP TRIGGER IF EXISTS trg_academia_sync ON "Curso";
CREATE TRIGGER trg_academia_sync AFTER INSERT OR UPDATE OR DELETE ON "Curso" FOR EACH ROW EXECUTE FUNCTION academia_notify_change();

DROP TRIGGER IF EXISTS trg_academia_sync ON "Aula";
CREATE TRIGGER trg_academia_sync AFTER INSERT OR UPDATE OR DELETE ON "Aula" FOR EACH ROW EXECUTE FUNCTION academia_notify_change();

DROP TRIGGER IF EXISTS trg_academia_sync ON "Licao";
CREATE TRIGGER trg_academia_sync AFTER INSERT OR UPDATE OR DELETE ON "Licao" FOR EACH ROW EXECUTE FUNCTION academia_notify_change();

DROP TRIGGER IF EXISTS trg_academia_sync ON "Quiz";
CREATE TRIGGER trg_academia_sync AFTER INSERT OR UPDATE OR DELETE ON "Quiz" FOR EACH ROW EXECUTE FUNCTION academia_notify_change();

DROP TRIGGER IF EXISTS trg_academia_sync ON "QuizPergunta";
CREATE TRIGGER trg_academia_sync AFTER INSERT OR UPDATE OR DELETE ON "QuizPergunta" FOR EACH ROW EXECUTE FUNCTION academia_notify_change();

DROP TRIGGER IF EXISTS trg_academia_sync ON "QuizResponse";
CREATE TRIGGER trg_academia_sync AFTER INSERT OR UPDATE OR DELETE ON "QuizResponse" FOR EACH ROW EXECUTE FUNCTION academia_notify_change();

DROP TRIGGER IF EXISTS trg_academia_sync ON "Progresso";
CREATE TRIGGER trg_academia_sync AFTER INSERT OR UPDATE OR DELETE ON "Progresso" FOR EACH ROW EXECUTE FUNCTION academia_notify_change();

DROP TRIGGER IF EXISTS trg_academia_sync ON "Certificate";
CREATE TRIGGER trg_academia_sync AFTER INSERT OR UPDATE OR DELETE ON "Certificate" FOR EACH ROW EXECUTE FUNCTION academia_notify_change();

DROP TRIGGER IF EXISTS trg_academia_sync ON "Notification";
CREATE TRIGGER trg_academia_sync AFTER INSERT OR UPDATE OR DELETE ON "Notification" FOR EACH ROW EXECUTE FUNCTION academia_notify_change();

DROP TRIGGER IF EXISTS trg_academia_sync ON "ActivityLog";
CREATE TRIGGER trg_academia_sync AFTER INSERT OR UPDATE OR DELETE ON "ActivityLog" FOR EACH ROW EXECUTE FUNCTION academia_notify_change();

DROP TRIGGER IF EXISTS trg_academia_sync ON "PointsTransaction";
CREATE TRIGGER trg_academia_sync AFTER INSERT OR UPDATE OR DELETE ON "PointsTransaction" FOR EACH ROW EXECUTE FUNCTION academia_notify_change();

DROP TRIGGER IF EXISTS trg_academia_sync ON "ForumPost";
CREATE TRIGGER trg_academia_sync AFTER INSERT OR UPDATE OR DELETE ON "ForumPost" FOR EACH ROW EXECUTE FUNCTION academia_notify_change();

DROP TRIGGER IF EXISTS trg_academia_sync ON "ModuleConfig";
CREATE TRIGGER trg_academia_sync AFTER INSERT OR UPDATE OR DELETE ON "ModuleConfig" FOR EACH ROW EXECUTE FUNCTION academia_notify_change();

DROP TRIGGER IF EXISTS trg_academia_sync ON "XPConfig";
CREATE TRIGGER trg_academia_sync AFTER INSERT OR UPDATE OR DELETE ON "XPConfig" FOR EACH ROW EXECUTE FUNCTION academia_notify_change();

DROP TRIGGER IF EXISTS trg_academia_sync ON "RoleConfig";
CREATE TRIGGER trg_academia_sync AFTER INSERT OR UPDATE OR DELETE ON "RoleConfig" FOR EACH ROW EXECUTE FUNCTION academia_notify_change();

DROP TRIGGER IF EXISTS trg_academia_sync ON "Conquista";
CREATE TRIGGER trg_academia_sync AFTER INSERT OR UPDATE OR DELETE ON "Conquista" FOR EACH ROW EXECUTE FUNCTION academia_notify_change();

DROP TRIGGER IF EXISTS trg_academia_sync ON "UserConquista";
CREATE TRIGGER trg_academia_sync AFTER INSERT OR UPDATE OR DELETE ON "UserConquista" FOR EACH ROW EXECUTE FUNCTION academia_notify_change();

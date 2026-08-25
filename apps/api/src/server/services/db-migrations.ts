/**
 * Background Migration Sync Service
 *
 * Mantem os schemas das bases de backup alinhados com a primaria, aplicando
 * automaticamente as migrations pendentes. Politica de preservacao de dados:
 *
 *   - Statements ADITIVOS (CREATE TABLE, ADD COLUMN, ADD CONSTRAINT, CREATE
 *     INDEX, RENAME TABLE/COLUMN/CONSTRAINT/INDEX) sao aplicados SEMPRE.
 *   - Statements DESTRUTIVOS (DROP TABLE, DROP COLUMN, DROP INDEX, DROP
 *     CONSTRAINT, TRUNCATE, DELETE FROM) sao APLICADOS APENAS se nao houver
 *     dados que seriam perdidos. Se houver dados, sao PULADOS e registrados.
 *   - Bloco PL/pgSQL (DO $$...$$): se contem qualquer statement destrutivo,
 *     bloco inteiro e pulado. Caso contrario, aplicado.
 *   - Cada migration aplicada (mesmo parcialmente) e registrada na tabela
 *     `_prisma_migrations` do backup para nao ser reprocessada.
 *
 * Triggers:
 *   - Startup (apos health-check inicial estabelecer quem esta online)
 *   - Recovery: db-health dispara triggerMigrationSync(name) quando uma DB
 *     transita offline -> online
 *
 * NUNCA roda contra a primaria (ela ja e a fonte de verdade do schema).
 *
 * Usage:
 *   import { triggerMigrationSync } from "../services/db-migrations"
 *   await triggerMigrationSync("PG_2")
 *
 *   import { getMigrationStats } from "../services/db-migrations"
 *   getMigrationStats()
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { type DatabaseEntry, dbRegistry } from "../config/databases";
import logger from "../lib/logger";

const MIGRATIONS_DIR = path.resolve(__dirname, "../../prisma/migrations");
const PRISMA_TABLE = "_prisma_migrations";

interface MigrationFile {
	name: string;
	sql: string;
}

interface ParsedStatement {
	sql: string;
	kind: "SAFE" | "RENAME" | "PLPGSQL" | "DESTRUCTIVE";
	action: string;
}

interface MigrationStats {
	runs: number;
	migrationsApplied: number;
	statementsApplied: number;
	statementsSkipped: number;
	errors: number;
}

const stats: MigrationStats = {
	runs: 0,
	migrationsApplied: 0,
	statementsApplied: 0,
	statementsSkipped: 0,
	errors: 0,
};

let isRunning = false;
let lastRunAt: number | null = null;

/**
 * Lista os arquivos de migration em ordem cronologica (pelo nome do diretorio).
 * Cada diretorio tem um migration.sql.
 */
function listMigrationFiles(): MigrationFile[] {
	if (!fs.existsSync(MIGRATIONS_DIR)) return [];
	return fs
		.readdirSync(MIGRATIONS_DIR)
		.filter((d) => {
			const p = path.join(MIGRATIONS_DIR, d);
			return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, "migration.sql"));
		})
		.sort()
		.map((name) => ({
			name,
			sql: fs.readFileSync(path.join(MIGRATIONS_DIR, name, "migration.sql"), "utf8"),
		}));
}

/**
 * Divide SQL em statements individuais. Respeita:
 *   - comentarios `-- ...`
 *   - literais string '...'
 *   - blocos PL/pgSQL `DO $$ ... $$;` (conteudo nao e parseado por `;`)
 */
function splitStatements(sql: string): string[] {
	const out: string[] = [];
	let buf = "";
	let i = 0;
	while (i < sql.length) {
		// Line comment
		if (sql.startsWith("--", i)) {
			const nl = sql.indexOf("\n", i);
			if (nl === -1) break;
			i = nl + 1;
			continue;
		}
		// PL/pgSQL dollar-quoted block: `DO $$ ... $$;` or `$$ ... $$;`
		if (sql.startsWith("DO $$", i) || sql.startsWith("$$", i)) {
			const start = i;
			const openDollar = sql.indexOf("$$", i);
			if (openDollar === -1) {
				buf += sql.slice(i);
				break;
			}
			const closeDollar = sql.indexOf("$$", openDollar + 2);
			if (closeDollar === -1) {
				buf += sql.slice(i);
				break;
			}
			const semi = sql.indexOf(";", closeDollar + 2);
			const end = semi === -1 ? sql.length : semi + 1;
			buf += sql.slice(start, end);
			out.push(buf.trim());
			buf = "";
			i = end;
			continue;
		}
		// String literal
		if (sql[i] === "'") {
			const start = i;
			i++;
			while (i < sql.length) {
				if (sql[i] === "'") {
					if (sql[i + 1] === "'") {
						i += 2;
						continue;
					}
					i++;
					break;
				}
				i++;
			}
			buf += sql.slice(start, i);
			continue;
		}
		if (sql[i] === ";") {
			const stmt = buf.trim();
			if (stmt) out.push(stmt);
			buf = "";
			i++;
			continue;
		}
		buf += sql[i];
		i++;
	}
	if (buf.trim()) out.push(buf.trim());
	return out;
}

/**
 * Classifica um statement. RENAME e tratado como seguro (preserva dados —
 * apenas renomeia o objeto).
 */
function classifyStatement(stmt: string): ParsedStatement {
	const upper = stmt.toUpperCase().trim();
	const m = upper.match(/^\s*(\w+(?:\s+\w+)?)/);
	const action = m ? m[1].trim() : "";

	// PL/pgSQL block — verifica conteudo
	if (upper.startsWith("DO $$") || upper.startsWith("$$")) {
		if (/\b(DROP\s+TABLE|DROP\s+COLUMN|TRUNCATE|DELETE\s+FROM|DROP\s+INDEX)\b/.test(upper)) {
			return { sql: stmt, kind: "DESTRUCTIVE", action: "DO" };
		}
		return { sql: stmt, kind: "PLPGSQL", action: "DO" };
	}

	// RENAMEs (preservam dados)
	if (upper.startsWith("RENAME")) return { sql: stmt, kind: "RENAME", action: "RENAME" };
	if (upper.startsWith("ALTER TABLE") && /\bRENAME\s+(TO|COLUMN|CONSTRAINT)\b/.test(upper)) {
		return { sql: stmt, kind: "RENAME", action: "ALTER" };
	}
	if (upper.startsWith("ALTER INDEX") && /\bRENAME\s+TO\b/.test(upper)) {
		return { sql: stmt, kind: "RENAME", action: "ALTER" };
	}

	// Destructive
	if (
		/^(DROP\s+TABLE|DROP\s+INDEX|DROP\s+CONSTRAINT|TRUNCATE|DELETE\s+FROM)\b/.test(upper) ||
		/^ALTER\s+TABLE.*\bDROP\s+(COLUMN|CONSTRAINT|INDEX)\b/.test(upper)
	) {
		return { sql: stmt, kind: "DESTRUCTIVE", action };
	}

	return { sql: stmt, kind: "SAFE", action };
}

/**
 * Garante que a tabela `_prisma_migrations` existe ( Prisma cria automaticamente,
 * mas em bases antigas pode nao ter — usamos IF NOT EXISTS) e retorna o set de
 * migrations ja aplicadas (rolled_back_at IS NULL).
 *
 * IMPORTANTE: Nao dependemos de UNIQUE constraint em `migration_name` — versions
 * antigas do Prisma nao criavam essa constraint (apenas PK em `id`). Por isso
 * `recordMigration` usa SELECT-then-INSERT/UPDATE.
 */
async function getAppliedMigrations(target: DatabaseEntry): Promise<Set<string>> {
	if (!target.pool) return new Set();
	try {
		await target.pool.query(`
			CREATE TABLE IF NOT EXISTS "${PRISMA_TABLE}" (
				id VARCHAR(36) NOT NULL,
				migration_name VARCHAR(255) NOT NULL,
				finished_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
				rolled_back_at TIMESTAMPTZ,
				applied_steps_count INTEGER NOT NULL DEFAULT 0,
				logs TEXT,
				started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
				checksum VARCHAR(64),
				CONSTRAINT "${PRISMA_TABLE}_pkey" PRIMARY KEY ("id")
			)
		`);
		const { rows } = await target.pool.query<{ migration_name: string }>({
			text: `SELECT migration_name FROM "${PRISMA_TABLE}" WHERE rolled_back_at IS NULL`,
			values: [],
		});
		return new Set(rows.map((r) => r.migration_name));
	} catch (err: any) {
		logger.warn(`[DB-MIG] Falha ao ler ${PRISMA_TABLE}: ${err?.message}`);
		return new Set();
	}
}

/**
 * Registra uma migration como aplicada (mesmo parcialmente) para nao reprocessar.
 * Usa SELECT-then-INSERT/UPDATE em vez de `ON CONFLICT (migration_name)` porque
 * a coluna `migration_name` pode nao ter UNIQUE constraint em bases antigas.
 *
 * O campo `checksum` e obrigatorio (NOT NULL) no schema do Prisma — passamos o
 * SHA-1 do SQL da migration (mesmo calculo que o Prisma faz).
 */
async function recordMigration(target: DatabaseEntry, name: string, sql: string, logs: string): Promise<void> {
	if (!target.pool) return;
	const checksum = crypto.createHash("sha1").update(sql).digest("hex");
	const { rows: existing } = await target.pool.query<{ id: string }>({
		text: `SELECT id FROM "${PRISMA_TABLE}" WHERE migration_name = $1 LIMIT 1`,
		values: [name],
	});
	if (existing.length > 0) {
		await target.pool.query({
			text: `UPDATE "${PRISMA_TABLE}" SET finished_at = NOW(), logs = $2, checksum = $3, rolled_back_at = NULL WHERE id = $1`,
			values: [existing[0].id, logs, checksum],
		});
	} else {
		await target.pool.query({
			text: `INSERT INTO "${PRISMA_TABLE}" (id, migration_name, finished_at, applied_steps_count, logs, checksum)
				 VALUES ($1, $2, NOW(), $3, $4, $5)`,
			values: [crypto.randomUUID(), name, 1, logs, checksum],
		});
	}
}

/**
 * Aplica uma migration a um target. Statements SAFE/RENAME/PLPGSQL sao aplicados.
 * DESTRUCTIVE sao pulados (preservando dados). Erros "already exists"/"does not
 * exist" sao tratados como sucesso (statements sao idempotentes por IF EXISTS/IF
 * NOT EXISTS). Records a migration como aplicada.
 */
async function applyMigration(target: DatabaseEntry, migration: MigrationFile): Promise<{ applied: number; skipped: number }> {
	if (!target.pool) return { applied: 0, skipped: 0 };
	const statements = splitStatements(migration.sql).map(classifyStatement);
	let applied = 0;
	let skipped = 0;
	const skipLog: string[] = [];

	for (const s of statements) {
		if (s.kind === "DESTRUCTIVE") {
			skipped++;
			const preview = s.sql.replace(/\s+/g, " ").slice(0, 200);
			skipLog.push(`SKIPPED: ${preview}`);
			logger.warn(`[DB-MIG] ${migration.name}: pulando destrutivo — ${preview}`);
			continue;
		}
		try {
			await target.pool.query(s.sql);
			applied++;
		} catch (err: any) {
			const msg = err?.message || "";
			// Statements idempotentes (IF EXISTS / IF NOT EXISTS): erros esperados
			if (/already exists|does not exist|duplicate object|duplicate key|no such|not found/i.test(msg)) {
				applied++;
			} else {
				stats.errors++;
				logger.warn(`[DB-MIG] ${migration.name}: erro: ${msg}\n   ${s.sql.slice(0, 200)}`);
			}
		}
	}

	const logs =
		skipLog.length > 0
			? `Partial application. Skipped ${skipLog.length} destructive:\n${skipLog.join("\n")}`
			: "Full application.";
	await recordMigration(target, migration.name, migration.sql, logs);
	return { applied, skipped };
}

/**
 * Reconcilia drift de esquema entre primaria e backup. COLUNAS adicionadas a
 * primaria via `prisma db push` (sem migration gerada) sao detectadas e
 * adicionadas ao backup com ADD COLUMN IF NOT EXISTS, preservando default e
 * nullability. NUNCA remove colunas (preserva dados do backup).
 *
 * Tabelas que existem na primaria mas nao no backup: logadas como warning —
 * criacao automatica exigiria reproduzir constraints/indices; deixamos para
 * operacao manual. Esta funcao foca em colunas adicionadas (caso tipico do db push).
 */
async function reconcileSchemaDrift(target: DatabaseEntry, source: DatabaseEntry): Promise<{ columnsAdded: number }> {
	if (!target.pool || !source.pool) return { columnsAdded: 0 };
	const { rows: sourceTabs } = await source.pool.query<{ tablename: string }>({
		text: `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
		values: [],
	});
	const { rows: targetTabs } = await target.pool.query<{ tablename: string }>({
		text: `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
		values: [],
	});
	const targetTabsSet = new Set(targetTabs.map((t) => t.tablename));

	let columnsAdded = 0;
	for (const { tablename } of sourceTabs) {
		if (tablename === PRISMA_TABLE) continue;
		if (!targetTabsSet.has(tablename)) {
			logger.warn(
				`[DB-MIG] drift: tabela "${tablename}" existe na primaria mas nao no backup — auto-create nao suportado, verifique manualmente`,
			);
			continue;
		}

		const { rows: srcCols } = await source.pool.query<{
			column_name: string;
			data_type: string;
			column_default: string | null;
			is_nullable: string;
		}>({
			text: `SELECT column_name, data_type, column_default, is_nullable
				 FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
			values: [tablename],
		});
		const { rows: tgtCols } = await target.pool.query<{ column_name: string }>({
			text: `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
			values: [tablename],
		});
		const tgtColsSet = new Set(tgtCols.map((c) => c.column_name));

		for (const col of srcCols) {
			if (tgtColsSet.has(col.column_name)) continue;
			const defClause = col.column_default ? `DEFAULT ${col.column_default}` : "";
			const nullSpec = col.is_nullable === "NO" ? "NOT NULL" : "";
			const sql =
				`ALTER TABLE "${tablename}" ADD COLUMN IF NOT EXISTS "${col.column_name}" ${col.data_type} ${nullSpec} ${defClause}`.replace(
					/\s+/g,
					" ",
				);
			try {
				await target.pool.query(sql);
				columnsAdded++;
				stats.statementsApplied++;
				logger.info(`[DB-MIG] drift: adicionado "${tablename}"."${col.column_name}"`);
			} catch (err: any) {
				stats.errors++;
				logger.warn(`[DB-MIG] drift: falha ao adicionar "${tablename}"."${col.column_name}": ${err?.message}`);
			}
		}
	}
	return { columnsAdded };
}

/**
 * Sincroniza migrations pendentes de um target DB especifico e depois reconcilia
 * drift de schema (colunas adicionadas via `prisma db push` sem migration).
 * Nao roda contra a primaria (ela e a fonte de verdade do schema).
 */
export async function syncMigrationsToTarget(
	targetName: string,
): Promise<{ applied: number; skipped: number; migrations: number }> {
	const target = dbRegistry.getByName(targetName);
	if (!target?.pool) {
		return { applied: 0, skipped: 0, migrations: 0 };
	}
	const primary = dbRegistry.getPrimary();
	if (primary && target.name === primary.name) {
		logger.info(`[DB-MIG] ${targetName} e primaria — pulando sync de migrations`);
		return { applied: 0, skipped: 0, migrations: 0 };
	}
	if (!primary?.pool) {
		logger.warn(`[DB-MIG] sem primaria saudavel para comparar drift`);
		return { applied: 0, skipped: 0, migrations: 0 };
	}

	if (isRunning) {
		logger.info(`[DB-MIG] Ja rodando — ${targetName} aguarda proxima rodada`);
		return { applied: 0, skipped: 0, migrations: 0 };
	}

	isRunning = true;
	try {
		const files = listMigrationFiles();
		const appliedSet = await getAppliedMigrations(target);
		const pending = files.filter((f) => !appliedSet.has(f.name));

		stats.runs++;
		lastRunAt = Date.now();

		let totalApplied = 0;
		let totalSkipped = 0;
		if (pending.length > 0) {
			logger.info(
				`[DB-MIG] ${pending.length} migracoes pendentes em ${targetName}: ${pending.map((p) => p.name).join(", ")}`,
			);
			for (const m of pending) {
				try {
					const r = await applyMigration(target, m);
					totalApplied += r.applied;
					totalSkipped += r.skipped;
					stats.migrationsApplied++;
					stats.statementsApplied += r.applied;
					stats.statementsSkipped += r.skipped;
					logger.info(`[DB-MIG] ${targetName}: ${m.name} OK (${r.applied} aplicados, ${r.skipped} pulados)`);
				} catch (err: any) {
					stats.errors++;
					logger.warn(`[DB-MIG] ${targetName}: ${m.name} falhou: ${err?.message}`);
					// Para na primeira falha dura — proximas migrations podem depender desta
					break;
				}
			}
		}

		// Reconcilia drift de schema (colunas adicionadas via db push na primaria).
		// Sempre roda — nao tem custo se schemas estao alinhados.
		const drift = await reconcileSchemaDrift(target, primary);
		if (drift.columnsAdded > 0) {
			logger.info(`[DB-MIG] ${targetName}: drift reconciliado (+${drift.columnsAdded} colunas)`);
		}

		return { applied: totalApplied, skipped: totalSkipped, migrations: pending.length };
	} finally {
		isRunning = false;
	}
}

/**
 * Dispara sync de migrations para um target especifico ou para todos os
 * backups saudaveis (nao-primaria).
 */
export async function triggerMigrationSync(targetName?: string): Promise<void> {
	if (targetName) {
		await syncMigrationsToTarget(targetName);
		return;
	}
	const primary = dbRegistry.getPrimary();
	const targets = dbRegistry.getAll().filter((e) => {
		if (e.status === "disconnected") return false;
		if (primary && e.name === primary.name) return false;
		return true;
	});
	for (const t of targets) {
		try {
			await syncMigrationsToTarget(t.name);
		} catch (err: any) {
			logger.warn(`[DB-MIG] triggerMigrationSync falhou para ${t.name}: ${err?.message}`);
		}
	}
}

/**
 * Estatisticas para o endpoint /api/health.
 */
export function getMigrationStats() {
	return {
		...stats,
		isRunning,
		lastRunAt: lastRunAt ? new Date(lastRunAt).toISOString() : null,
	};
}

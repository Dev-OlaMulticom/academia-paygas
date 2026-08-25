import { index, pgEnum, pgTable, text, timestamp, boolean, real, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const roleEnum = pgEnum("Role", [
	"ADMIN",
	"GESTOR",
	"ATENDENTE",
	"PARCEIRO_ACREDITADO",
	"ERPS_REPRESENTANTE",
]);

export const user = pgTable(
	"User",
	{
		id: text("id").primaryKey(),
		email: text("email").notNull().unique(),
		nome: text("nome").notNull(),
		senha: text("senha").notNull(),
		role: roleEnum("role").notNull(),
		xp: real("xp").notNull().default(0),
		level: integer("level").notNull().default(1),
		avatarUrl: text("avatarUrl"),
		state: text("state"),
		emailVerificado: boolean("emailVerificado").notNull().default(false),
		tokenVerificacao: text("tokenVerificacao"),
		tokenExpiry: timestamp("tokenExpiry", { mode: "date" }),
		tokenRecuperacao: text("tokenRecuperacao"),
		tokenRecuperacaoExpiry: timestamp("tokenRecuperacaoExpiry", { mode: "date" }),
		gestorId: text("gestorId"),
		createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
		updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdate(() => new Date()),
		lastLogin: timestamp("lastLogin", { mode: "date" }),
		paygasSub: text("paygasSub").unique(),
		telefone: text("telefone"),
		cpf: text("cpf"),
		perfil: text("perfil"),
		marketplaceId: text("marketplaceId"),
		estabelecimentoId: text("estabelecimentoId"),
	},
	(table) => [index("User_gestorId_idx").on(table.gestorId), index("User_estabelecimentoId_idx").on(table.estabelecimentoId)],
);

export const estabelecimento = pgTable("Estabelecimento", {
	id: text("id").primaryKey(),
	nome: text("nome").notNull(),
	cnpj: text("cnpj"),
	tipo: text("tipo"),
	cidade: text("cidade"),
	uf: text("uf"),
	ativo: boolean("ativo").notNull().default(true),
	createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
	updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().$onUpdate(() => new Date()),
});

export const userRelations = relations(user, ({ one, many }) => ({
	gestor: one(user, { fields: [user.gestorId], references: [user.id] }),
	atendentes: many(user),
	estabelecimento: one(estabelecimento, { fields: [user.estabelecimentoId], references: [estabelecimento.id] }),
}));

export const estabelecimentoRelations = relations(estabelecimento, ({ many }) => ({
	users: many(user),
}));

import {
  pgTable,
  serial,
  date,
  varchar,
  decimal,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Nil Finance - Schema de base de datos
 * Tablas: transactions, budgets, debt_amortization
 */

export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 256 }).notNull(),
    date: date("date").notNull(),
    concept: text("concept").notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    category: varchar("category", { length: 128 }).notNull(),
    type: varchar("type", { length: 16 }).notNull(), // 'income' | 'expense'
    source: varchar("source", { length: 32 }).notNull(), // 'bank' | 'excel'
    transactionHash: varchar("transaction_hash", { length: 64 }).notNull(), // hash fecha+importe+concepto para duplicados
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("transactions_user_hash_idx").on(
      table.userId,
      table.transactionHash
    ),
  ]
);

export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 256 }).notNull(),
  category: varchar("category", { length: 128 }).notNull(),
  monthlyLimit: decimal("monthly_limit", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const debtAmortization = pgTable("debt_amortization", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", { length: 256 }).notNull(),
  date: date("date").notNull(),
  capitalPending: decimal("capital_pending", { precision: 12, scale: 2 }).notNull(),
  interest: decimal("interest", { precision: 12, scale: 2 }).notNull(),
  loanName: varchar("loan_name", { length: 256 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tipos inferidos para uso en la app
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
export type DebtAmortization = typeof debtAmortization.$inferSelect;
export type NewDebtAmortization = typeof debtAmortization.$inferInsert;

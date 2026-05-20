import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  __pk_sqlite?: Database.Database;
  __pk_db?: ReturnType<typeof drizzle<typeof schema>>;
};

function open() {
  const url = process.env.DATABASE_URL ?? "./pk.db";
  const sqlite = new Database(url);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return sqlite;
}

export const sqlite = globalForDb.__pk_sqlite ?? open();
export const db =
  globalForDb.__pk_db ?? drizzle(sqlite, { schema, casing: "snake_case" });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pk_sqlite = sqlite;
  globalForDb.__pk_db = db;
}

export { schema };

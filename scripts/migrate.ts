import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const dbPath = process.env.DATABASE_URL ?? "./pk.db";
const migrationsDir = path.resolve("./drizzle");

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const runSql = (sql: string) => db.prepare(sql).run();

const ddl = (sql: string) => {
  const stmts = sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim().replace(/;\s*$/, ""))
    .filter((s) => s.length > 0 && !s.startsWith("--"));
  for (const s of stmts) {
    db.prepare(s).run();
  }
};

runSql(`CREATE TABLE IF NOT EXISTS _migrations (
  id TEXT PRIMARY KEY,
  applied_at INTEGER NOT NULL
)`);

const applied = new Set(
  db
    .prepare("SELECT id FROM _migrations")
    .all()
    .map((r) => (r as { id: string }).id)
);

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

let n = 0;
for (const f of files) {
  if (applied.has(f)) continue;
  const sql = fs.readFileSync(path.join(migrationsDir, f), "utf-8");
  db.transaction(() => {
    ddl(sql);
    db.prepare(
      "INSERT INTO _migrations (id, applied_at) VALUES (?, ?)"
    ).run(f, Date.now());
  })();
  console.log(`Applied ${f}`);
  n++;
}

if (n === 0) console.log("No new migrations.");
db.close();

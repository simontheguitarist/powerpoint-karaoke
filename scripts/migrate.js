/**
 * Apply pending Drizzle migrations against SQLite.
 * Used in dev (`bun run db:migrate`) and at container startup.
 *
 * Plain CommonJS so it runs under Node without a transpiler step inside
 * the Docker runner image.
 */
const Database = require("better-sqlite3");
const fs = require("node:fs");
const path = require("node:path");

const dbPath = process.env.DATABASE_URL || "./pk.db";
const migrationsDir = path.resolve("./drizzle");

if (!fs.existsSync(migrationsDir)) {
  console.log(`[migrate] No migrations directory at ${migrationsDir}; skipping.`);
  process.exit(0);
}

const dbDir = path.dirname(path.resolve(dbPath));
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const runDdl = (sql) => {
  const stmts = sql
    .split("--> statement-breakpoint")
    .map((s) => s.trim().replace(/;\s*$/, ""))
    .filter((s) => s.length > 0 && !s.startsWith("--"));
  for (const s of stmts) {
    db.prepare(s).run();
  }
};

db.prepare(
  `CREATE TABLE IF NOT EXISTS _migrations (
    id TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL
  )`
).run();

const applied = new Set(
  db
    .prepare("SELECT id FROM _migrations")
    .all()
    .map((r) => r.id)
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
    runDdl(sql);
    db.prepare(
      "INSERT INTO _migrations (id, applied_at) VALUES (?, ?)"
    ).run(f, Date.now());
  })();
  console.log(`[migrate] Applied ${f}`);
  n++;
}

if (n === 0) console.log("[migrate] No new migrations.");
db.close();

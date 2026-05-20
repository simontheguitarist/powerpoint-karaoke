# PowerPoint Karaoke

A personal-use web app for **PowerPoint Karaoke** — the party game where a presenter improvises a talk over slides they've never seen, while everyone else rates them on a rubric.

- **Upload** PPTX, PDF, or images, or a `.zip` from the `pk-deck` Claude skill
- **Generate** absurd decks via the bundled Claude Code skill (runs on your machine, not the server)
- **Host** a multi-device room — projector on the big screen, judges on phones
- **Curate** the deck pre-round by vote-skipping boring slides
- **Score** with a multi-criteria rubric, dramatic leaderboard reveal

## Stack

Next.js 16 · React 19 · Tailwind v4 · Drizzle ORM · SQLite (better-sqlite3) · better-auth · Server-Sent Events · bun

## First-time setup

```bash
bun install
bun run db:migrate
cp .env.example .env.local      # edit values as needed
bun run dev                     # http://localhost:3000 (or PORT=3010 bun run dev)
```

System tools required for PPTX/PDF uploads (install via `brew install libreoffice poppler`):

- `soffice` (LibreOffice headless) — converts PPTX → PDF
- `pdftoppm` (Poppler) — rasterizes PDF → PNGs

Image-only uploads and skill-zip uploads work without these.

## Scripts

| Command | What |
|---|---|
| `bun run dev` | Next dev server (Turbopack) |
| `bun run build` | Production build |
| `bun run db:generate` | Generate Drizzle migrations from `src/lib/db/schema.ts` |
| `bun run db:migrate` | Apply pending migrations to `pk.db` |
| `bun run db:studio` | Drizzle Studio |

## The Claude skill

The `pk-deck` skill lives at `skills/pk-deck/`. The app serves a fresh zip of it at `GET /api/skill/pk-deck`. The Studio → Generate page guides users through either:

1. **One-shot prompt** — copy a self-contained prompt into any Claude Code session
2. **Persistent skill** — download + unzip into `~/.claude/skills/` for future use

Either path produces a folder of HTML slides + `meta.json`, zipped. Users drop the zip in Studio → Upload to add it to the library.

## App map

```
/                       — landing
/library                — browse all ready decks (filter by tag / spice / source)
/library/[deckId]       — deck detail with slide thumbs, "Host a game with this deck"
/studio                 — your decks (auth)
/studio/upload          — upload PPTX / PDF / images / skill zip (auth)
/studio/generate        — skill download + one-shot prompt (auth)
/play                   — join with code (anon) or host (auth)
/play/host/[roomId]     — host control panel (auth)
/play/r/[code]          — participant phone view (anon ok)
/play/projector/[id]    — fullscreen big-screen view
```

## Architecture notes

- **Realtime**: one Server-Sent Events stream per room (`GET /api/rooms/[id]/events`); SQLite is the source of truth, in-memory `Map<roomId, Set<Writer>>` is fan-out only. Browser auto-reconnects via the EventSource API.
- **Round state machine**: `queued → preview → presenting → rating → done`. All transitions go through `POST /api/rooms/[id]/state`.
- **Auth**: better-auth with the Drizzle SQLite adapter. Hosts and uploaders need accounts; players join anonymously with a `pk_party_<room>` cookie.
- **Storage**: deck files (PNG slides, HTML slides, source files, thumbnails) live under `./storage/decks/<deckId>/`. Served via `GET /api/decks/[id]/file/<path>` with path-traversal protection.

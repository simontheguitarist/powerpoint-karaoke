import Link from "next/link";
import { headers } from "next/headers";
import { getUserOrRedirect } from "@/lib/session";
import { CopyBlock } from "@/components/CopyBlock";

export const metadata = { title: "Generate with Claude · Studio" };

const ONE_SHOT_PROMPT = `Make me a PowerPoint Karaoke deck.

Topic: <REPLACE WITH TOPIC>
Slide count: 10
Spice: mild

Rules:
1. Create a folder in the current directory called pk-deck-<short-slug>.
2. Inside, write slide-01.html through slide-10.html. Each is a complete standalone HTML doc with inline <style>, sized 1280x720 (set html,body width/height/overflow). NO external assets — only inline SVG, CSS, unicode, emoji.
3. Every slide should look distinctly different from the others — vary fonts, gradients, layouts, scale.
4. The content should be intentionally absurd and non-coherent — it's a game where the presenter improvises over slides they've never seen. Mismatched titles, weird charts, fake quotes, contradictory bullets, big emoji visuals, dramatic gradients. PG-rated humor.
5. Required mix: a title slide (slide 1), at least one chart slide (inline SVG), at least one quote slide, at least one list slide, at least one mostly-visual slide, a closing slide.
6. After all slides, write meta.json in the same folder with {"title":"<short>","description":"<one sentence>","tags":["3-5","short","lowercase","words"]}.
7. Zip the folder into pk-deck-<slug>.zip (sibling, not nested) using:  zip -rq pk-deck-<slug>.zip pk-deck-<slug>
8. Print the absolute path of the zip and tell me to upload it.`;

const MINIFIED_SKILL = `---
name: pk-deck
description: Generate a PowerPoint Karaoke deck — a folder of intentionally absurd HTML slides on a topic, zipped and (optionally) auto-uploaded to the PK app. Trigger on "make a pk deck", "powerpoint karaoke deck", "generate karaoke slides", "pkdeck".
---

# pk-deck

Generate a folder of intentionally absurd HTML slides for the PowerPoint Karaoke party game, zip it, and (after asking) auto-upload it to the user's PK app.

## Inputs (ask if missing)

- **topic** (required)
- **slide count** (5–20, default 10)
- **spice**: mild (PG), medium (mild profanity ok), spicy (cursed late-night, profanity ok). Never slurs, sexual content, or real-person attacks at any level.

## Output

Create folder \`pk-deck-<slug>/\` in cwd. Inside:

1. Write exactly N HTML files: \`slide-01.html\` … \`slide-NN.html\`, zero-padded.
2. Each is a complete standalone HTML doc with inline \`<style>\`, sized 1280x720. No external assets — only inline SVG, CSS gradients, unicode, emoji, system fonts. Start each with:
   \`<!doctype html><html><head><meta charset="utf-8"><style>html,body{width:1280px;height:720px;margin:0;overflow:hidden;font-family:Georgia,serif}</style></head><body>\`
3. **Visual variety**: every slide distinctly different (background, typography, layout, palette).
4. **Content is absurd, not coherent.** Mismatched titles vs bullets, nonsense chart axes, fake quotes, contradictory lists, giant-emoji slides, unhinged takeaways.
5. Required mix: title (slide 1), one chart/diagram, one quote, one list, one mostly-visual, a closer.

## meta.json (after slides)

\`{"title":"<short, max 80>","description":"<one sentence, max 200>","tags":["3-5","short","lowercase"]}\`

## Zip

\`zip -rq pk-deck-<slug>.zip pk-deck-<slug>\`

## Upload (ask the user first)

Ask: *"Upload it to your PK app? (yes/no)"*. If no, print the zip path and stop.

If yes:

1. Read \`~/.claude/.pk-deck.json\`. If missing or incomplete, ask for app URL (default \`http://localhost:3000\`) and personal token (from \`<URL>/studio/tokens\`, starts with \`pkr_\`). Save back to that file, mode 0600.
2. \`curl --fail -sS -X POST "<URL>/api/decks/upload" -H "Authorization: Bearer <TOKEN>" -F "title=<topic>" -F "spice=<spice>" -F "files=@pk-deck-<slug>.zip"\`
3. On 200: parse \`id\`, print \`✓ Uploaded. Open it: <URL>/library/<id>\`.
4. On 401: delete the stale token from the config, offer to retry once with a fresh token.
5. On other errors: surface the response body.

Be quiet — no per-slide narration.`;

export default async function GeneratePage() {
  await getUserOrRedirect();

  // Build an absolute URL the user's Claude Code session can fetch.
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const baseUrl = `${proto}://${host}`;
  const skillUrl = `${baseUrl}/api/skill/pk-deck/md`;

  const installPrompt = `Install the pk-deck skill for me, then confirm it's ready.

Run:
mkdir -p ~/.claude/skills/pk-deck && curl -fsSL ${skillUrl} -o ~/.claude/skills/pk-deck/SKILL.md

After it's installed, list the file to confirm and tell me I can now trigger it by saying "make a pk deck about <topic>".`;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="pill border-flame text-flame bg-flame-soft">
        Generate with Claude
      </div>
      <h1 className="display text-6xl mt-3 leading-[0.95]">
        Have Claude write the deck
        <br />
        <span className="italic">on your machine.</span>
      </h1>
      <p className="text-mute mt-4 max-w-lg leading-relaxed">
        Generation runs in <em>your</em> Claude Code session — not on this
        server. Pick a method below, get a{" "}
        <span className="font-mono">.zip</span>. The skill can also upload it
        straight here when you say yes.
      </p>

      <div className="mt-6 card p-5 flex flex-wrap items-center justify-between gap-3 bg-canvas-2/40">
        <div className="text-sm">
          <div className="font-medium">Want auto-upload from Claude?</div>
          <div className="text-mute text-xs mt-0.5">
            Generate a personal token to paste once when the skill asks.
          </div>
        </div>
        <Link href="/studio/tokens" className="btn btn-primary text-xs">
          Manage tokens →
        </Link>
      </div>

      {/* METHOD 1 */}
      <section className="mt-12 card p-7">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h2 className="display text-3xl">
            Method 1 · One-shot prompt
          </h2>
          <span className="text-xs uppercase tracking-widest text-mute">
            Use once
          </span>
        </div>
        <p className="text-sm text-mute mt-2 max-w-prose leading-relaxed">
          Copy this prompt, paste into any Claude Code session, replace the
          topic, hit enter. You&apos;ll get a zip in the current working
          directory.
        </p>
        <div className="mt-5">
          <CopyBlock text={ONE_SHOT_PROMPT} />
        </div>
      </section>

      {/* METHOD 2 */}
      <section className="mt-8 card p-7">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h2 className="display text-3xl">
            Method 2 · Have Claude install the skill
          </h2>
          <span className="text-xs uppercase tracking-widest text-mute">
            Recommended
          </span>
        </div>
        <p className="text-sm text-mute mt-2 max-w-prose leading-relaxed">
          Paste this into a Claude Code session. Claude will fetch the skill
          from this app and drop it into{" "}
          <span className="font-mono">~/.claude/skills/pk-deck/</span>.
          After that, any future session auto-triggers on{" "}
          <em>&quot;make a pk deck about X&quot;</em>.
        </p>
        <div className="mt-5">
          <CopyBlock text={installPrompt} />
        </div>
        <div className="mt-5 text-xs text-mute">
          Skill source URL:{" "}
          <a
            href="/api/skill/pk-deck/md"
            target="_blank"
            rel="noreferrer"
            className="font-mono underline underline-offset-2 break-all"
          >
            {skillUrl}
          </a>
        </div>
      </section>

      {/* METHOD 3 */}
      <section className="mt-8 card p-7">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h2 className="display text-3xl">
            Method 3 · Manual install
          </h2>
          <span className="text-xs uppercase tracking-widest text-mute">
            No network needed
          </span>
        </div>
        <p className="text-sm text-mute mt-2 max-w-prose leading-relaxed">
          Save the minified skill below as{" "}
          <span className="font-mono">~/.claude/skills/pk-deck/SKILL.md</span>.
          That&apos;s it — Claude finds it on next start.
        </p>
        <div className="mt-5">
          <CopyBlock text={MINIFIED_SKILL} />
        </div>
        <details className="mt-5 text-sm">
          <summary className="cursor-pointer text-mute hover:text-ink">
            One-line shell version
          </summary>
          <div className="mt-3">
            <CopyBlock
              text={`mkdir -p ~/.claude/skills/pk-deck && cat > ~/.claude/skills/pk-deck/SKILL.md <<'EOF'
${MINIFIED_SKILL}
EOF`}
            />
          </div>
        </details>
      </section>

      {/* AFTER */}
      <section className="mt-8 card p-7 bg-canvas-2/40">
        <h2 className="display text-2xl">When the zip lands</h2>
        <p className="text-sm text-mute mt-2 max-w-prose leading-relaxed">
          Head to the upload page and drop the{" "}
          <span className="font-mono">
            pk-deck-<em>slug</em>.zip
          </span>{" "}
          file. The server extracts the slides and adds the deck to your
          library.
        </p>
        <Link
          href="/studio/upload"
          className="btn btn-primary mt-4 inline-flex"
        >
          Go to upload →
        </Link>
      </section>
    </div>
  );
}

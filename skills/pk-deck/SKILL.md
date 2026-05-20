---
name: pk-deck
description: Generate a PowerPoint Karaoke deck — a folder of intentionally absurd HTML slides on a topic, zipped and (optionally) auto-uploaded to a PowerPoint Karaoke app. Use when the user says "make a pk deck", "generate karaoke slides", "pkdeck", "powerpoint karaoke deck", or asks to produce slides for an improv presentation game.
---

# PowerPoint Karaoke deck

This skill creates a folder of standalone HTML slides + a `meta.json`, zips it, and (after asking) uploads it directly to the user's PowerPoint Karaoke app.

## Inputs

Ask the user (or accept from the trigger message) for:

- **topic** (required): what the deck is about
- **slide count** (default: 10, range: 5–20)
- **spice level** (default: mild): `mild` (PG, New Yorker cartoon energy), `medium` (office-roast-after-3-drinks, mild profanity ok), or `spicy` (cursed late-night energy, profanity ok). Never include slurs, sexual content, or real-person attacks at any spice level.

If the user gives you a topic only, pick sensible defaults and tell them what you chose.

## Output

Create a folder in the **current working directory** named `pk-deck-<slug>` where `<slug>` is a lowercase, hyphenated short name derived from the topic. Inside that folder:

1. Write exactly N HTML files named `slide-01.html`, `slide-02.html`, …, `slide-NN.html` (zero-padded to 2 digits).
2. Each file is a **complete standalone HTML document** with `<!doctype html>`, `<html>`, `<head>`, `<body>`. All styling is **inline** in a `<style>` block. **No external assets** — no `<img src="https://...">`, no Google Fonts, no fetched CSS. Use only:
   - Inline SVG
   - CSS gradients, shapes, transforms
   - Unicode characters and emoji
   - System fonts (Georgia, Helvetica, Times, Courier, sans-serif, serif, monospace)
3. Each slide must be designed for a **1280×720** stage. Start every file with:

   ```html
   <!doctype html>
   <html><head><meta charset="utf-8"><style>
   html,body{width:1280px;height:720px;margin:0;overflow:hidden;font-family:Georgia,serif}
   </style></head><body>
   ```

   Then your slide content, then `</body></html>`.
4. **Visual variety is the point.** Every slide should look distinctly different. Vary background, typography (mix serif/sans/mono, mix scales), layout, color palette.
5. **Content must be absurd, not coherent.** PowerPoint Karaoke is funny because the presenter has to improvise — slides that "make sense" defeat the game. Aim for:
   - Mismatched titles that don't relate to bullet points underneath
   - Charts with absurd axes ("Sincerity vs. Pigeon Awareness")
   - Quotes attributed to nobody, or to "the wind", or to fictional people
   - Bullet lists where the bullets contradict each other
   - A whole slide that's just one giant emoji or unicode glyph
   - "Key takeaway" slides whose takeaway is unhinged
6. Required mix across the deck:
   - **Slide 1**: title slide. Bold, confident, slightly weird title. Big type, minimal other content.
   - **At least one** chart/diagram slide (inline SVG bar chart, pie chart, flow diagram, etc.) with absurd labels.
   - **At least one** quote slide.
   - **At least one** list slide ("3 reasons…", "5 lessons…", etc.).
   - **At least one** mostly-visual slide (giant emoji, big SVG shape, no body text).
   - **Final slide**: closer — could be a thank-you, a non-sequitur, or a dramatic outro.

## Metadata file

After all slides are written, create `meta.json` in the same folder:

```json
{
  "title": "<short title for the deck, max 80 chars>",
  "description": "<one sentence on the vibe, max 200 chars>",
  "tags": ["tag1", "tag2", "tag3"]
}
```

Tags: 3–5 short lowercase words, no punctuation.

## Packaging

After writing all files, zip the folder into `pk-deck-<slug>.zip` (sibling of the folder):

```bash
zip -rq pk-deck-<slug>.zip pk-deck-<slug>
```

## Upload (ask the user first)

After the zip is created, ask the user:

> "Want me to upload it straight to your PK app? (yes / no)"

If **no**, skip to the "Reporting back" section.

If **yes**, do the following — quietly, no narration:

### 1. Load saved config (if any)

Read `~/.claude/.pk-deck.json`. It looks like:

```json
{
  "url": "http://localhost:3000",
  "token": "pkr_..."
}
```

If both fields are present, use them. Otherwise, ask the user:

1. **App URL** — default `http://localhost:3000`. Accept what they say or the default.
2. **Personal token** — explain: *"I need a personal token to upload on your behalf. Open <URL>/studio/tokens in your browser, click 'Generate token', and paste it here. It starts with `pkr_`."*

Save the config back to `~/.claude/.pk-deck.json` (create the file if missing — mode 0600). Even if the values were already there, refresh `lastUsedAt`-style timestamp by re-writing.

### 2. Upload

Run (replacing placeholders):

```bash
curl --fail -sS -X POST "<URL>/api/decks/upload" \
  -H "Authorization: Bearer <TOKEN>" \
  -F "title=<deck-meta-title-or-topic>" \
  -F "spice=<spice>" \
  -F "files=@pk-deck-<slug>.zip"
```

- If status 200, parse `{"id": "..."}` from the response.
- If 401, the token is bad — show the error, delete the bad token from the config file, and offer to retry by prompting for a fresh token. Don't loop more than once.
- For any other non-200, surface the body to the user.

### 3. Report

On success, print:

```
✓ Uploaded. Open it: <URL>/library/<id>
```

## Reporting back (no-upload path)

If the user said no to uploading, print:

```
Done. Your deck is ready:

  <absolute path to pk-deck-<slug>.zip>

Upload it at <URL>/studio/upload when you're ready.
```

## Process

Write the slide files one at a time. Then `meta.json`. Then zip. Then ask about uploading. Don't narrate each slide as you write it — be quiet and ship.

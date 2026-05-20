---
name: pk-deck
description: Generate a PowerPoint Karaoke deck — a folder of intentionally absurd HTML slides on a topic, ready to upload to a PowerPoint Karaoke game. Use when the user says "make a pk deck", "generate karaoke slides", "pkdeck", "powerpoint karaoke deck", or asks to produce slides for an improv presentation game.
---

# PowerPoint Karaoke deck

This skill creates a folder of standalone HTML slides + a `meta.json`, then zips it for upload to a PowerPoint Karaoke web app.

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
4. **Visual variety is the point.** Every slide should look distinctly different from the others. Vary:
   - Background (gradient, solid, patterned)
   - Typography (mix serif, sans, monospace; mix scales — huge headline on one, microscopic body on another)
   - Layout (centered, top-left, full-bleed, two-column, diagonal)
   - Color palette (don't reuse the same colors across slides)
5. **Content must be absurd, not coherent.** PowerPoint Karaoke is funny because the presenter has to improvise — slides that "make sense" defeat the game. Aim for:
   - Mismatched titles that don't relate to bullet points underneath
   - Charts with absurd axes ("Sincerity vs. Pigeon Awareness")
   - Quotes attributed to nobody, or to "the wind", or to fictional people
   - Bullet lists where the bullets contradict each other
   - "5 reasons why…" lists where the reasons are non-sequiturs
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

After all slides are written, create `meta.json` in the same folder with this exact shape:

```json
{
  "title": "<short title for the deck, max 80 chars>",
  "description": "<one sentence on the vibe, max 200 chars>",
  "tags": ["tag1", "tag2", "tag3"]
}
```

Tags: 3–5 short lowercase words, no punctuation.

## Packaging

After writing all files, zip the folder into `pk-deck-<slug>.zip` (sibling of the folder). Use the Bash tool:

```bash
zip -rq pk-deck-<slug>.zip pk-deck-<slug>
```

## Reporting back

After the zip is created, print exactly this (substituting the real path):

```
Done. Your deck is ready:

  <absolute path to pk-deck-<slug>.zip>

Next: open your PowerPoint Karaoke app, go to Studio → Upload, and drop the .zip in.
```

## Process

Write the files one at a time. After writing all slides, write `meta.json`. Then run the zip command. Then print the report. Do not narrate each slide as you write it — be quiet and ship.

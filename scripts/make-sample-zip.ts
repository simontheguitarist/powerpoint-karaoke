/**
 * Generates a small sample skill-output zip to test the upload pipeline.
 * Run: bunx tsx scripts/make-sample-zip.ts
 */
import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";

const out = path.resolve("/tmp/pk-deck-sample.zip");
const zip = new AdmZip();

const slide = (n: number, body: string, bg: string) =>
  `<!doctype html>
<html><head><meta charset="utf-8"><style>
html,body{width:1280px;height:720px;margin:0;overflow:hidden;font-family:Georgia,serif}
body{background:${bg};color:#0f0f12;display:grid;place-items:center}
.frame{padding:80px}
.no{font:14px monospace;opacity:.4;text-transform:uppercase;letter-spacing:.2em}
h1{font-size:120px;margin:.2em 0;line-height:1}
p{font-size:32px;max-width:900px;line-height:1.3}
</style></head>
<body><div class="frame">
  <div class="no">slide ${String(n).padStart(2,"0")}</div>
  ${body}
</div></body></html>`;

zip.addFile(
  "pk-deck-sample/slide-01.html",
  Buffer.from(
    slide(
      1,
      `<h1>The Secret Lives<br/>of Office Plants.</h1><p>A field investigation. Possibly.</p>`,
      "linear-gradient(135deg,#ffe7df,#faf7f2)"
    )
  )
);
zip.addFile(
  "pk-deck-sample/slide-02.html",
  Buffer.from(
    slide(
      2,
      `<h1 style="font-size:64px">Five Reasons The Ficus<br/>Hates You.</h1>
<ol style="font-size:32px;line-height:1.4"><li>You named it &quot;Felicia&quot;.</li><li>Inadequate Monday energy.</li><li>It saw what you did at the holiday party.</li><li>Your meetings are too long.</li><li>It is a snake.</li></ol>`,
      "#fff5d1"
    )
  )
);
zip.addFile(
  "pk-deck-sample/slide-03.html",
  Buffer.from(
    slide(
      3,
      `<svg width="600" height="400" style="display:block;margin:0 auto"><rect x="0" y="350" width="100" height="50" fill="#3fbb80"/><rect x="120" y="200" width="100" height="200" fill="#e8a025"/><rect x="240" y="50" width="100" height="350" fill="#ff4d2e"/><rect x="360" y="320" width="100" height="80" fill="#3a7bd5"/><rect x="480" y="100" width="100" height="300" fill="#1a1f2e"/></svg>
<p style="text-align:center;font-style:italic">Office plant happiness vs. day of week, 2023.</p>`,
      "#d1f1ff"
    )
  )
);
zip.addFile(
  "pk-deck-sample/slide-04.html",
  Buffer.from(
    slide(
      4,
      `<blockquote style="font-size:84px;font-style:italic;line-height:1.1;border-left:8px solid #ff4d2e;padding-left:32px">"I have never trusted a succulent."</blockquote>
<p style="text-align:right;margin-top:32px">— A man, at a bus stop, 2017</p>`,
      "#faf7f2"
    )
  )
);
zip.addFile(
  "pk-deck-sample/slide-05.html",
  Buffer.from(
    slide(
      5,
      `<div style="font-size:600px;text-align:center;line-height:1">🌵</div>`,
      "linear-gradient(180deg,#3fbb80,#0f0f12)"
    )
  )
);
zip.addFile(
  "pk-deck-sample/slide-06.html",
  Buffer.from(
    slide(
      6,
      `<h1 style="font-size:160px">Thank<br/>you.</h1><p>Refunds available at the door.</p>`,
      "#0f0f12"
    )
  ).toString("utf-8")
    .replace("#0f0f12;display", "#faf7f2;display")
    .replace("body{background:#0f0f12", "body{background:#0f0f12") as unknown as string
);
zip.addFile(
  "pk-deck-sample/meta.json",
  Buffer.from(
    JSON.stringify({
      title: "The Secret Lives of Office Plants",
      description:
        "A six-slide field investigation into corporate flora resentments.",
      tags: ["plants", "office", "corporate", "absurd"],
    })
  )
);

fs.writeFileSync(out, zip.toBuffer());
console.log("Wrote", out, "(" + fs.statSync(out).size + " bytes)");

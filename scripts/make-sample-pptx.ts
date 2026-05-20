/**
 * Generate a small sample PPTX to test the upload pipeline.
 * Run: bunx tsx scripts/make-sample-pptx.ts [outPath]
 */
import pptxgen from "pptxgenjs";

async function main() {
  const out = process.argv[2] ?? "/tmp/pk-test.pptx";
  const pres = new pptxgen();
  pres.layout = "LAYOUT_16x9";

  const s1 = pres.addSlide();
  s1.background = { color: "ffe7df" };
  s1.addText("PPTX UPLOAD TEST", {
    x: 0.6, y: 0.6, w: 8, h: 0.4,
    fontSize: 11, fontFace: "Courier", color: "555555",
    bold: false,
  });
  s1.addText("A deck from a real .pptx.", {
    x: 0.6, y: 1.2, w: 9, h: 2,
    fontSize: 54, fontFace: "Georgia", color: "0f0f12",
  });
  s1.addText("Three slides. Inline shapes. No external assets.", {
    x: 0.6, y: 3.6, w: 9, h: 0.6,
    fontSize: 20, color: "555555",
  });

  const s2 = pres.addSlide();
  s2.background = { color: "fff5d1" };
  s2.addText("Five Reasons This Slide Has Five Reasons", {
    x: 0.6, y: 0.6, w: 9, h: 1,
    fontSize: 28, bold: true, color: "0f0f12",
  });
  s2.addText(
    [
      { text: "1. The conversion pipeline rasterizes me to PNG.\n" },
      { text: "2. LibreOffice headless converts me to PDF first.\n" },
      { text: "3. Poppler's pdftoppm turns each page into a 1920w image.\n" },
      { text: "4. Sharp normalizes the output.\n" },
      { text: "5. Then I appear in your library." },
    ],
    {
      x: 0.6, y: 2,
      w: 9, h: 4,
      fontSize: 20, color: "0f0f12",
      paraSpaceAfter: 8,
    }
  );

  const s3 = pres.addSlide();
  s3.background = { color: "0f0f12" };
  s3.addText("Thank you.", {
    x: 0.6, y: 2.2, w: 9, h: 1.5,
    fontSize: 80, fontFace: "Georgia", color: "faf7f2", bold: true,
  });
  s3.addText("PowerPoint Karaoke · upload smoke test", {
    x: 0.6, y: 4, w: 9, h: 0.5,
    fontSize: 14, color: "ff4d2e", fontFace: "Courier",
  });

  await pres.writeFile({ fileName: out });
  console.log(`Wrote ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

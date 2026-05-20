import sharp from "sharp";

async function main() {
  const colors = ["#ffd1d1", "#d1f1ff", "#fff5d1"];
  for (let i = 0; i < 3; i++) {
    const svg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><text x="640" y="380" font-size="80" text-anchor="middle" fill="#222">Slide ${i + 1}</text></svg>`
    );
    await sharp({
      create: { width: 1280, height: 720, channels: 3, background: colors[i] },
    })
      .composite([{ input: svg, top: 0, left: 0 }])
      .png()
      .toFile(`/tmp/test-slide-${i}.png`);
  }
  console.log("done");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

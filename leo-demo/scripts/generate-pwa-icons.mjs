import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const publicDir = new URL("../public/", import.meta.url);
const mark = new URL("logo-mark.svg", publicDir);
const icons = new URL("icons/", publicDir);
await mkdir(icons, { recursive: true });

for (const size of [192, 512]) {
  await sharp(fileURLToPath(mark))
    .resize(size, size)
    .png()
    .toFile(fileURLToPath(new URL(`icon-${size}.png`, icons)));
}

// Extra space keeps all of the mark inside Android's circular mask safe area.
for (const [name, size, inset] of [
  ["maskable-512.png", 512, 92],
  ["apple-touch-icon.png", 180, 18],
]) {
  const logo = await sharp(fileURLToPath(mark))
    .resize(size - inset * 2, size - inset * 2)
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: "#6d28d9" } })
    .composite([{ input: logo, left: inset, top: inset }])
    .png()
    .toFile(fileURLToPath(new URL(name, icons)));
}

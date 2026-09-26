import sharp from 'sharp';
// Mechanical web derivatives; original brand artwork remains intact.
for (const [name, size] of [['logo', 1024], ['penguin', 768]]) {
  const result = await sharp(`public/assets/${name}.png`).resize(size, size).webp({ lossless: true }).toFile(`public/assets/${name}-web.webp`);
  console.log(`${name}: ${result.width} x ${result.height}, ${result.size} bytes`);
}

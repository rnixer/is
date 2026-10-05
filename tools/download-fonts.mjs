import { mkdir, writeFile } from 'node:fs/promises';
const target = 'apps/storefront/public/fonts';
await mkdir(target, { recursive: true });
for (const [folder, name] of [
  ['dmsans', 'dm-sans'],
  ['notosansthai', 'noto-sans-thai'],
]) {
  const base = `https://raw.githubusercontent.com/google/fonts/main/ofl/${folder}/`;
  const [metadata, license] = await Promise.all([
    fetch(base + 'METADATA.pb'),
    fetch(base + 'OFL.txt'),
  ]);
  if (!metadata.ok || !license.ok) throw new Error('Font metadata unavailable');
  const filename = (await metadata.text()).match(/filename: "([^"]+)"/)?.[1];
  if (!filename) throw new Error('No font filename');
  const font = await fetch(base + encodeURIComponent(filename));
  if (!font.ok) throw new Error(`Font download failed: ${name}`);
  await writeFile(`${target}/${name}.ttf`, Buffer.from(await font.arrayBuffer()));
  await writeFile(`${target}/${name}-OFL.txt`, await license.text());
  console.log(`Saved ${name} and its OFL license locally`);
}

import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync, readFileSync } from 'node:fs';
const key = () => randomBytes(32).toString('base64url');
const token = existsSync('apps/cms/.env')
  ? readFileSync('apps/cms/.env', 'utf8').match(/^STOREFRONT_TOKEN=(.+)$/m)?.[1] || key()
  : key();
for (const [file, replacements] of [
  [
    'apps/cms/.env',
    {
      APP_KEYS: [key(), key(), key(), key()].join(','),
      API_TOKEN_SALT: key(),
      ADMIN_JWT_SECRET: key(),
      TRANSFER_TOKEN_SALT: key(),
      JWT_SECRET: key(),
      ENCRYPTION_KEY: key(),
      STOREFRONT_TOKEN: token,
    },
  ],
  ['apps/storefront/.env', { STOREFRONT_TOKEN: token }],
]) {
  const example = readFileSync(`${file}.example`, 'utf8');
  let content = existsSync(file) ? readFileSync(file, 'utf8') : example;
  for (const line of example.split('\n')) {
    const name = line.match(/^([A-Z_]+)=/)?.[1];
    if (name && !new RegExp(`^${name}=`, 'm').test(content)) content += `\n${line}`;
  }
  for (const [name, value] of Object.entries(replacements)) {
    const current = content.match(new RegExp(`^${name}=(.*)$`, 'm'))?.[1];
    if (!current || (file === 'apps/storefront/.env' && name === 'STOREFRONT_TOKEN'))
      content = content.replace(new RegExp(`^${name}=.*$`, 'm'), `${name}=${value}`);
  }
  writeFileSync(file, content);
  console.log(`Created ${file}`);
}

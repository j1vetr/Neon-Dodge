import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '../public');

mkdirSync(publicDir, { recursive: true });

const version = { ts: Date.now() };
writeFileSync(resolve(publicDir, 'version.json'), JSON.stringify(version));

console.log(`[gen-version] ${version.ts}`);

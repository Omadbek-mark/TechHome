const { cpSync, rmSync } = require('node:fs');
const { resolve } = require('node:path');

for (const directory of ['views', 'public']) {
  const target = resolve(__dirname, '..', 'dist', directory);
  rmSync(target, { recursive: true, force: true });
  cpSync(resolve(__dirname, '..', 'src', directory), target, { recursive: true });
}

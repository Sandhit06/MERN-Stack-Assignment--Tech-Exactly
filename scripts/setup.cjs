const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const root = path.resolve(__dirname, '..');
if (fs.existsSync(path.join(root, '.env'))) {
  console.log('Existing .env preserved. See .env.example for configuration options.');
} else {
  let env = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  for (const placeholder of [
    'replace-with-at-least-32-random-characters',
    'replace-with-another-32-random-characters',
    'replace-with-a-strong-password',
    'replace-with-a-different-strong-password',
  ])
    env = env.replace(placeholder, randomBytes(24).toString('hex'));
  fs.writeFileSync(path.join(root, '.env'), env, { mode: 0o600 });
  console.log(
    'Created private .env with random secrets and seed passwords. Read ADMIN_PASSWORD and DEMO_PASSWORD there.',
  );
}

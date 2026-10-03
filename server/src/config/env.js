const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });
const { z } = require('zod');
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  FRONTEND_URL: z.url().default('http://localhost:5173'),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  COOKIE_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_CALLBACK_URL: z.string().default(''),
  FACEBOOK_CLIENT_ID: z.string().default(''),
  FACEBOOK_CLIENT_SECRET: z.string().default(''),
  FACEBOOK_CALLBACK_URL: z.string().default(''),
});
const result = schema.safeParse(process.env);
if (!result.success)
  throw new Error(
    `Invalid environment: ${result.error.issues.map((i) => i.path.join('.')).join(', ')}. Run npm run setup and configure .env.`,
  );
module.exports = result.data;

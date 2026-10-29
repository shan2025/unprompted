// Load .env.local (and the other .env files) the same way Next.js does, so the
// command-line scripts use the same database as `npm run dev`. Variables that
// are already set, such as Vercel's, always win. Import this first.

import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

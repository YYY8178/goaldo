import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const optionalVars = [
  'TEAM_DOMAIN',
  'POLICY_AUD',
  'ADMIN_POLICY_AUD',
  'ADMIN_EMAIL',
  'ADMIN_HOSTNAME',
] as const;

function cloudflareVars(env: Record<string, string | undefined>) {
  return Object.fromEntries(
    optionalVars.flatMap((name) => {
      const value = env[`CF_${name}`]?.trim();
      return value ? [[name, value]] : [];
    }),
  );
}

export default defineConfig(async ({ command, mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  if (command === 'serve') {
    return {
      plugins: [react()],
      server: {
        port: 5173,
        proxy: { '/api': 'http://localhost:8787' },
      },
    };
  }

  const { cloudflare } = await import('@cloudflare/vite-plugin');
  const databaseId = env.CF_D1_DATABASE_ID?.trim();
  const databaseName = env.CF_D1_DATABASE_NAME?.trim() || 'goaldo-db';
  const customDomain = env.CF_CUSTOM_DOMAIN?.trim();

  return {
    plugins: [
      react(),
      cloudflare({
        config: {
          name: env.CF_WORKER_NAME?.trim() || 'goaldo-open',
          main: './worker/index.ts',
          compatibility_flags: ['nodejs_compat'],
          vars: cloudflareVars(env),
          ...(databaseId ? {
            d1_databases: [{
              binding: 'DB',
              database_name: databaseName,
              database_id: databaseId,
            }],
          } : {}),
          ...(customDomain ? {
            routes: [{ pattern: customDomain, custom_domain: true }],
          } : {}),
        },
      }),
    ],
  };
});

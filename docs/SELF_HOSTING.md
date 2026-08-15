# Self-hosting GoalDo

This guide creates a fresh deployment. It must not be pointed at another GoalDo installation's database, domain or secrets.

## 1. Prerequisites

- Node.js 20 or later.
- A Cloudflare account with Workers and D1 access.
- Wrangler authenticated to your own Cloudflare account.

## 2. Local development

```bash
cp .env.example .env
npm install
npm run dev
```

The local Express server supplies a non-production demo admin account and an in-memory development API. It is not a production database.

## 3. Create a D1 database

```bash
npx wrangler d1 create goaldo-db
```

Copy the returned database id into an environment variable before building or deploying:

```bash
export CF_D1_DATABASE_NAME=goaldo-db
export CF_D1_DATABASE_ID=replace-with-your-d1-database-id
```

Apply each migration in order to that new database:

```bash
for file in migrations/*.sql; do
  npx wrangler d1 execute goaldo-db --remote --file="$file"
done
```

## 4. Configure public values

Set the following before deployment. These values identify your own installation; they are not secrets.

```bash
export CF_WORKER_NAME=goaldo-open
export CF_CUSTOM_DOMAIN=goaldo.example.com
export CF_ADMIN_EMAIL=admin@example.com
export CF_ADMIN_HOSTNAME=admin.example.com
export VITE_ADMIN_URL=https://admin.example.com
export VITE_ADMIN_HOSTNAME=admin.example.com
```

Cloudflare Access is optional for the user-facing password-login flow. If you want to protect a dedicated admin hostname with Access, additionally configure your own Access team domain and application audience values:

```bash
export CF_TEAM_DOMAIN=https://your-team.cloudflareaccess.com
export CF_POLICY_AUD=replace-with-your-user-policy-audience
export CF_ADMIN_POLICY_AUD=replace-with-your-admin-policy-audience
```

## 5. Configure secrets

Generate two separate random values of at least 32 characters. Do not reuse these examples and do not commit them.

```bash
npx wrangler secret put AUTH_SESSION_SECRET
npx wrangler secret put API_ENCRYPTION_KEY
```

Optional managed-model credentials must also be stored as Worker secrets:

```bash
npx wrangler secret put MANAGED_API_BASE_URL
npx wrangler secret put MANAGED_API_KEY
npx wrangler secret put MANAGED_API_MODEL
```

## 6. Build and deploy

```bash
npm run build
npm run deploy
```

Use your Cloudflare dashboard to verify the Worker route, D1 binding, HTTPS and Access policy before inviting users.

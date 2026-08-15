# Contributing to GoalDo

Thanks for improving GoalDo.

## Local development

```bash
cp .env.example .env
npm install
npm run dev
```

Before opening a pull request, run:

```bash
npm run build
```

## Scope

- Keep project templates consistent across the UI, local server and Worker.
- Do not add production domains, keys, user records or personal contact information to commits.
- Keep secrets in environment variables or Cloudflare Worker secrets, never in source files.
- Preserve the local fallback path so a contributor can use the core experience without a paid model API.

## Pull requests

Explain the user-facing change, note any data migration, and include how you tested it. For security-sensitive work, follow [SECURITY.md](SECURITY.md) instead of opening a public issue with exploit details.

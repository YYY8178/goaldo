# Security policy

## Supported version

Security fixes are made on the current `main` branch.

## Reporting a vulnerability

Do not publish credentials, exploit details, user data or production configuration in a public issue.

Use GitHub's private vulnerability-reporting feature when it is available for this repository. If it is not enabled, contact the repository owner through the GitHub profile with a minimal description, affected version and safe reproduction steps.

## Deployment requirements

- Configure `AUTH_SESSION_SECRET` and `API_ENCRYPTION_KEY` as separate Cloudflare Worker secrets, each at least 32 random characters.
- Keep `.env`, `.dev.vars`, exported databases and Wrangler credential files out of version control.
- Configure your own administrator email and hostname; never reuse sample values.
- Apply migrations only to a database you control, and back it up before schema changes.
- Keep dependencies updated and review security-related changes before deploying them.

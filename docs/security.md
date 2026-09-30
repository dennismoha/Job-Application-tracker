# Security

## Implemented controls

- Passwords use `scrypt` and are never serialized to the frontend.
- Sessions use random database-backed tokens and expiry/revocation state.
- Helmet security headers.
- Explicit CORS origin with credentials.
- Request-body size limit.
- Request IDs and structured logs.
- Per-process rate limiter.
- n8n webhook shared-secret verification using timing-safe comparison.
- New-source audit rejects private/local network targets and revalidates redirects.
- Source collectors do not implement CAPTCHA solving, fingerprint spoofing or proxy-based access-control bypass.

## Production requirements

- HTTPS is mandatory.
- Secrets belong in the deployment secret store, not source control.
- Use a strong database password and restrict network access to PostgreSQL.
- Put a shared edge rate limiter in front of multiple API replicas.
- Rotate the n8n ingestion secret if it is exposed.
- Keep n8n and Gmail credentials only inside n8n's credential store.
- Do not store third-party job-site passwords in this application's database unless a future feature explicitly requires and encrypts them.

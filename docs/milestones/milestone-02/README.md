# Milestone 2 — Users and Search Profiles

## Goal

Introduce authenticated users and reusable job-search profiles without making source collection user-specific.

## Implemented

- account registration and login;
- password hashing using Node's `scrypt` and a random per-password salt;
- database-backed session tokens;
- HTTP-only session cookie support plus bearer-token support for API clients;
- session expiry and logout/revocation;
- `GET /api/auth/me` current-user endpoint;
- authenticated search-profile CRUD;
- category assignment through the existing `JobCategory` hierarchy;
- per-profile keywords, exclusions, locations, salary, freshness, and expiry preferences;
- ownership checks so a user cannot read or mutate another user's profiles;
- request validation with Zod;
- structured HTTP errors;
- password unit test.

## Authentication flow

See `docs/flows/milestone-02-users-profiles.mmd`.

## API

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

GET    /api/profiles/categories
GET    /api/profiles
POST   /api/profiles
GET    /api/profiles/:profileId
PATCH  /api/profiles/:profileId
DELETE /api/profiles/:profileId
```

## Example teaching profile

```json
{
  "name": "UAE Teaching",
  "keywords": ["mathematics", "chemistry", "science", "homeroom"],
  "excludedKeywords": [],
  "countries": ["AE"],
  "locations": ["Dubai", "Abu Dhabi", "Sharjah", "Al Ain"],
  "remoteOnly": false,
  "defaultFreshnessDays": 14,
  "defaultExpiryDays": 30,
  "categoryIds": []
}
```

## Security decisions

Session tokens are random secrets. Only their SHA-256 hashes are stored in PostgreSQL, so a database read does not reveal active session credentials. Passwords use Node's memory-hard `scrypt` KDF with independent random salts.

No third-party job-site credentials are part of the authentication model.

## Checklist

- [ ] register creates a user and session;
- [ ] duplicate email returns conflict;
- [ ] invalid password cannot log in;
- [ ] logout revokes the current session;
- [ ] expired/revoked sessions are rejected;
- [ ] user can create multiple search profiles;
- [ ] profile categories can be assigned and replaced;
- [ ] profiles can be updated and deleted;
- [ ] another user's profile cannot be retrieved;
- [ ] `npm run typecheck` passes;
- [ ] `npm run lint` passes;
- [ ] `npm run format:check` passes;
- [ ] `npm test` passes;
- [ ] Mermaid flow renders in `npm run docs:dev`.

## Next milestone

Milestone 3 adds the source registry and source-audit engine so users can paste a careers/job-site URL and have the platform classify how it should be monitored.

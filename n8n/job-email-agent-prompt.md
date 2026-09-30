# Job alert extraction prompt

Read the email and return a JSON object with a `jobs` array. Each element may contain:

- title
- company
- location
- description
- salary
- postedAt
- expiresAt
- startDate
- employmentType
- sourceUrl
- applyUrl
- externalId

Rules:

1. Create one array item per distinct vacancy.
2. Preserve dates exactly when they are stated. Do not invent a posted date.
3. Preserve the original vacancy/apply URL.
4. Use no value for fields that are not present.
5. Do not treat newsletter headings, advertisements, or unrelated links as jobs.
6. Do not decide whether a job is recent; the backend calculates freshness from the supplied posting date.

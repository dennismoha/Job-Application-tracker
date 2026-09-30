# n8n job-alert workflow

The n8n workflow is deliberately an integration layer, not the source of job business logic.

## Recommended flow

```text
Gmail Trigger: label `jobs`
    ↓
AI / structured parser node
    ↓
HTTP Request → POST /api/email-ingestions/webhook
    ↓
Read `recommendedLabel`
    ↓
Gmail add label: Jobs/Recent, Jobs/Old, Jobs/Mixed or Jobs/Review
    ↓
HTTP Request → label-acknowledged endpoint (optional)
```

Send the backend header:

```text
x-ingestion-secret: {{$env.N8N_INGESTION_SECRET}}
```

The HTTP body shape is documented in `docs/api-v1.md`. Each extracted job should keep the original job URL when present. Missing facts should be omitted rather than guessed.

The backend decides canonicalization, freshness, deduplication and persistence. Do not create database rows directly from n8n.

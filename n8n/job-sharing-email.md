# Job sharing email webhook

JobIntel can share one or many selected jobs by email.

If `JOB_SHARE_WEBHOOK_URL` is configured, `POST /api/jobs/share` sends this webhook a JSON payload containing:

- `userId`
- `recipients`
- `subject`
- `text`
- `jobs[]` (`id`, `title`, `company`)

A simple n8n workflow can be:

```text
Webhook
  -> Send Email (Gmail / SMTP / provider)
  -> Respond 2xx
```

If no webhook is configured, the API returns a `mailto:` URL and the web UI opens the user's email client with the selected jobs pre-filled. This makes sharing usable without requiring an email provider during development.

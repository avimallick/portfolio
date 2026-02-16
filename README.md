# Dual Contribution Activity Service

Serverless activity aggregation API for a portfolio heatmap.

## Endpoint

`GET /api/activity?days=365`

Response:

```json
[
  { "date": "2026-01-01", "github": 3, "gitlab": 5 }
]
```

## Environment Variables

- `GITHUB_TOKEN`: GitHub personal access token with permission to read contributions.
- `GITHUB_USERNAME`: GitHub username to query.
- `GITLAB_TOKEN`: GitLab personal access token.
- `GITLAB_USER_ID`: GitLab user ID or username for `/users/:id/events`.
- `GITLAB_API_BASE`: Optional, defaults to `https://gitlab.com/api/v4`.

## Behavior

- Default `days=365`.
- Limits `days` to `[1, 3650]`.
- Resilient partial failures: if one provider fails, the other still returns.
- Cache headers:
  - `s-maxage=43200`
  - `stale-while-revalidate=43200`

## Vercel Deployment

This repo is configured for Vercel edge functions via `api/activity.ts`.

1. Fill local secrets in `.env`.
2. Link the project once:

```bash
npx vercel link
```

3. Deploy using prebuilt artifacts:

```bash
npm run deploy
```

Notes:
- `.env` is gitignored and safe for local storage.
- Vercel production runtime still needs the same vars set in the Vercel project (`Settings -> Environment Variables`) so edge runtime has them.

## Local Development

```bash
npm run dev
```

Then call: `http://localhost:3000/api/activity?days=30`

## Local type-check

```bash
npm install
npm run check
```

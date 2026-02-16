# Avinash Mallick Portfolio

Interactive portfolio + blog with a live dual-contribution matrix (GitHub + GitLab).

## What This Includes

- Personal portfolio sections (about, projects, experience, skills, contact)
- Blogging component with:
  - search
  - tag filters
  - post reading dialog
- Live `/api/activity` heatmap from GitHub + GitLab
- CV download support from `/assets/Avinash_Mallick_CV.pdf`
- Content-first editing through `/content/site.json`

## Edit Your Content

Update these values in:

- `/Users/avinashmallick/Projects/portfolio/content/site.json`

This controls profile info, highlights, skills, projects, experience, socials, and blog posts.

## Endpoint

`GET /api/activity?days=365`

Response:

```json
[
  { "date": "2026-01-01", "github": 3, "gitlab": 5 }
]
```

## Environment Variables

- `GITHUB_TOKEN`
- `GITHUB_USERNAME`
- `GITLAB_TOKEN`
- `GITLAB_USER_ID`
- `GITLAB_API_BASE` (optional, defaults to `https://gitlab.com/api/v4`)

## Local Development

```bash
npm run dev
```

Then open:

- `http://localhost:3000`

## Vercel Deployment

1. Fill local secrets in `.env`.
2. Link once:

```bash
npx vercel link
```

3. Deploy:

```bash
npm run deploy
```

Set the same env vars in Vercel project settings for production runtime.

## Other Scripts

```bash
npm run check
npm run build
npm run vercel:dev
```

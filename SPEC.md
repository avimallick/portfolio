# SPEC.md --- Dual Contribution Graph Portfolio (Option B: Serverless Proxy)

## Summary

Build a portfolio + blog site with a signature "dual contribution
heatmap" that merges daily activity from: - GitHub (green) - GitLab.com
(blue)

The site will deploy on Cloudflare Pages or Vercel using a
serverless/edge API that securely aggregates data.

------------------------------------------------------------------------

## Goals

-   Create a memorable portfolio differentiator.
-   Demonstrate full-stack, API integration, and systems thinking.
-   Maintain a minimal infrastructure footprint.

------------------------------------------------------------------------

## Architecture

Frontend: - Static-first portfolio with heatmap UI. - Blog and project
pages.

Backend: - Serverless function `/api/activity` - Fetches and normalizes
GitHub + GitLab activity. - Returns cached JSON.

Infrastructure: - Cloudflare Pages or Vercel. - Environment secrets for
tokens.

------------------------------------------------------------------------

## API Contract

Endpoint: GET /api/activity

Query: - days (default 365)

Response: \[ { "date": "YYYY-MM-DD", "github": 3, "gitlab": 5 }\]

------------------------------------------------------------------------

## GitHub Integration

Use GraphQL contributions calendar.

Include: - Commits - PRs - Reviews - Issues

------------------------------------------------------------------------

## GitLab Integration

Use GitLab Events API. Aggregate: - Push - Merge Requests - Issues

------------------------------------------------------------------------

## Security

-   Tokens stored server-side.
-   No secrets in frontend.

------------------------------------------------------------------------

## Caching

-   12-hour TTL.
-   Stale-while-revalidate.

------------------------------------------------------------------------

## UI

Dual-color heatmap: - Green for GitHub. - Blue for GitLab. - Diagonal
split tiles.

Tooltip: - Date - GitHub count - GitLab count - Total.

------------------------------------------------------------------------

## Future Enhancements

-   Mode switching.
-   Streak tracking.
-   Weekly analytics.
-   Open-source dashboard.

------------------------------------------------------------------------

## Acceptance Criteria

-   Fully deployed serverless portfolio.
-   No token leakage.
-   Fast cached responses.
-   Resilient partial failures.

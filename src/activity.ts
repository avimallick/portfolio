const DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_GITLAB_PAGES = 10;

type ActivityDay = {
  date: string;
  github: number;
  gitlab: number;
};

type SourceCounts = Map<string, number>;

type RuntimeEnv = {
  GITHUB_TOKEN?: string;
  GITHUB_USERNAME?: string;
  GITLAB_TOKEN?: string;
  GITLAB_USER_ID?: string;
  GITLAB_API_BASE?: string;
};

type CachedPayload = {
  expiresAt: number;
  data: ActivityDay[];
};

const memoryCache = new Map<string, CachedPayload>();

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function buildDateRange(days: number, now = new Date()): string[] {
  const today = startOfUtcDay(now);
  const dates: string[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today.getTime() - i * DAY_MS);
    dates.push(toDateString(d));
  }

  return dates;
}

function normalizeDays(daysParam: string | null): number {
  if (!daysParam) {
    return 365;
  }

  const parsed = Number.parseInt(daysParam, 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    return 365;
  }

  return Math.min(3650, Math.max(1, parsed));
}

async function fetchGitHubCounts(
  env: RuntimeEnv,
  fromDate: string,
  toDate: string,
): Promise<SourceCounts> {
  const token = env.GITHUB_TOKEN;
  const username = env.GITHUB_USERNAME;
  if (!token || !username) {
    return new Map();
  }

  const query = `
    query($username: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  `;

  const variables = {
    username,
    from: `${fromDate}T00:00:00Z`,
    to: `${toDate}T23:59:59Z`,
  };

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GitHub request failed: ${response.status}`);
  }

  const json = (await response.json()) as {
    errors?: Array<{ message?: string }>;
    data?: {
      user?: {
        contributionsCollection?: {
          contributionCalendar?: {
            weeks?: Array<{
              contributionDays?: Array<{ date: string; contributionCount: number }>;
            }>;
          };
        };
      };
    };
  };

  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors[0]?.message ?? "Unknown GitHub GraphQL error");
  }

  const counts = new Map<string, number>();
  const weeks = json.data?.user?.contributionsCollection?.contributionCalendar?.weeks ?? [];
  for (const week of weeks) {
    for (const day of week.contributionDays ?? []) {
      counts.set(day.date, day.contributionCount);
    }
  }

  return counts;
}

function gitlabEventWeight(event: { action_name?: string; push_data?: { commit_count?: number } }): number {
  if (event.action_name === "pushed to") {
    return Math.max(1, event.push_data?.commit_count ?? 1);
  }
  return 1;
}

async function fetchGitLabCounts(
  env: RuntimeEnv,
  fromDate: string,
  toDate: string,
): Promise<SourceCounts> {
  const token = env.GITLAB_TOKEN;
  const userId = env.GITLAB_USER_ID;
  if (!token || !userId) {
    return new Map();
  }

  const base = env.GITLAB_API_BASE ?? "https://gitlab.com/api/v4";
  const allowedTargets = new Set(["pushed", "opened", "created"]);
  const allowedTypes = new Set(["PushEvent", "MergeRequestEvent", "IssueEvent"]);
  const counts = new Map<string, number>();

  let page = 1;
  for (;;) {
    if (page > MAX_GITLAB_PAGES) {
      break;
    }

    const url = new URL(`${base}/users/${encodeURIComponent(userId)}/events`);
    url.searchParams.set("after", fromDate);
    url.searchParams.set("before", toDate);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));

    const response = await fetch(url, {
      headers: {
        "PRIVATE-TOKEN": token,
      },
    });

    if (!response.ok) {
      throw new Error(`GitLab request failed: ${response.status}`);
    }

    const events = (await response.json()) as Array<{
      created_at?: string;
      action_name?: string;
      target_type?: string;
      push_data?: { commit_count?: number };
    }>;

    for (const event of events) {
      if (!event.created_at || !event.target_type || !event.action_name) {
        continue;
      }

      const actionPrefix = event.action_name.split(" ")[0];
      if (!allowedTargets.has(actionPrefix)) {
        continue;
      }

      if (!allowedTypes.has(event.target_type)) {
        continue;
      }

      const day = event.created_at.slice(0, 10);
      counts.set(day, (counts.get(day) ?? 0) + gitlabEventWeight(event));
    }

    const nextPage = response.headers.get("x-next-page");
    if (!nextPage) {
      break;
    }

    page = Number.parseInt(nextPage, 10);
    if (!Number.isFinite(page) || page <= 0) {
      break;
    }
  }

  return counts;
}

function mergeCounts(dates: string[], githubCounts: SourceCounts, gitlabCounts: SourceCounts): ActivityDay[] {
  return dates.map((date) => ({
    date,
    github: githubCounts.get(date) ?? 0,
    gitlab: gitlabCounts.get(date) ?? 0,
  }));
}

function getCached(key: string): ActivityDay[] | null {
  const cached = memoryCache.get(key);
  if (!cached) {
    return null;
  }

  if (Date.now() >= cached.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return cached.data;
}

function setCache(key: string, data: ActivityDay[]): void {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function createJsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=43200, stale-while-revalidate=43200",
      "CDN-Cache-Control": "public, max-age=43200, stale-while-revalidate=43200",
      ...extraHeaders,
    },
  });
}

export async function handleActivityRequest(request: Request, env: RuntimeEnv): Promise<Response> {
  if (request.method !== "GET") {
    return createJsonResponse({ error: "Method not allowed" }, 405);
  }

  const url = new URL(request.url);
  const days = normalizeDays(url.searchParams.get("days"));
  const cacheKey = `days:${days}`;

  const cached = getCached(cacheKey);
  if (cached) {
    return createJsonResponse(cached);
  }

  const dates = buildDateRange(days);
  const fromDate = dates[0];
  const toDate = dates[dates.length - 1];

  const [githubResult, gitlabResult] = await Promise.allSettled([
    fetchGitHubCounts(env, fromDate, toDate),
    fetchGitLabCounts(env, fromDate, toDate),
  ]);

  if (githubResult.status === "rejected") {
    console.error("GitHub activity fetch failed:", githubResult.reason);
  }
  if (gitlabResult.status === "rejected") {
    console.error("GitLab activity fetch failed:", gitlabResult.reason);
  }

  const githubCounts = githubResult.status === "fulfilled" ? githubResult.value : new Map<string, number>();
  const gitlabCounts = gitlabResult.status === "fulfilled" ? gitlabResult.value : new Map<string, number>();

  const merged = mergeCounts(dates, githubCounts, gitlabCounts);
  setCache(cacheKey, merged);

  const githubStatus = env.GITHUB_TOKEN && env.GITHUB_USERNAME
    ? (githubResult.status === "fulfilled" ? "ok" : "error")
    : "not_configured";
  const gitlabStatus = env.GITLAB_TOKEN && env.GITLAB_USER_ID
    ? (gitlabResult.status === "fulfilled" ? "ok" : "error")
    : "not_configured";

  return createJsonResponse(merged, 200, {
    "X-Activity-GitHub-Status": githubStatus,
    "X-Activity-GitLab-Status": gitlabStatus,
  });
}

export type { ActivityDay, RuntimeEnv };

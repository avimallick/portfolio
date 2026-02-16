import "dotenv/config";
import { createServer } from "node:http";

import { handleActivityRequest } from "../src/activity";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

function requestHeaders(nodeHeaders: Record<string, string | string[] | undefined>): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(nodeHeaders)) {
    if (typeof value === "string") {
      headers.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
    }
  }
  return headers;
}

const server = createServer(async (req, res) => {
  try {
    const origin = `http://${req.headers.host ?? `localhost:${port}`}`;
    const request = new Request(new URL(req.url ?? "/", origin), {
      method: req.method ?? "GET",
      headers: requestHeaders(req.headers),
    });

    const response = await handleActivityRequest(request, {
      GITHUB_TOKEN: process.env.GITHUB_TOKEN,
      GITHUB_USERNAME: process.env.GITHUB_USERNAME,
      GITLAB_TOKEN: process.env.GITLAB_TOKEN,
      GITLAB_USER_ID: process.env.GITLAB_USER_ID,
      GITLAB_API_BASE: process.env.GITLAB_API_BASE,
    });

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    const bytes = Buffer.from(await response.arrayBuffer());
    res.end(bytes);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: message }));
  }
});

server.listen(port, () => {
  process.stdout.write(`Local dev server running at http://localhost:${port}\n`);
});

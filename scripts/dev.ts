import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { handleActivityRequest } from "../src/activity.ts";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function getStaticPath(urlPath: string): string | null {
  const target = urlPath === "/" ? "/index.html" : urlPath;
  const resolved = path.resolve(rootDir, `.${target}`);
  if (!resolved.startsWith(rootDir)) {
    return null;
  }

  const ext = path.extname(resolved).toLowerCase();
  const allowed = new Set([".html", ".css", ".js", ".json", ".pdf", ".png", ".jpg", ".jpeg", ".svg"]);
  if (!allowed.has(ext)) {
    return null;
  }

  return resolved;
}

function contentType(filePath: string): string {
  if (filePath.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  if (filePath.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }
  if (filePath.endsWith(".js")) {
    return "application/javascript; charset=utf-8";
  }
  if (filePath.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }
  if (filePath.endsWith(".pdf")) {
    return "application/pdf";
  }
  if (filePath.endsWith(".svg")) {
    return "image/svg+xml";
  }
  if (filePath.endsWith(".png")) {
    return "image/png";
  }
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  return "application/octet-stream";
}

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
    const url = new URL(req.url ?? "/", origin);

    if (url.pathname === "/api/activity") {
      const request = new Request(url, {
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
      return;
    }

    if ((req.method ?? "GET") !== "GET") {
      res.statusCode = 405;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    const staticPath = getStaticPath(url.pathname);
    if (!staticPath) {
      res.statusCode = 404;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    const bytes = await readFile(staticPath);
    res.statusCode = 200;
    res.setHeader("Content-Type", contentType(staticPath));
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

import { handleActivityRequest } from "../src/activity";

export const config = {
  runtime: "edge",
};

export default async function handler(request: Request): Promise<Response> {
  return handleActivityRequest(request, {
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    GITHUB_USERNAME: process.env.GITHUB_USERNAME,
    GITLAB_TOKEN: process.env.GITLAB_TOKEN,
    GITLAB_USER_ID: process.env.GITLAB_USER_ID,
    GITLAB_API_BASE: process.env.GITLAB_API_BASE,
  });
}

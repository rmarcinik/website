import { GithubCacheDO } from "./github_cache_do.js";
import { ProjectsDO } from "./projects_do.js";

export { GithubCacheDO, ProjectsDO };

function projects(env) {
  return env.PROJECTS.get(env.PROJECTS.idFromName("global"));
}

function githubCache(env) {
  return env.GITHUB_CACHE.get(env.GITHUB_CACHE.idFromName("global"));
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const method = request.method;

    if (pathname === "/api/projects" && method === "GET") {
      return Response.json(await projects(env).categories());
    }

    const projectMatch = pathname.match(/^\/api\/projects\/([^/]+)$/);
    if (projectMatch && method === "GET") {
      const project = await projects(env).find(decodeURIComponent(projectMatch[1]));
      if (!project) return new Response("Not Found", { status: 404 });
      return Response.json(project);
    }

    if (pathname === "/api/projects/upload" && method === "POST") {
      if (request.headers.get("Authorization") !== `Bearer ${env.SEED_SECRET}`) {
        return new Response("Forbidden", { status: 403 });
      }
      await projects(env).upload(await request.json());
      return new Response(null, { status: 201 });
    }

    const githubMatch = pathname.match(/^\/api\/github\/([^/]+)\/([^/]+)$/);
    if (githubMatch && method === "GET") {
      const data = await githubCache(env).get(`${githubMatch[1]}/${githubMatch[2]}`);
      return Response.json(data);
    }

    if (method === "GET" && /^\/projects\/.+/.test(pathname)) {
      return env.ASSETS.fetch(new Request(new URL("/projects/", request.url), request));
    }

    return env.ASSETS.fetch(request);
  },
};

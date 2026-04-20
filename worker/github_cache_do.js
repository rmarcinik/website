import { DurableObject } from "cloudflare:workers";

const DEFAULT_TTL_SECONDS = 3600;

export class GithubCacheDO extends DurableObject {
  constructor(state, env) {
    super(state, env);
    this.env = env;
    this.ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS cache (
          repo       TEXT PRIMARY KEY,
          data       TEXT NOT NULL,
          fetched_at TEXT NOT NULL
        )
      `);
    });
  }

  async get(repo) {
    const ttl = Number(this.env.GITHUB_CACHE_TTL_SECONDS ?? DEFAULT_TTL_SECONDS);
    const cutoff = new Date(Date.now() - ttl * 1000).toISOString();
    const rows = [...this.ctx.storage.sql.exec(
      "SELECT data FROM cache WHERE repo = ? AND fetched_at > ?", repo, cutoff
    )];
    if (rows.length) return JSON.parse(rows[0].data);
    return this.#refresh(repo);
  }

  async #refresh(repo) {
    const data = await fetchRepoStats(repo, this.env.GITHUB_TOKEN);
    this.ctx.storage.sql.exec(
      "INSERT OR REPLACE INTO cache (repo, data, fetched_at) VALUES (?, ?, ?)",
      repo, JSON.stringify(data), new Date().toISOString()
    );
    return data;
  }
}

async function fetchRepoStats(repo, token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "rmarcinik-website",
  };
  const base = "https://api.github.com";

  const [repoRes, langsRes, activityRes, readmeRes] = await Promise.all([
    fetch(`${base}/repos/${repo}`, { headers }),
    fetch(`${base}/repos/${repo}/languages`, { headers }),
    fetch(`${base}/repos/${repo}/stats/commit_activity`, { headers }),
    fetch(`${base}/repos/${repo}/readme`, { headers }),
  ]);

  const [repoData, langs, activity, readmeData] = await Promise.all([
    repoRes.json(),
    langsRes.json(),
    activityRes.ok ? activityRes.json().catch(() => []) : Promise.resolve([]),
    readmeRes.ok ? readmeRes.json() : Promise.resolve({}),
  ]);

  return {
    stars: repoData.stargazers_count,
    forks: repoData.forks_count,
    issues: repoData.open_issues_count,
    pushed_at: repoData.pushed_at,
    languages: langPercentages(langs),
    commit_grid: commitGrid(activity),
    readme: decodeReadme(readmeData.content),
  };
}

function langPercentages(langs) {
  const total = Object.values(langs).reduce((a, b) => a + b, 0);
  if (total === 0) return [];
  return Object.entries(langs)
    .map(([name, bytes]) => ({ name, pct: Math.round(bytes / total * 1000) / 10 }))
    .sort((a, b) => b.pct - a.pct);
}

function commitGrid(activity) {
  if (!Array.isArray(activity) || activity.length === 0) {
    return Array.from({ length: 52 }, () => [0, 0, 0, 0, 0, 0, 0]);
  }
  return activity.map(week => week.days);
}

function decodeReadme(content) {
  if (!content) return "";
  return atob(content.replace(/\n/g, ""));
}

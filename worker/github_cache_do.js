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
    const { data, cacheable } = await fetchRepoStats(repo, this.env.GITHUB_TOKEN);
    if (cacheable) {
      this.ctx.storage.sql.exec(
        "INSERT OR REPLACE INTO cache (repo, data, fetched_at) VALUES (?, ?, ?)",
        repo, JSON.stringify(data), new Date().toISOString()
      );
    }
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

  const since = new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString();

  const [repoRes, langsRes, commitsRes, readmeRes] = await Promise.all([
    fetch(`${base}/repos/${repo}`, { headers }),
    fetch(`${base}/repos/${repo}/languages`, { headers }),
    fetch(`${base}/repos/${repo}/commits?per_page=100&since=${since}`, { headers }),
    fetch(`${base}/repos/${repo}/readme`, { headers }),
  ]);

  const [repoData, langs, commits, readmeData] = await Promise.all([
    repoRes.json(),
    langsRes.json(),
    commitsRes.ok ? commitsRes.json().catch(() => []) : Promise.resolve([]),
    readmeRes.ok ? readmeRes.json() : Promise.resolve({}),
  ]);

  return {
    data: {
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      issues: repoData.open_issues_count,
      pushed_at: repoData.pushed_at,
      languages: langPercentages(langs),
      commit_grid: commitsToGrid(commits),
      readme: decodeReadme(readmeData.content),
    },
    cacheable: repoRes.ok,
  };
}

function langPercentages(langs) {
  const total = Object.values(langs).reduce((a, b) => a + b, 0);
  if (total === 0) return [];
  return Object.entries(langs)
    .map(([name, bytes]) => ({ name, pct: Math.round(bytes / total * 1000) / 10 }))
    .sort((a, b) => b.pct - a.pct);
}

function commitsToGrid(commits) {
  const epoch = Date.now() - 52 * 7 * 24 * 3600 * 1000;
  const counts = {};

  for (const commit of commits) {
    const date = commit?.commit?.author?.date;
    if (!date) continue;
    const ms = new Date(date).getTime();
    const week = Math.floor((ms - epoch) / (7 * 24 * 3600 * 1000));
    const day = new Date(date).getDay();
    if (week < 0 || week > 51) continue;
    const key = `${week},${day}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }

  const max = Math.max(1, ...Object.values(counts));

  return Array.from({ length: 52 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const n = counts[`${week},${day}`] ?? 0;
      if (n === 0) return 0;
      if (n <= max * 0.25) return 1;
      if (n <= max * 0.5) return 2;
      if (n <= max * 0.75) return 3;
      return 4;
    })
  );
}

function decodeReadme(content) {
  if (!content) return "";
  return atob(content.replace(/\n/g, ""));
}

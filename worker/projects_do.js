import { DurableObject } from "cloudflare:workers";

export class ProjectsDO extends DurableObject {
  constructor(state, env) {
    super(state, env);
    this.ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS projects (
          name              TEXT PRIMARY KEY,
          category          TEXT NOT NULL,
          category_position INTEGER NOT NULL,
          position          INTEGER NOT NULL,
          type              TEXT NOT NULL,
          data              TEXT NOT NULL
        )
      `);
    });
  }

  categories() {
    const rows = [...this.ctx.storage.sql.exec(
      "SELECT name, category, type, data FROM projects ORDER BY category_position, position"
    )];
    const map = new Map();
    for (const row of rows) {
      if (!map.has(row.category)) map.set(row.category, []);
      map.get(row.category).push({ name: row.name, type: row.type, ...JSON.parse(row.data) });
    }
    return [...map.entries()].map(([name, projects]) => ({ name, projects }));
  }

  find(name) {
    const rows = [...this.ctx.storage.sql.exec(
      "SELECT name, type, data FROM projects WHERE name = ?", name
    )];
    if (!rows.length) return null;
    const { data, ...rest } = rows[0];
    return { ...rest, ...JSON.parse(data) };
  }

  upload(categories) {
    this.ctx.storage.sql.exec("DELETE FROM projects");
    for (const [catIdx, category] of categories.entries()) {
      for (const [projIdx, project] of category.projects.entries()) {
        const { name, type, ...data } = project;
        this.ctx.storage.sql.exec(
          "INSERT INTO projects (name, category, category_position, position, type, data) VALUES (?, ?, ?, ?, ?, ?)",
          name, category.name, catIdx, projIdx, type, JSON.stringify(data)
        );
      }
    }
  }
}

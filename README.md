# Website

Personal website for Rigel Marcinik, built with Phoenix 1.8.

## Dev

```bash
mix setup          # install deps
mix phx.server     # localhost:4000
```

Edit CSS and JS directly — no build step required:

- `assets/css/app.css`
- `assets/js/app.js`

Add or edit projects in `lib/website/projects.ex`.

## Deploy

```bash
mix precommit
git add -p && git commit -m "..."
mix deploy
```

| Command | Does |
|---|---|
| `mix deploy` | rebuild image and restart |
| `mix docker.logs` | tail app logs |
| `mix docker.down` | stop services |
| `mix docker.up` | start without rebuilding |

## One-time setup

**Cloudflare Tunnel** — [Zero Trust dashboard](https://one.dash.cloudflare.com) → Networks → Tunnels → Create → name `website` → Public Hostnames: `yourdomain.com → http://app:4000` → copy the tunnel token. Set SSL/TLS to **Full**.

**`.env`**

```
SECRET_KEY_BASE=<output of: mix phx.gen.secret>
PHX_HOST=yourdomain.com
PHX_SERVER=true
PORT=4000
MIX_ENV=prod
CLOUDFLARE_TUNNEL_TOKEN=<tunnel token>
```

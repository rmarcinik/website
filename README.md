# Website

Personal website for Rigel Marcinik, built with [Phoenix](https://www.phoenixframework.org/) 1.8.

## Getting started

```bash
mix setup          # install deps and build assets
mix phx.server     # start dev server at localhost:4000
```

## Code flow

### Request entry

Every HTTP request enters through `WebsiteWeb.Endpoint` (`lib/website_web/endpoint.ex`), which runs a plug pipeline: static file serving → session management → router.

### Routing

`lib/website_web/router.ex` defines a single browser pipeline that adds session, flash, CSRF protection, and the root layout. Routes map to controllers:

```
GET /  →  PageController.home
```

### Controller → template

`lib/website_web/controllers/page_controller.ex` calls `render(conn, :home)`, which invokes the `home` function compiled from `lib/website_web/controllers/page_html/home.html.heex` by `page_html.ex`.

To add a new page:
1. Add a route in `router.ex`
2. Add an action to `page_controller.ex` (or create a new controller)
3. Add a template at `lib/website_web/controllers/page_html/<name>.html.heex`

### Layout nesting

Templates render inside two nested layouts:

```
root.html.heex          ← HTML document shell (head, body, theme script, astro background)
  └─ {@inner_content}
       └─ home.html.heex
            └─ <Layouts.app flash={@flash}>  ← site chrome (header, main, flash)
                 └─ page content
```

**`layouts/root.html.heex`** (`lib/website_web/components/layouts/root.html.heex`)
HTML skeleton. Contains the `<head>` with CSS/JS links, an inline script that applies the saved theme before first paint, and the `<.astro_background />` SVG.

**`Layouts.app`** (`lib/website_web/components/layouts.ex`)
Site chrome component used by every page template. Renders the header (owner name + theme toggle) and wraps `{render_slot(@inner_block)}` in `<main>`.

### Key components (`lib/website_web/components/layouts.ex`)

| Component | Purpose |
|---|---|
| `astro_background/1` | Full-viewport SVG; JS in `app.js` fills it with a grid of astronomy symbols |
| `app/1` | Page wrapper with header and main |
| `theme_toggle/1` | System / light / dark switcher, persisted to `localStorage` |
| `flash_group/1` | Info and error flash banners |

### Owner name

Configured once in `config/config.exs`:
```elixir
config :website, owner_name: "Rigel"
```
Read in templates via `Application.get_env(:website, :owner_name)`.

### Assets

- **CSS**: `assets/css/app.css` — Tailwind v4
- **JS**: `assets/js/app.js` — flash handler, astronomy background renderer
- Bundled by esbuild + Tailwind, output to `priv/static/assets/`

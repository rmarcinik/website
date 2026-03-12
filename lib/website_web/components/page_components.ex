defmodule WebsiteWeb.PageComponents do
  use Phoenix.Component

  @doc """
  Two-panel page layout: index nav on the left, content on the right.
  If no content slot is provided, renders a flex spacer instead.
  """
  attr :back, :string, default: nil, doc: "sets data-back on the nav for keyboard left-arrow"
  attr :path, :string, required: true, doc: "text shown in the panel-path header"
  slot :index, required: true, doc: "items rendered inside the index nav panel"
  slot :content, doc: "rendered inside the content panel; omit to show a flex spacer"

  def page_layout(assigns) do
    ~H"""
    <div class="page-layout">
      <nav class="index-panel" data-back={@back}>
        <p class="panel-path">{@path}</p>
        {render_slot(@index)}
      </nav>
      <%= if @content != [] do %>
        <div class="content-panel">
          {render_slot(@content)}
        </div>
      <% else %>
        <div class="flex-1"></div>
      <% end %>
    </div>
    """
  end

  @doc "Project list in the index panel."
  attr :categories, :list, required: true
  attr :selected, :map, default: nil

  def project_nav(assigns) do
    ~H"""
    <ul class="space-y-4">
      <%= for category <- @categories do %>
        <li>
          <p class="category-label">{category.name}</p>
          <ul class="space-y-1">
            <%= for project <- category.projects do %>
              <li
                data-nav-item
                {if @selected && project.name == @selected.name, do: ["data-current": true], else: []}
              >
                <a
                  href={"/projects/#{project.name}"}
                  class={
                    if @selected && project.name == @selected.name,
                      do: "nav-link-active",
                      else: "nav-link"
                  }
                >
                  {project.name}
                </a>
              </li>
            <% end %>
          </ul>
        </li>
      <% end %>
    </ul>
    """
  end

  @doc "Content panel for the projects page."
  attr :project, :map, default: nil
  attr :github_stats, :map, default: nil

  def project_content(assigns) do
    ~H"""
    <%= if @project do %>
      <div class="content-inner">
        <%= case @project.type do %>
          <% :github -> %>
            <.github_project project={@project} stats={@github_stats} />
          <% :art -> %>
            <.art_project project={@project} />
        <% end %>
      </div>
    <% else %>
      <div class="empty-state">
        <p class="empty-state-text">select a project</p>
      </div>
    <% end %>
    """
  end

  attr :project, :map, required: true
  attr :stats, :map, default: nil

  defp github_project(assigns) do
    ~H"""
    <div class="project-header">
      <span class="project-name">{@project.name}</span>
      <a
        href={"https://github.com/#{@project.repo}"}
        target="_blank"
        rel="noopener noreferrer"
        class="repo-link"
      >
        {@project.repo}
      </a>
    </div>
    <%= if @stats do %>
      <div class="github-stats">
        <div class="stats-grid">
          <div class="stats-row">
            <span class="stats-label">stars</span>
            <span class="stats-value">{@stats.stars}</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">forks</span>
            <span class="stats-value">{@stats.forks}</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">issues</span>
            <span class="stats-value">{@stats.issues}</span>
          </div>
          <div class="stats-row">
            <span class="stats-label">pushed</span>
            <span class="stats-value">{@stats.pushed_at}</span>
          </div>
        </div>
        <%= if length(@stats.languages) > 0 do %>
          <div class="lang-list">
            <%= for lang <- @stats.languages do %>
              <div class="lang-row">
                <span class="lang-name">{lang.name}</span>
                <div class="lang-bar-track">
                  <div class="lang-bar-fill" style={"width: #{lang.pct}%"}></div>
                </div>
                <span class="lang-pct">{lang.pct}%</span>
              </div>
            <% end %>
          </div>
        <% end %>
        <%= if length(@stats.commit_grid) > 0 do %>
          <div class="commit-grid">
            <%= for week <- @stats.commit_grid do %>
              <%= for level <- week do %>
                <div class="commit-cell" style={"--level: #{level}"}></div>
              <% end %>
            <% end %>
          </div>
        <% end %>
        <%= if @stats.readme do %>
          <pre class="readme-content">{@stats.readme}</pre>
        <% end %>
      </div>
    <% end %>
    """
  end

  attr :project, :map, required: true

  defp art_project(assigns) do
    ~H"""
    <p class="project-name">{@project.name}</p>
    <img
      src={@project.image}
      alt={@project.name}
      class="project-image project-image--rotatable"
      data-rotatable
    />
    <p class="project-rotate-hint">click to rotate</p>
    """
  end

  @doc "Test summary in the index panel."
  attr :results, :map, required: true

  def test_nav(assigns) do
    ~H"""
    <ul class="space-y-1">
      <li data-nav-item>
        <span class={if @results.ok?, do: "test-status-pass", else: "test-status-fail"}>
          {if @results.ok?, do: "pass", else: "fail"}
        </span>
      </li>
    </ul>
    <div class="test-stats">
      <p><span class="test-stat-value">{@results.total}</span> total</p>
      <p><span class="test-stat-value test-stat-pass">{@results.passed}</span> passed</p>
      <%= if @results.failed > 0 do %>
        <p><span class="test-stat-value test-stat-fail">{@results.failed}</span> failed</p>
      <% end %>
      <%= if @results.duration do %>
        <p class="test-stat-duration">{@results.duration}s</p>
      <% end %>
    </div>
    """
  end

  @doc "Content panel for the tests page."
  attr :results, :map, required: true

  def test_content(assigns) do
    ~H"""
    <div class="content-inner">
      <div class="test-progress-track">
        <div
          class={[
            "test-progress-bar",
            if(@results.ok?, do: "test-progress-bar--pass", else: "test-progress-bar--fail")
          ]}
          style={"width: #{if @results.total > 0, do: Float.round(@results.passed / @results.total * 100, 1), else: 0}%"}
        />
      </div>
      <%= if @results.modules != [] do %>
        <div class="test-modules">
          <%= for mod <- @results.modules do %>
            <div class="test-module">
              <p class="test-module-name">{mod.name}</p>
              <ul class="test-list">
                <%= for t <- mod.tests do %>
                  <li class="test-item">
                    <span class={if t.passed?, do: "test-dot test-dot--pass", else: "test-dot test-dot--fail"} />
                    <span class={
                      if t.passed?, do: "test-item-name", else: "test-item-name test-item-name--fail"
                    }>
                      {t.name}
                    </span>
                  </li>
                <% end %>
              </ul>
            </div>
          <% end %>
        </div>
      <% end %>
      <%= if @results.failures != [] do %>
        <div class="test-failures">
          <%= for failure <- @results.failures do %>
            <div class="test-failure">
              <p class="test-failure-name">{failure.name}</p>
              <p class="test-failure-location">{failure.location}</p>
            </div>
          <% end %>
        </div>
      <% end %>
      <%= if @results.total == 0 do %>
        <pre class="test-raw-output">{@results.raw}</pre>
      <% end %>
    </div>
    """
  end
end

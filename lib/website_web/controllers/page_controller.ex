defmodule WebsiteWeb.PageController do
  use WebsiteWeb, :controller

  def home(conn, _params) do
    render(conn, :home)
  end

  def projects(conn, params) do
    selected = Website.Projects.find(params["name"])

    github_stats =
      case selected do
        %{type: :github, repo: repo} ->
          case Website.Github.repo_stats(repo) do
            {:ok, stats} -> stats
            _ -> nil
          end

        _ ->
          nil
      end

    render(conn, :projects,
      project_categories: Website.Projects.categories(),
      selected_project: selected,
      github_stats: github_stats
    )
  end

  def tests(conn, _params) do
    render(conn, :tests, results: Website.TestRunner.load())
  end
end

defmodule WebsiteWeb.PageController do
  use WebsiteWeb, :controller

  @project_categories [
    %{
      name: "github",
      projects: [
        %{type: :github, repo: "rmarcinik/mehome", name: "mehome", description: "home lab infrastructure"},
        %{type: :github, repo: "rmarcinik/website", name: "website", description: "personal website"}
      ]
    },
    %{
      name: "art",
      projects: []
    }
  ]

  def home(conn, _params) do
    render(conn, :home)
  end

  def projects(conn, params) do
    all_projects = Enum.flat_map(@project_categories, & &1.projects)
    selected = Enum.find(all_projects, &(&1.name == params["project"]))
    render(conn, :projects, project_categories: @project_categories, selected_project: selected)
  end
end

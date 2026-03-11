defmodule WebsiteWeb.PageController do
  use WebsiteWeb, :controller

  def home(conn, _params) do
    render(conn, :home)
  end

  def projects(conn, params) do
    render(conn, :projects,
      project_categories: Website.Projects.categories(),
      selected_project: Website.Projects.find(params["project"])
    )
  end
end

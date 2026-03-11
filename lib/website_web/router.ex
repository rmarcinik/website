defmodule WebsiteWeb.Router do
  use WebsiteWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {WebsiteWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  scope "/", WebsiteWeb do
    pipe_through :browser

    get "/", PageController, :home
    get "/projects", PageController, :projects
    get "/projects/:name", PageController, :projects
    get "/tests", PageController, :tests
  end
end

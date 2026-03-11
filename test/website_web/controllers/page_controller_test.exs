defmodule WebsiteWeb.PageControllerTest do
  use WebsiteWeb.ConnCase

  describe "GET /" do
    test "returns 200", %{conn: conn} do
      conn = get(conn, ~p"/")
      assert html_response(conn, 200)
    end

    test "shows owner name", %{conn: conn} do
      conn = get(conn, ~p"/")
      assert html_response(conn, 200) =~ Application.get_env(:website, :owner_name)
    end

    test "shows projects/ nav link", %{conn: conn} do
      conn = get(conn, ~p"/")
      assert html_response(conn, 200) =~ ~s(href="/projects")
    end

    test "does not show project content", %{conn: conn} do
      conn = get(conn, ~p"/")
      refute html_response(conn, 200) =~ "select a project"
    end
  end

  describe "GET /projects" do
    test "returns 200", %{conn: conn} do
      conn = get(conn, ~p"/projects")
      assert html_response(conn, 200)
    end

    test "shows breadcrumb path", %{conn: conn} do
      conn = get(conn, ~p"/projects")
      assert html_response(conn, 200) =~ "~/projects/"
    end

    test "shows all category names", %{conn: conn} do
      conn = get(conn, ~p"/projects")
      body = html_response(conn, 200)

      for category <- Website.Projects.categories() do
        assert body =~ category.name
      end
    end

    test "shows all project names in index", %{conn: conn} do
      conn = get(conn, ~p"/projects")
      body = html_response(conn, 200)

      for project <- Website.Projects.all() do
        assert body =~ project.name
      end
    end

    test "shows empty state when no project selected", %{conn: conn} do
      conn = get(conn, ~p"/projects")
      assert html_response(conn, 200) =~ "select a project"
    end

    test "links back to root", %{conn: conn} do
      conn = get(conn, ~p"/projects")
      assert html_response(conn, 200) =~ ~s(data-back="/")
    end

    test "falls back to empty state for unknown project param", %{conn: conn} do
      conn = get(conn, ~p"/projects?project=nonexistent")
      assert html_response(conn, 200) =~ "select a project"
    end
  end

  describe "GET /projects with a selected project" do
    @projects Website.Projects.all()

    for project <- @projects do
      @project project

      test "shows #{@project.name} name and description", %{conn: conn} do
        project = @project
        conn = get(conn, ~p"/projects?project=#{project.name}")
        body = html_response(conn, 200)
        assert body =~ project.name
        assert body =~ project.description
      end

      test "shows #{@project.name} repo link", %{conn: conn} do
        project = @project
        conn = get(conn, ~p"/projects?project=#{project.name}")
        assert html_response(conn, 200) =~ project.repo
      end

      test "#{@project.name} does not show empty state", %{conn: conn} do
        project = @project
        conn = get(conn, ~p"/projects?project=#{project.name}")
        refute html_response(conn, 200) =~ "select a project"
      end
    end
  end
end

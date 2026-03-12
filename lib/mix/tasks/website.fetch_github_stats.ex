defmodule Mix.Tasks.Website.FetchGithubStats do
  @moduledoc "Fetches public GitHub stats for all github-type projects and saves them to priv/github_stats.json."
  use Mix.Task

  @artifact_path "priv/github_stats.json"
  @shortdoc "Fetch and cache GitHub repo stats"

  @base_url ~c"https://api.github.com"
  @headers [
    {~c"accept", ~c"application/vnd.github+json"},
    {~c"user-agent", ~c"rmarcinik-website"}
  ]

  @impl Mix.Task
  def run(_args) do
    Mix.Task.run("app.start")

    repos =
      Website.Projects.all()
      |> Enum.filter(&(&1.type == :github))
      |> Enum.map(& &1.repo)

    stats =
      Map.new(repos, fn repo ->
        Mix.shell().info("Fetching stats for #{repo}...")

        result =
          with {:ok, info} <- get("/repos/#{repo}"),
               {:ok, langs} <- get("/repos/#{repo}/languages") do
            %{
              stars: info["stargazers_count"],
              forks: info["forks_count"],
              issues: info["open_issues_count"],
              pushed_at: info["pushed_at"],
              languages: langs,
              commit_grid: fetch_commit_grid(repo),
              readme: fetch_readme(repo)
            }
          else
            err ->
              Mix.shell().error("Failed to fetch #{repo}: #{inspect(err)}")
              nil
          end

        {repo, result}
      end)

    File.mkdir_p!(Path.dirname(@artifact_path))
    File.write!(@artifact_path, Jason.encode!(stats))
    Mix.shell().info("Saved GitHub stats to #{@artifact_path}")
  end

  defp fetch_commit_grid(repo) do
    since = DateTime.utc_now() |> DateTime.add(-365, :day) |> DateTime.to_iso8601()

    case get("/repos/#{repo}/commits?per_page=100&since=#{since}") do
      {:ok, commits} when is_list(commits) ->
        commits_to_grid(commits)

      _ ->
        []
    end
  end

  defp commits_to_grid(commits) do
    epoch = DateTime.add(DateTime.utc_now(), -52 * 7, :day)
    counts = build_counts(commits, epoch)
    max_count = counts |> Map.values() |> Enum.max(fn -> 1 end) |> max(1)

    for week <- 0..51 do
      for day <- 0..6 do
        intensity_level(Map.get(counts, {week, day}, 0), max_count)
      end
    end
  end

  defp build_counts(commits, epoch) do
    Enum.reduce(commits, %{}, fn commit, acc ->
      case commit_cell(commit, epoch) do
        {week, day} -> Map.update(acc, {week, day}, 1, &(&1 + 1))
        nil -> acc
      end
    end)
  end

  defp commit_cell(commit, epoch) do
    date_str = get_in(commit, ["commit", "author", "date"])

    case date_str && DateTime.from_iso8601(date_str) do
      {:ok, dt, _} ->
        week = div(DateTime.diff(dt, epoch, :day), 7)
        day = rem(Date.day_of_week(DateTime.to_date(dt)), 7)
        if week in 0..51, do: {week, day}, else: nil

      _ ->
        nil
    end
  end

  defp intensity_level(count, max_count) do
    cond do
      count == 0 -> 0
      count <= max_count * 0.25 -> 1
      count <= max_count * 0.5 -> 2
      count <= max_count * 0.75 -> 3
      true -> 4
    end
  end

  defp fetch_readme(repo) do
    case get("/repos/#{repo}/readme") do
      {:ok, %{"content" => content, "encoding" => "base64"}} ->
        content |> String.replace("\n", "") |> Base.decode64!()

      _ ->
        nil
    end
  end

  defp get(path) do
    url = @base_url ++ String.to_charlist(path)

    ssl_opts = [
      {:verify, :verify_peer},
      {:cacerts, :public_key.cacerts_get()},
      {:customize_hostname_check,
       [{:match_fun, :public_key.pkix_verify_hostname_match_fun(:https)}]}
    ]

    case :httpc.request(:get, {url, @headers}, [{:ssl, ssl_opts}], []) do
      {:ok, {{_, 200, _}, _, body}} -> {:ok, Jason.decode!(List.to_string(body))}
      {:ok, {{_, status, _}, _, _}} -> {:error, {:status, status}}
      {:error, reason} -> {:error, reason}
    end
  end
end

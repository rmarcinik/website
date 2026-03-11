defmodule Website.Github do
  @moduledoc """
  Loads cached GitHub repository stats from the artifact produced by mix website.fetch_github_stats.
  """

  @spec repo_stats(String.t()) :: {:ok, map()} | {:error, term()}
  def repo_stats(repo) do
    path = Path.join(:code.priv_dir(:website), "github_stats.json")

    with {:ok, data} <- File.read(path),
         {:ok, all} <- Jason.decode(data),
         %{} = raw when not is_nil(raw) <- Map.get(all, repo, :missing) do
      {:ok,
       %{
         stars: raw["stars"],
         forks: raw["forks"],
         issues: raw["issues"],
         pushed_at: format_age(raw["pushed_at"]),
         languages: lang_percentages(raw["languages"] || %{}),
         commit_grid: raw["commit_grid"] || [],
         readme: raw["readme"]
       }}
    else
      :missing -> {:error, :not_found}
      nil -> {:error, :fetch_failed}
      err -> err
    end
  end

  defp lang_percentages(langs) when map_size(langs) == 0, do: []

  defp lang_percentages(langs) do
    total = langs |> Map.values() |> Enum.sum()

    langs
    |> Enum.map(fn {name, bytes} -> %{name: name, pct: Float.round(bytes / total * 100, 1)} end)
    |> Enum.sort_by(&(-&1.pct))
  end

  defp format_age(nil), do: "unknown"

  defp format_age(iso) do
    case DateTime.from_iso8601(iso) do
      {:ok, dt, _} ->
        days = DateTime.diff(DateTime.utc_now(), dt, :day)

        cond do
          days == 0 -> "today"
          days == 1 -> "yesterday"
          days < 30 -> "#{days} days ago"
          days < 365 -> "#{div(days, 30)} months ago"
          true -> "#{div(days, 365)} years ago"
        end

      _ ->
        iso
    end
  end
end

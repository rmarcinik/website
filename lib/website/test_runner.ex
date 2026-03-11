defmodule Website.TestRunner do
  @moduledoc "Loads test results from the static artifact produced by mix website.save_test_results."

  defstruct total: 0,
            passed: 0,
            failed: 0,
            duration: nil,
            modules: [],
            failures: [],
            ok?: true,
            raw: ""

  def load do
    path = Path.join(:code.priv_dir(:website), "test_results.json")

    with {:ok, data} <- File.read(path),
         {:ok, map} <- Jason.decode(data) do
      from_map(map)
    else
      _ ->
        %__MODULE__{raw: "No test results found. Run: mix website.save_test_results"}
    end
  end

  defp from_map(map) do
    modules =
      Enum.map(map["modules"] || [], fn mod ->
        tests = Enum.map(mod["tests"] || [], &%{name: &1["name"], passed?: &1["passed"]})
        %{name: mod["name"], tests: tests}
      end)

    failures =
      Enum.map(map["failures"] || [], fn f ->
        %{name: f["name"], location: f["location"]}
      end)

    %__MODULE__{
      total: map["total"] || 0,
      passed: map["passed"] || 0,
      failed: map["failed"] || 0,
      duration: map["duration"],
      modules: modules,
      failures: failures,
      ok?: map["ok"] || false,
      raw: map["raw"] || ""
    }
  end
end

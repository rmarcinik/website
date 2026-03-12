defmodule Mix.Tasks.Website.SaveTestResults do
  @moduledoc "Runs mix test --trace and saves parsed results to priv/test_results.json."
  use Mix.Task

  @artifact_path "priv/test_results.json"
  @shortdoc "Save test results artifact"

  @impl Mix.Task
  def run(_args) do
    {output, exit_code} =
      System.cmd("mix", ["test", "--trace"],
        cd: File.cwd!(),
        stderr_to_stdout: true,
        env: [{"MIX_ENV", "test"}]
      )

    clean = strip_ansi(output)
    result = parse(clean, exit_code)

    File.mkdir_p!(Path.dirname(@artifact_path))
    File.write!(@artifact_path, Jason.encode!(result))
    Mix.shell().info("Saved test results to #{@artifact_path}")

    if exit_code != 0, do: Mix.raise("Tests failed")
  end

  defp strip_ansi(str), do: Regex.replace(~r/\e\[[0-9;]*m/, str, "")

  defp parse(output, exit_code) do
    lines = String.split(output, "\n")
    {total, failed} = parse_summary(lines)

    %{
      total: total,
      passed: total - failed,
      failed: failed,
      duration: parse_duration(output),
      modules: parse_modules(lines),
      failures: parse_failures(output),
      ok: exit_code == 0,
      raw: output
    }
  end

  defp parse_summary(lines) do
    summary = Enum.find(lines, &Regex.match?(~r/\d+ tests?/, &1))

    case summary do
      nil ->
        {0, 0}

      line ->
        [total] = Regex.run(~r/(\d+) tests?/, line, capture: :all_but_first)

        failed =
          case Regex.run(~r/(\d+) failures?/, line, capture: :all_but_first) do
            [n] -> String.to_integer(n)
            nil -> 0
          end

        {String.to_integer(total), failed}
    end
  end

  defp parse_duration(output) do
    case Regex.run(~r/Finished in ([\d.]+) seconds/, output, capture: :all_but_first) do
      [d] -> d
      nil -> nil
    end
  end

  defp parse_modules(lines) do
    lines
    |> Enum.reduce({[], nil}, fn line, {modules, current} ->
      handle_parse_line(line, modules, current)
    end)
    |> then(fn {modules, current} ->
      if current && current.tests != [], do: modules ++ [current], else: modules
    end)
  end

  defp handle_parse_line(line, modules, current) do
    cond do
      Regex.match?(~r/^\w[\w.]+(?:Test|Case)/, line) ->
        name = line |> String.split(" ") |> List.first()
        {modules, %{name: name, tests: []}}

      match = current && Regex.run(~r/\* test (.+?) \((.+?)\)/, line) ->
        [_, test_name, timing] = match
        passed? = not String.contains?(timing, "FAILED")
        test = %{name: test_name, passed: passed?}
        {modules, %{current | tests: current.tests ++ [test]}}

      String.trim(line) == "" && current != nil && current.tests != [] ->
        {modules ++ [current], nil}

      true ->
        {modules, current}
    end
  end

  defp parse_failures(output) do
    Regex.scan(~r/\s+\d+\) (.+)\n\s+(.+_test\.exs:\d+)/U, output)
    |> Enum.map(fn [_full, name, location] ->
      %{name: String.trim(name), location: String.trim(location)}
    end)
  end
end

defmodule Website.TestRunner do
  @moduledoc "Runs mix test and parses the output into structured results."

  defstruct total: 0, passed: 0, failed: 0, duration: nil, modules: [], failures: [], ok?: true, raw: ""

  def run do
    {output, exit_code} =
      System.cmd("mix", ["test", "--trace"],
        cd: File.cwd!(),
        stderr_to_stdout: true,
        env: [{"MIX_ENV", "test"}]
      )

    clean = strip_ansi(output)
    parse(clean, exit_code)
  end

  defp strip_ansi(str), do: Regex.replace(~r/\e\[[0-9;]*m/, str, "")

  defp parse(output, exit_code) do
    lines = String.split(output, "\n")

    {total, failed} = parse_summary(lines)
    duration = parse_duration(output)
    modules = parse_modules(lines)
    failures = parse_failures(output)

    %__MODULE__{
      total: total,
      passed: total - failed,
      failed: failed,
      duration: duration,
      modules: modules,
      failures: failures,
      ok?: exit_code == 0,
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

  # Parses --trace output into a list of %{name: module, tests: [%{name, passed?}]}
  defp parse_modules(lines) do
    lines
    |> Enum.reduce({[], nil}, fn line, {modules, current} ->
      cond do
        # Module header: "WebsiteWeb.PageControllerTest [path]" or just "ModuleName"
        Regex.match?(~r/^\w[\w.]+(?:Test|Case)/, line) ->
          name = line |> String.split(" ") |> List.first()
          {modules, %{name: name, tests: []}}

        # Test line: "  * test foo (1.2ms) [L#5]" or "  * test foo (FAILED - 1)"
        match = current && Regex.run(~r/\* test (.+?) \((.+?)\)/, line) ->
          [_, test_name, timing] = match
          passed? = not String.contains?(timing, "FAILED")
          test = %{name: test_name, passed?: passed?}
          updated = %{current | tests: current.tests ++ [test]}
          {modules, updated}

        # Blank line after a module's tests — flush current module
        String.trim(line) == "" && current != nil && current.tests != [] ->
          {modules ++ [current], nil}

        true ->
          {modules, current}
      end
    end)
    |> then(fn {modules, current} ->
      if current && current.tests != [], do: modules ++ [current], else: modules
    end)
  end

  defp parse_failures(output) do
    Regex.scan(~r/\s+\d+\) (.+)\n\s+(.+_test\.exs:\d+)/U, output)
    |> Enum.map(fn [_full, name, location] ->
      %{name: String.trim(name), location: String.trim(location)}
    end)
  end
end

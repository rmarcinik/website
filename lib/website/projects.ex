defmodule Website.Projects do
  @categories [
    %{
      name: "github",
      projects: [
        %{type: :github, repo: "rmarcinik/mehome", name: "mehome", description: "home lab infrastructure"},
        %{type: :github, repo: "rmarcinik/website", name: "website", description: "personal website"}
      ]
    },
    %{
      name: "art",
      projects: [
        %{type: :typography, name: "ambigram", description: "Rigel ambigram logo", image: "/images/ambigram.svg", url: "/ambigram"}
      ]
    }
  ]

  def categories, do: @categories

  def all, do: Enum.flat_map(@categories, & &1.projects)

  def find(name), do: Enum.find(all(), &(&1.name == name))
end

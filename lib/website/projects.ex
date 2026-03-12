defmodule Website.Projects do
  @moduledoc "Single source of truth for project data. Used by the controller, templates, and tests."

  @categories [
    %{
      name: "github",
      projects: [
        %{
          type: :github,
          repo: "rmarcinik/mehome",
          name: "mehome",
          description: "home lab infrastructure"
        },
        %{
          type: :github,
          repo: "rmarcinik/website",
          name: "website",
          description: "personal website"
        },
        %{
          type: :github,
          repo: "rmarcinik/ZombieGame",
          name: "ZombieGame",
          description: "turn based escape game"
        }
      ]
    },
    %{
      name: "art",
      projects: [
        %{
          type: :art,
          name: "ambigram",
          description: "Rigel ambigram logo",
          image: "/images/ambigram-white.svg",
          url: "/ambigram"
        }
      ]
    }
  ]

  def categories, do: @categories

  def all, do: Enum.flat_map(@categories, & &1.projects)

  def find(name), do: Enum.find(all(), &(&1.name == name))
end

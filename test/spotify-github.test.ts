import { describe, expect, it } from "vitest";
import { rankSpotifyRepositories } from "@/lib/spotify-github";

describe("rankSpotifyRepositories", () => {
  it("orders repositories by forks-heavy activity score and returns ten items by default", () => {
    const repositories = Array.from({ length: 12 }, (_, index) => ({
      name: `repo-${index + 1}`,
      full_name: `spotify/repo-${index + 1}`,
      html_url: `https://github.com/spotify/repo-${index + 1}`,
      description: `Repository ${index + 1}`,
      forks_count: 12 - index,
      stargazers_count: (12 - index) * 10,
    }));

    const ranked = rankSpotifyRepositories(repositories);

    expect(ranked).toHaveLength(10);
    expect(ranked[0]).toMatchObject({
      rank: 1,
      name: "repo-1",
      forksCount: 12,
      starsCount: 120,
      activityScore: 1,
    });
    expect(ranked[9].rank).toBe(10);
    expect(ranked[9].name).toBe("repo-10");
  });

  it("uses deterministic tie-breakers when activity scores are equal", () => {
    const ranked = rankSpotifyRepositories([
      {
        name: "beta",
        full_name: "spotify/beta",
        html_url: "https://github.com/spotify/beta",
        description: null,
        forks_count: 50,
        stargazers_count: 25,
      },
      {
        name: "alpha",
        full_name: "spotify/alpha",
        html_url: "https://github.com/spotify/alpha",
        description: null,
        forks_count: 50,
        stargazers_count: 25,
      },
    ]);

    expect(ranked.map((repository) => repository.name)).toEqual(["alpha", "beta"]);
  });

  it("treats identical metric ranges as fully normalized", () => {
    const ranked = rankSpotifyRepositories([
      {
        name: "equal-a",
        full_name: "spotify/equal-a",
        html_url: "https://github.com/spotify/equal-a",
        description: null,
        forks_count: 3,
        stargazers_count: 9,
      },
      {
        name: "equal-b",
        full_name: "spotify/equal-b",
        html_url: "https://github.com/spotify/equal-b",
        description: null,
        forks_count: 3,
        stargazers_count: 9,
      },
    ]);

    expect(ranked[0].activityScore).toBe(1);
    expect(ranked[1].activityScore).toBe(1);
  });
});

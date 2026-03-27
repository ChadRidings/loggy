import type { SpotifyRepoActivity } from "@/types/loggy";

const GITHUB_ORG = "spotify";
const GITHUB_API_VERSION = "2026-03-10";
const GITHUB_API_BASE = "https://api.github.com";
const REPOSITORIES_PER_PAGE = 100;
const DEFAULT_RESULT_LIMIT = 10;
const FORKS_WEIGHT = 0.7;
const STARS_WEIGHT = 0.3;

type GitHubRepository = {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  forks_count: number;
  stargazers_count: number;
};

function normalizeMetric(value: number, min: number, max: number) {
  if (min === max) {
    return 1;
  }

  return (value - min) / (max - min);
}

function roundScore(value: number) {
  return Number(value.toFixed(4));
}

export function rankSpotifyRepositories(
  repositories: GitHubRepository[],
  limit = DEFAULT_RESULT_LIMIT
): SpotifyRepoActivity[] {
  if (repositories.length === 0) {
    return [];
  }

  const forkCounts = repositories.map((repository) => repository.forks_count);
  const starCounts = repositories.map((repository) => repository.stargazers_count);

  const forkMin = Math.min(...forkCounts);
  const forkMax = Math.max(...forkCounts);
  const starMin = Math.min(...starCounts);
  const starMax = Math.max(...starCounts);

  return repositories
    .map((repository) => {
      const forksNormalized = normalizeMetric(repository.forks_count, forkMin, forkMax);
      const starsNormalized = normalizeMetric(repository.stargazers_count, starMin, starMax);
      const activityScore =
        forksNormalized * FORKS_WEIGHT + starsNormalized * STARS_WEIGHT;

      return {
        name: repository.name,
        fullName: repository.full_name,
        htmlUrl: repository.html_url,
        description: repository.description,
        forksCount: repository.forks_count,
        starsCount: repository.stargazers_count,
        activityScore: roundScore(activityScore),
      };
    })
    .sort((left, right) => {
      if (right.activityScore !== left.activityScore) {
        return right.activityScore - left.activityScore;
      }

      if (right.forksCount !== left.forksCount) {
        return right.forksCount - left.forksCount;
      }

      if (right.starsCount !== left.starsCount) {
        return right.starsCount - left.starsCount;
      }

      return left.name.localeCompare(right.name);
    })
    .slice(0, limit)
    .map((repository, index) => ({
      ...repository,
      rank: index + 1,
    }));
}

async function fetchSpotifyRepositoriesPage(page: number): Promise<GitHubRepository[]> {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(
    `${GITHUB_API_BASE}/orgs/${GITHUB_ORG}/repos?type=public&per_page=${REPOSITORIES_PER_PAGE}&page=${page}`,
    {
      headers,
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub request failed with status ${response.status}`);
  }

  return (await response.json()) as GitHubRepository[];
}

export async function getSpotifyRepositoryActivity(limit = DEFAULT_RESULT_LIMIT) {
  const repositories: GitHubRepository[] = [];

  for (let page = 1; ; page += 1) {
    const pageRepositories = await fetchSpotifyRepositoriesPage(page);
    repositories.push(...pageRepositories);

    if (pageRepositories.length < REPOSITORIES_PER_PAGE) {
      break;
    }
  }

  return rankSpotifyRepositories(repositories, limit);
}

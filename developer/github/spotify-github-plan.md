# Spotify GitHub Repository Activity Ranking

## Summary

Build a public-only GitHub integration for the `spotify` organization that returns the top 10 repositories ranked by a forks-and-stars activity proxy.

This plan intentionally replaces clone counts with star counts because GitHub clone traffic is not publicly available. GitHub's clone endpoint only works for repositories with elevated access and only returns the last 14 days, so this implementation will use public repository metadata only.

Default result behavior:

- Return an array of 10 repositories
- Order by `activityScore` descending, with most active first
- Use a forks-heavy weighted score

## Key Changes

- Add a server-side GitHub data fetcher that calls `GET /orgs/spotify/repos` with `type=public` and paginates until all public repositories are collected.
- Sort locally after fetch; GitHub's org repos endpoint does not support server-side sorting by forks or stars.
- Compute `activityScore` per repo using a public proxy:
  - `forksNormalized * 0.7 + starsNormalized * 0.3`
  - Normalize each metric against the full fetched Spotify public repo set using min-max normalization
  - If all values in one metric are identical, treat that metric's normalized value as `1` for every repo so score generation stays stable
- Slice the sorted result to the top 10 by default.
- Expose a read-only route that returns the ranked array and can later support optional query params like `limit`, but default behavior remains fixed at 10 and `activityScore desc`.
- Add a frontend query hook and query key for this dataset so the UI can render the ranking without duplicating fetch logic.
- Show the ranking in a compact list/table with rank, repo name, forks, stars, and score.

## Public APIs / Types

- New API response shape:
  - `repositories: SpotifyRepoActivity[]`
- `SpotifyRepoActivity` should include:
  - `rank: number`
  - `name: string`
  - `fullName: string`
  - `htmlUrl: string`
  - `description: string | null`
  - `forksCount: number`
  - `starsCount: number`
  - `activityScore: number`
- Default API contract:
  - Returns exactly 10 items unless Spotify has fewer than 10 public repositories
  - Already sorted most active first
- Internal fetch model should map GitHub REST fields from the org repos endpoint, primarily:
  - `name`
  - `full_name`
  - `html_url`
  - `description`
  - `forks_count`
  - `stargazers_count`

## Test Plan

- Fetching:
  - Paginates across multiple GitHub pages and merges results correctly
  - Handles GitHub non-200 responses with a safe server error shape
  - Handles empty or partial repo lists
- Ranking:
  - Computes normalized forks and stars correctly
  - Applies `0.7 / 0.3` weighting correctly
  - Sorts by `activityScore desc`
  - Uses deterministic tie-breakers: `forksCount desc`, then `starsCount desc`, then `name asc`
  - Returns only the top 10 by default
- API:
  - Response matches the expected array/object schema
  - Output is already ordered most active first
- UI:
  - Loading, empty, error, and success states render correctly
  - Top-ranked repo appears first and displayed metrics match the API payload

## Assumptions And Defaults

- Product target: Spotify
- Platform target: GitHub
- Data source: GitHub REST API public repository metadata for `spotify`
- "Most cloned" is not implemented; stars are the approved public proxy in this plan
- "Most active" means highest computed `activityScore`
- Default score formula is forks-heavy:
  - `0.7 * normalizedForks + 0.3 * normalizedStars`
- Default output is a top-10 array sorted descending by score
- Implementation should be server-side for GitHub fetches, with the client consuming the app's own route rather than calling GitHub directly

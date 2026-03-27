"use client";

import Link from "next/link";
import { ArrowTopRightIcon, GitHubLogoIcon, StarIcon } from "@radix-ui/react-icons";
import { useSpottyQuery } from "@/hooks/useSpottyQuery";

function formatScore(score: number) {
  return score.toFixed(4);
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function SpottyClient() {
  const spottyQuery = useSpottyQuery();
  const repositories = spottyQuery.data ?? [];
  const topRepository = repositories[0];

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section className="rounded-2xl border border-(--border) bg-(--background)/60 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-geostar-fill text-sm uppercase tracking-[0.22em] text-lime-300">
              Spotty
            </p>
            <h2 className="mt-3 font-roboto-condensed text-2xl font-semibold text-white">
              Spotify GitHub Activity Radar
            </h2>
          </div>
          <div className="rounded-full border border-(--border) bg-slate-900/80 p-3 text-(--accent)">
            <GitHubLogoIcon className="h-6 w-6" />
          </div>
        </div>

        <p className="mt-4 max-w-xl text-sm leading-6 text-(--textmain)">
          Spotty ranks Spotify&apos;s public repositories with a forks-heavy activity model.
          Clone traffic is not publicly exposed by GitHub REST for this use case, so the score
          uses normalized forks and stars instead.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-(--border) bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Default View</p>
            <p className="mt-2 font-roboto-condensed text-xl font-semibold text-white">Top 10</p>
            <p className="mt-1 text-sm text-(--textmain)">Most active first</p>
          </div>
          <div className="rounded-2xl border border-(--border) bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Score</p>
            <p className="mt-2 font-roboto-condensed text-xl font-semibold text-white">
              70 / 30
            </p>
            <p className="mt-1 text-sm text-(--textmain)">Forks weighted above stars</p>
          </div>
          <div className="rounded-2xl border border-(--border) bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-300">Source</p>
            <p className="mt-2 font-roboto-condensed text-xl font-semibold text-white">GitHub</p>
            <p className="mt-1 text-sm text-(--textmain)">Public Spotify repositories</p>
          </div>
        </div>

        {spottyQuery.isLoading ? <p className="mt-6 text-sm">Loading Spotify repositories...</p> : null}
        {spottyQuery.isError ? (
          <p className="mt-6 text-sm">
            Failed to load Spotify repository activity. Please try again shortly.
          </p>
        ) : null}

        {topRepository ? (
          <div className="mt-6 rounded-2xl border border-(--accent) bg-slate-950/70 p-5 shadow-[0_0_0_1px_rgb(97_215_230_/_0.08)]">
            <p className="text-xs uppercase tracking-[0.18em] text-(--accent)">
              Highest Activity Score
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-lime-300 text-sm font-semibold text-slate-900">
                #{topRepository.rank}
              </span>
              <div>
                <h3 className="font-roboto-condensed text-xl font-semibold text-white">
                  {topRepository.name}
                </h3>
                <p className="text-sm text-(--textmain)">{topRepository.fullName}</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-(--textmain)">
              {topRepository.description || "No repository description provided."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              <span className="rounded-full border border-(--border) bg-slate-900 px-3 py-1 text-white">
                Score {formatScore(topRepository.activityScore)}
              </span>
              <span className="rounded-full border border-(--border) bg-slate-900 px-3 py-1 text-white">
                Forks {formatCount(topRepository.forksCount)}
              </span>
              <span className="rounded-full border border-(--border) bg-slate-900 px-3 py-1 text-white">
                Stars {formatCount(topRepository.starsCount)}
              </span>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-(--border) bg-(--background)/60 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-roboto-condensed text-xl font-semibold text-white">
              Ranked Repositories
            </h2>
            <p className="mt-1 text-sm text-(--textmain)">
              Public Spotify repos ordered by activity score.
            </p>
          </div>
          <div className="rounded-full border border-(--border) bg-slate-900/70 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300">
            Live GitHub pull
          </div>
        </div>

        {!spottyQuery.isLoading && !spottyQuery.isError && repositories.length === 0 ? (
          <p className="mt-6 text-sm">No Spotify repositories were returned.</p>
        ) : null}

        {repositories.length > 0 ? (
          <ol className="mt-6 space-y-3">
            {repositories.map((repository) => (
              <li
                key={repository.fullName}
                className="rounded-2xl border border-(--border) bg-slate-950/65 p-4 transition-colors duration-200 hover:border-(--accent)"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-(--border) bg-slate-900 text-sm font-semibold text-white">
                        {repository.rank}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-roboto-condensed text-lg font-semibold text-white">
                          {repository.name}
                        </p>
                        <p className="truncate text-xs uppercase tracking-[0.18em] text-slate-300">
                          {repository.fullName}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-(--textmain)">
                      {repository.description || "No repository description provided."}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
                    <div className="rounded-full bg-(--accent) px-3 py-1 text-sm font-semibold text-(--textdark)">
                      Score {formatScore(repository.activityScore)}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="inline-flex items-center gap-1 rounded-full border border-(--border) px-3 py-1 text-white">
                        <GitHubLogoIcon className="h-4 w-4" />
                        {formatCount(repository.forksCount)} forks
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-(--border) px-3 py-1 text-white">
                        <StarIcon className="h-4 w-4" />
                        {formatCount(repository.starsCount)} stars
                      </span>
                    </div>
                    <Link
                      href={repository.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-(--accent) hover:text-white"
                    >
                      Open repository
                      <ArrowTopRightIcon className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </section>
    </div>
  );
}


import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

import { useAllVideos } from "@/hooks/useAllVideos";

type SortOption =
  | "relevance"
  | "mostViewed"
  | "titleAZ"
  | "newest"
  | "oldest";

type SearchVideo = {
  id: number;
  backendId?: string;
  title: string;
  channel: string;
  views: string;
  time: string;
  duration: string;
  thumbnail: string;
  avatar: string;
  videoUrl: string;
  category: string;
  description?: string;
  createdAt?: string;
};

function getNumericViews(views: string): number {
  const normalized = String(views || "0")
    .toUpperCase()
    .replace(/,/g, "")
    .trim();

  const match = normalized.match(/([\d.]+)\s*([KMB]?)/);

  if (!match) return 0;

  const value = Number(match[1]);
  const unit = match[2];

  if (!Number.isFinite(value)) return 0;

  const multiplier: Record<string, number> = {
    K: 1_000,
    M: 1_000_000,
    B: 1_000_000_000,
  };

  return value * (multiplier[unit] || 1);
}

function getRelativeTimestamp(time: string): number {
  const value = String(time || "").toLowerCase().trim();

  if (
    value === "just now" ||
    value === "just uploaded"
  ) {
    return Date.now();
  }

  if (value === "yesterday") {
    return Date.now() - 24 * 60 * 60 * 1000;
  }

  const match = value.match(
    /(\d+)\s*(minute|minutes|min|hour|hours|day|days|week|weeks|month|months|year|years)/
  );

  if (!match) return 0;

  const amount = Number(match[1]);
  const unit = match[2];

  const durations: Record<string, number> = {
    minute: 60 * 1000,
    minutes: 60 * 1000,
    min: 60 * 1000,
    hour: 60 * 60 * 1000,
    hours: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    weeks: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    months: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
    years: 365 * 24 * 60 * 60 * 1000,
  };

  return Date.now() - amount * (durations[unit] || 0);
}

function normalizeText(value?: string): string {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getVideoTimestamp(video: SearchVideo): number {
  // MongoDB ObjectId ke first 8 hexadecimal characters
  // creation timestamp (seconds) represent karte hain.
  if (
    video.backendId &&
    /^[a-f\d]{24}$/i.test(video.backendId)
  ) {
    const seconds = Number.parseInt(
      video.backendId.slice(0, 8),
      16
    );

    if (Number.isFinite(seconds) && seconds > 0) {
      return seconds * 1000;
    }
  }

  // Agar actual createdAt available ho toh use karo.
  if (video.createdAt) {
    const timestamp = new Date(video.createdAt).getTime();

    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
  }

  // Local uploads ke liye relative time fallback.
  return getRelativeTimestamp(video.time);
}

function getRelevanceScore(
  video: SearchVideo,
  query: string
): number {
  if (!query) return 0;

  const title = normalizeText(video.title);
  const channel = normalizeText(video.channel);
  const category = normalizeText(video.category);
  const description = normalizeText(video.description);

  let score = 0;

  if (title === query) score += 120;
  else if (title.startsWith(query)) score += 80;
  else if (title.includes(query)) score += 50;

  if (channel === query) score += 45;
  else if (channel.includes(query)) score += 25;

  if (category === query) score += 30;
  else if (category.includes(query)) score += 18;

  if (description.includes(query)) score += 8;

  const words = query.split(/\s+/).filter(Boolean);

  for (const word of words) {
    if (word.length < 2) continue;

    if (title.includes(word)) score += 10;
    if (channel.includes(word)) score += 5;
    if (category.includes(word)) score += 4;
    if (description.includes(word)) score += 2;
  }

  return score;
}

function matchesSearch(
  video: SearchVideo,
  query: string
): boolean {
  const searchableText = normalizeText(
    [
      video.title,
      video.channel,
      video.category,
      video.description,
    ].join(" ")
  );

  const words = query.split(/\s+/).filter(Boolean);

  return words.every((word) =>
    searchableText.includes(word)
  );
}

export default function SearchPage() {
  const router = useRouter();

  const { videos, loading } = useAllVideos();

  const query =
    typeof router.query.q === "string"
      ? router.query.q.trim()
      : "";

  const searchQuery = normalizeText(query);

  const [selectedCategory, setSelectedCategory] =
    useState("All");

  const [sortOption, setSortOption] =
    useState<SortOption>("relevance");

  const categories = useMemo(() => {
    const uniqueCategories = new Set(
      videos
        .map((video) => video.category?.trim())
        .filter(
          (category): category is string =>
            Boolean(category)
        )
    );

    return [
      "All",
      ...Array.from(uniqueCategories).sort((a, b) =>
        a.localeCompare(b)
      ),
    ];
  }, [videos]);

  const results = useMemo(() => {
    if (!searchQuery) return [];

    const matchedVideos = videos.filter((video) => {
      const searchVideo = video as SearchVideo;

      const matchesQuery = matchesSearch(
        searchVideo,
        searchQuery
      );

      const matchesCategory =
        selectedCategory === "All" ||
        video.category === selectedCategory;

      return matchesQuery && matchesCategory;
    });

    return [...matchedVideos].sort((a, b) => {
      const videoA = a as SearchVideo;
      const videoB = b as SearchVideo;

      if (sortOption === "mostViewed") {
        return (
          getNumericViews(b.views) -
          getNumericViews(a.views)
        );
      }

      if (sortOption === "titleAZ") {
        return a.title.localeCompare(b.title);
      }

      if (sortOption === "newest") {
        return (
          getVideoTimestamp(videoB) -
          getVideoTimestamp(videoA)
        );
      }

      if (sortOption === "oldest") {
        return (
          getVideoTimestamp(videoA) -
          getVideoTimestamp(videoB)
        );
      }

      return (
        getRelevanceScore(videoB, searchQuery) -
        getRelevanceScore(videoA, searchQuery)
      );
    });
  }, [
    videos,
    searchQuery,
    selectedCategory,
    sortOption,
  ]);

  const hasActiveFilters =
    selectedCategory !== "All" ||
    sortOption !== "relevance";

  const clearFilters = () => {
    setSelectedCategory("All");
    setSortOption("relevance");
  };

  if (!router.isReady || loading) {
    return (
      <main className="min-h-screen bg-white text-black">
        <Header onMenuClick={() => {}} />

        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-gray-500">
            Loading videos...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <Header onMenuClick={() => {}} />

      <Sidebar isOpen={true} onClose={() => {}} />

      <MobileNav />

      <section className="min-h-screen pt-16 lg:ml-64">
        <div className="px-3 pb-24 pt-5 sm:px-5 md:px-6 lg:pb-8">

          <div className="mb-6 flex items-start gap-3">
            <Search
              size={24}
              className="mt-1 shrink-0"
            />

            <div className="min-w-0">
              <h1 className="text-xl font-bold sm:text-2xl">
                Search results
              </h1>

              {query ? (
                <p className="mt-1 break-words text-sm text-gray-500">
                  Results for "{query}"
                </p>
              ) : (
                <p className="mt-1 text-sm text-gray-500">
                  Search for videos, channels or topics.
                </p>
              )}
            </div>
          </div>

          {!query ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center px-4 text-center sm:min-h-[450px]">
              <Search
                size={48}
                className="text-gray-400"
              />

              <h2 className="mt-4 text-xl font-semibold">
                Search for videos
              </h2>

              <p className="mt-2 max-w-md text-sm text-gray-500">
                Enter a keyword in the search bar to
                discover videos, channels and topics.
              </p>

              <button
                type="button"
                onClick={() => router.push("/")}
                className="mt-5 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                Explore videos
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
                <div className="mb-3 flex items-center gap-2">
                  <SlidersHorizontal
                    size={18}
                    className="text-gray-600"
                  />

                  <h2 className="text-sm font-semibold">
                    Filter and sort
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-2xl">
                  <div>
                    <label
                      htmlFor="search-category"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Category
                    </label>

                    <select
                      id="search-category"
                      value={selectedCategory}
                      onChange={(event) =>
                        setSelectedCategory(event.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                    >
                      {categories.map((category) => (
                        <option
                          key={category}
                          value={category}
                        >
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="search-sort"
                      className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                      Sort by
                    </label>

                    <select
                      id="search-sort"
                      value={sortOption}
                      onChange={(event) =>
                        setSortOption(
                          event.target.value as SortOption
                        )
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-black focus:ring-1 focus:ring-black"
                    >
                      <option value="relevance">
                        Relevance
                      </option>

                      <option value="newest">
                        Newest first
                      </option>

                      <option value="oldest">
                        Oldest first
                      </option>

                      <option value="mostViewed">
                        Most viewed
                      </option>

                      <option value="titleAZ">
                        Title: A–Z
                      </option>
                    </select>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p
                    className="text-sm text-gray-500"
                    aria-live="polite"
                  >
                    {results.length}{" "}
                    {results.length === 1
                      ? "video found"
                      : "videos found"}
                  </p>

                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                    >
                      <X size={15} />
                      Clear filters
                    </button>
                  )}
                </div>
              </div>

              {results.length > 0 ? (
                <div className="space-y-5 sm:space-y-6">
                  {results.map((video) => (
                    <Link
                      key={`${video.id}-${video.backendId || "local"}`}
                      href={`/watch/${video.id}`}
                      className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-black"
                    >
                      <article className="flex flex-col gap-3 sm:flex-row sm:gap-4 md:gap-5">
                        <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-gray-200 sm:w-64 md:w-80 xl:w-96">
                          {video.thumbnail ? (
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              loading="lazy"
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gray-200 text-sm text-gray-500">
                              Thumbnail unavailable
                            </div>
                          )}

                          <span className="absolute bottom-2 right-2 rounded bg-black/90 px-1.5 py-0.5 text-xs font-medium text-white">
                            {video.duration}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h2 className="line-clamp-2 text-base font-semibold leading-6 transition group-hover:text-gray-600 sm:text-lg md:text-xl">
                            {video.title}
                          </h2>

                          <p className="mt-2 text-xs text-gray-500 sm:text-sm">
                            {video.views}
                            {" • "}
                            {video.time}
                          </p>

                          <div className="mt-3 flex min-w-0 items-center gap-2">
                            <img
                              src={video.avatar}
                              alt=""
                              loading="lazy"
                              className="h-8 w-8 shrink-0 rounded-full object-cover"
                            />

                            <span className="truncate text-sm font-medium text-gray-700">
                              {video.channel}
                            </span>
                          </div>

                          {video.category && (
                            <span className="mt-3 inline-block rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                              {video.category}
                            </span>
                          )}

                          {video.description && (
                            <p className="mt-3 hidden max-w-2xl text-sm leading-5 text-gray-500 sm:line-clamp-2 sm:block">
                              {video.description}
                            </p>
                          )}
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-[350px] flex-col items-center justify-center px-4 text-center sm:min-h-[400px]">
                  <Search
                    size={48}
                    className="text-gray-400"
                  />

                  <h2 className="mt-4 text-xl font-semibold">
                    No videos found
                  </h2>

                  <p className="mt-2 max-w-md text-sm text-gray-500">
                    No videos match "{query}"
                    {selectedCategory !== "All"
                      ? ` in ${selectedCategory}`
                      : ""}.
                    Try another keyword or clear your filters.
                  </p>

                  <div className="mt-5 flex flex-wrap justify-center gap-3">
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-medium transition hover:bg-gray-100"
                      >
                        Clear filters
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => router.push("/")}
                      className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                    >
                      Go to Home
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

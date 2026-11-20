import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/router";

import {
  Flame,
  Music2,
  Film,
  Radio,
  Gamepad2,
  Trophy,
  Search,
  Play,
} from "lucide-react";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

import { useAllVideos } from "@/hooks/useAllVideos";

type ExploreCategory =
  | "trending"
  | "music"
  | "movies-tv"
  | "live"
  | "gaming"
  | "sports";

type CategoryInfo = {
  title: string;
  description: string;
  icon: typeof Flame;
  categoryNames: string[];
};

const CATEGORY_INFO: Record<
  ExploreCategory,
  CategoryInfo
> = {
  trending: {
    title: "Trending",
    description:
      "Discover videos that are currently popular.",
    icon: Flame,
    categoryNames: [
      "trending",
      "popular",
      "top",
    ],
  },

  music: {
    title: "Music",
    description:
      "Explore music, songs, artists and performances.",
    icon: Music2,
    categoryNames: [
      "music",
      "songs",
      "song",
    ],
  },

  "movies-tv": {
    title: "Movies & TV",
    description:
      "Explore movies, shows, trailers and entertainment.",
    icon: Film,
    categoryNames: [
      "movies",
      "movies & tv",
      "movie",
      "tv",
      "entertainment",
    ],
  },

  live: {
    title: "Live",
    description:
      "Watch live content and streams.",
    icon: Radio,
    categoryNames: [
      "live",
      "live stream",
      "stream",
    ],
  },

  gaming: {
    title: "Gaming",
    description:
      "Explore gaming videos, gameplay and streams.",
    icon: Gamepad2,
    categoryNames: [
      "gaming",
      "game",
      "games",
    ],
  },

  sports: {
    title: "Sports",
    description:
      "Explore sports videos, highlights and events.",
    icon: Trophy,
    categoryNames: [
      "sports",
      "sport",
    ],
  },
};

const allowedCategories =
  Object.keys(
    CATEGORY_INFO
  ) as ExploreCategory[];

export default function ExploreCategoryPage() {
  const router = useRouter();

  const {
    videos,
    loading,
  } = useAllVideos();

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState("");

  const rawCategory =
    router.query.category;

  const category =
    typeof rawCategory === "string"
      ? rawCategory.toLowerCase()
      : "";

  const validCategory =
    allowedCategories.includes(
      category as ExploreCategory
    )
      ? (category as ExploreCategory)
      : null;

  const info =
    validCategory
      ? CATEGORY_INFO[validCategory]
      : null;

  useEffect(() => {
    if (
      router.isReady &&
      !validCategory
    ) {
      router.replace("/");
    }
  }, [
    router.isReady,
    validCategory,
    router,
  ]);

  const filteredVideos = useMemo(() => {
    if (
      !validCategory ||
      !info
    ) {
      return [];
    }

    /*
     * Create a local non-null reference.
     * This prevents TypeScript from reporting:
     * "info is possibly null"
     */
    const categoryInfo = info;

    const names =
      categoryInfo.categoryNames.map(
        (name) =>
          name.toLowerCase()
      );

    const matchingVideos =
      videos.filter(
        (video) => {
          const videoCategory =
            String(
              video.category || ""
            ).toLowerCase();

          const title =
            String(
              video.title || ""
            ).toLowerCase();

          const description =
            String(
              video.description || ""
            ).toLowerCase();

          return (
            names.some(
              (name) =>
                videoCategory ===
                  name ||
                videoCategory.includes(
                  name
                )
            ) ||
            title.includes(
              categoryInfo.title.toLowerCase()
            ) ||
            description.includes(
              categoryInfo.title.toLowerCase()
            )
          );
        }
      );

    /*
     * If the project's existing video
     * data doesn't contain categories
     * matching the selected Explore tab,
     * show available videos instead of
     * making the page look broken.
     */
    if (
      matchingVideos.length === 0
    ) {
      return videos.slice(
        0,
        12
      );
    }

    return matchingVideos;
  }, [
    videos,
    validCategory,
    info,
  ]);

  const handleSearch = () => {
    const query =
      search.trim();

    if (!query) {
      return;
    }

    router.push(
      `/search?q=${encodeURIComponent(
        query
      )}`
    );

    setSearch("");
  };

  if (
    !router.isReady ||
    loading
  ) {
    return (
      <main className="min-h-screen bg-white text-black">
        <Header
          onMenuClick={() =>
            setSidebarOpen(
              (previous) =>
                !previous
            )
          }
        />

        <div className="pt-16">
          <div className="flex min-h-[70vh] items-center justify-center">
            <p className="text-sm text-gray-500">
              Loading...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!validCategory || !info) {
    return null;
  }

  const Icon = info.icon;

  return (
    <main className="min-h-screen bg-white text-black">
      <Header
        onMenuClick={() =>
          setSidebarOpen(
            (previous) =>
              !previous
          )
        }
      />

      <Sidebar
        isOpen={
          sidebarOpen
        }
        onClose={() =>
          setSidebarOpen(
            false
          )
        }
      />

      <MobileNav />

      <section
        className={`min-h-screen pt-16 transition-all duration-300 ${
          sidebarOpen
            ? "lg:ml-64"
            : ""
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="rounded-2xl bg-gray-50 p-5 sm:p-7">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <Icon
                    size={28}
                  />
                </div>

                <div>
                  <h1 className="text-2xl font-bold sm:text-3xl">
                    {info.title}
                  </h1>

                  <p className="mt-1 text-sm text-gray-500">
                    {info.description}
                  </p>
                </div>
              </div>

              {/* Search */}
              <div className="flex w-full max-w-md items-center rounded-full border border-gray-300 bg-white px-4">
                <Search
                  size={18}
                  className="shrink-0 text-gray-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  onKeyDown={(
                    event
                  ) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      handleSearch();
                    }
                  }}
                  placeholder="Search videos"
                  className="h-11 w-full bg-transparent px-3 text-sm outline-none"
                />

                <button
                  type="button"
                  onClick={
                    handleSearch
                  }
                  className="rounded-full p-2 hover:bg-gray-100"
                  aria-label="Search"
                >
                  <Search
                    size={18}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Category Buttons */}
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
            {allowedCategories.map(
              (item) => {
                const itemInfo =
                  CATEGORY_INFO[
                    item
                  ];

                const ItemIcon =
                  itemInfo.icon;

                const active =
                  item ===
                  validCategory;

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() =>
                      router.push(
                        `/explore/${item}`
                      )
                    }
                    className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                    }`}
                  >
                    <ItemIcon
                      size={17}
                    />

                    {
                      itemInfo.title
                    }
                  </button>
                );
              }
            )}
          </div>

          {/* Videos */}
          {filteredVideos.length >
          0 ? (
            <div className="mt-6 grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredVideos.map(
                (video) => (
                  <button
                    key={
                      video.id
                    }
                    type="button"
                    onClick={() =>
                      router.push(
                        `/watch?id=${video.id}`
                      )
                    }
                    className="group text-left"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video overflow-hidden rounded-xl bg-gray-100">
                      <img
                        src={
                          video.thumbnail
                        }
                        alt={
                          video.title
                        }
                        className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                      />

                      {video.duration && (
                        <span className="absolute bottom-2 right-2 rounded bg-black px-1.5 py-0.5 text-xs font-medium text-white">
                          {
                            video.duration
                          }
                        </span>
                      )}
                    </div>

                    {/* Video Info */}
                    <div className="mt-3 flex gap-3">
                      <img
                        src={
                          video.avatar
                        }
                        alt={
                          video.channel
                        }
                        className="h-9 w-9 shrink-0 rounded-full object-cover"
                      />

                      <div className="min-w-0">
                        <h2 className="line-clamp-2 text-sm font-semibold leading-5">
                          {
                            video.title
                          }
                        </h2>

                        <p className="mt-1 truncate text-xs text-gray-500">
                          {
                            video.channel
                          }
                        </p>

                        <p className="text-xs text-gray-500">
                          {
                            video.views
                          }{" "}
                          •{" "}
                          {
                            video.time
                          }
                        </p>
                      </div>
                    </div>
                  </button>
                )
              )}
            </div>
          ) : (
            <div className="mt-10 rounded-2xl border border-dashed border-gray-300 p-12 text-center">
              <Icon
                size={42}
                className="mx-auto text-gray-300"
              />

              <h2 className="mt-4 text-lg font-semibold">
                No videos found
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                There are no videos available in this
                section yet.
              </p>

              <button
                type="button"
                onClick={() =>
                  router.push("/")
                }
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
              >
                <Play
                  size={17}
                />

                Explore Home
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
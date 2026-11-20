import { useMemo, useState } from "react";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import CategoryBar from "@/components/CategoryBar";
import VideoSection from "@/components/VideoSection";
import ShortsSection from "@/components/ShortsSection";
import { useAllVideos } from "@/hooks/useAllVideos";

export default function Home() {
  const [selectedCategory, setSelectedCategory] =
    useState("All");

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const {
    videos,
    loading,
  } = useAllVideos();

  const filteredVideos = useMemo(() => {
    if (selectedCategory === "All") {
      return videos;
    }

    return videos.filter(
      (video) => video.category === selectedCategory
    );
  }, [videos, selectedCategory]);

  const trendingVideos = useMemo(() => {
    const getViews = (views: string) => {
      const value = parseFloat(views);

      if (views.includes("M")) {
        return value * 1000000;
      }

      if (views.includes("K")) {
        return value * 1000;
      }

      return value;
    };

    return [...videos]
      .sort(
        (a, b) =>
          getViews(b.views) - getViews(a.views)
      )
      .slice(0, 8);
  }, [videos]);

  const musicVideos = videos.filter(
    (video) => video.category === "Music"
  );

  const gamingVideos = videos.filter(
    (video) => video.category === "Gaming"
  );

  const sportsVideos = videos.filter(
    (video) => video.category === "Sports"
  );

  const technologyVideos = videos.filter(
    (video) => video.category === "Technology"
  );

  const aiVideos = videos.filter(
    (video) => video.category === "AI"
  );

  return (
    <main className="min-h-screen bg-white text-black">
      <Header
        onMenuClick={() =>
          setSidebarOpen((prev) => !prev)
        }
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <MobileNav />

      <section
        className={`pt-16 transition-all duration-300 ${
          sidebarOpen
            ? "lg:ml-64"
            : "lg:ml-0"
        }`}
      >
        <div className="p-3 pb-20 sm:p-4 md:p-5 lg:p-6 lg:pb-8">
          <CategoryBar
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />

          {loading ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <p className="text-sm text-gray-500">
                Loading videos...
              </p>
            </div>
          ) : (
            <>
              {selectedCategory !== "All" && (
                <>
                  {filteredVideos.length > 0 ? (
                    <VideoSection
                      title={`${selectedCategory} videos`}
                      videos={filteredVideos}
                    />
                  ) : (
                    <div className="flex min-h-[400px] items-center justify-center text-center">
                      <div>
                        <h2 className="text-xl font-semibold">
                          No videos found
                        </h2>

                        <p className="mt-2 text-sm text-gray-500">
                          No videos are available in the{" "}
                          {selectedCategory} category yet.
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCategory("All")
                          }
                          className="mt-4 rounded-full bg-black px-5 py-2 text-sm font-medium text-white hover:bg-gray-800"
                        >
                          Back to all videos
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedCategory === "All" && (
                <>
                  <VideoSection
                    title="Recommended for you"
                    videos={videos.slice(0, 8)}
                  />

                  <VideoSection
                    title="Trending"
                    videos={trendingVideos}
                  />

                  <ShortsSection />

                  {musicVideos.length > 0 && (
                    <VideoSection
                      title="Music"
                      videos={musicVideos}
                    />
                  )}

                  {gamingVideos.length > 0 && (
                    <VideoSection
                      title="Gaming"
                      videos={gamingVideos}
                    />
                  )}

                  {sportsVideos.length > 0 && (
                    <VideoSection
                      title="Sports"
                      videos={sportsVideos}
                    />
                  )}

                  {technologyVideos.length > 0 && (
                    <VideoSection
                      title="Technology"
                      videos={technologyVideos}
                    />
                  )}

                  {aiVideos.length > 0 && (
                    <VideoSection
                      title="AI & Future Tech"
                      videos={aiVideos}
                    />
                  )}

                  <VideoSection
                    title="More videos"
                    videos={videos}
                  />
                </>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}
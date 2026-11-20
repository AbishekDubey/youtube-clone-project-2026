import { useEffect, useState } from "react";
import { ThumbsUp } from "lucide-react";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import VideoGrid from "@/components/VideoGrid";
import { videos } from "@/data/videos";
import { getLikedVideos } from "@/lib/storage";

export default function LikedVideosPage() {
  const [likedIds, setLikedIds] = useState<number[]>([]);

  useEffect(() => {
    setLikedIds(getLikedVideos());
  }, []);

  const likedVideos = likedIds
    .map((id) =>
      videos.find((video) => video.id === id)
    )
    .filter(
      (video): video is (typeof videos)[number] =>
        video !== undefined
    );

  return (
    <main className="min-h-screen bg-white text-black">
      <Header onMenuClick={() => {}} />

      <Sidebar
        isOpen={true}
        onClose={() => {}}
      />

      <MobileNav />

      <section className="pt-16 lg:ml-64">
        <div className="p-4 pb-20 sm:p-5 md:p-6 lg:pb-8">
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <ThumbsUp size={28} />

              <h1 className="text-2xl font-bold md:text-3xl">
                Liked Videos
              </h1>
            </div>

            <p className="mt-2 text-sm text-gray-500">
              Videos you've liked
            </p>
          </div>

          <VideoGrid
            videos={likedVideos}
            emptyTitle="No liked videos"
            emptyMessage="Videos you like will appear here."
          />
        </div>
      </section>
    </main>
  );
}
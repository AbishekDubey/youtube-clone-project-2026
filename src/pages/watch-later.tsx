import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import VideoGrid from "@/components/VideoGrid";
import { videos } from "@/data/videos";
import { getWatchLater } from "@/lib/storage";

export default function WatchLaterPage() {
  const [savedIds, setSavedIds] = useState<number[]>([]);

  useEffect(() => {
    setSavedIds(getWatchLater());
  }, []);

  const savedVideos = savedIds
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
              <Clock3 size={28} />

              <h1 className="text-2xl font-bold md:text-3xl">
                Watch Later
              </h1>
            </div>

            <p className="mt-2 text-sm text-gray-500">
              Videos you've saved to watch later
            </p>
          </div>

          <VideoGrid
            videos={savedVideos}
            emptyTitle="Nothing saved yet"
            emptyMessage="Save videos and watch them later."
          />
        </div>
      </section>
    </main>
  );
}
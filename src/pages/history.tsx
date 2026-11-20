import { useEffect, useState } from "react";
import { History as HistoryIcon, Trash2 } from "lucide-react";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import VideoGrid from "@/components/VideoGrid";
import { videos } from "@/data/videos";
import {
  clearHistory,
  getHistory,
} from "@/lib/storage";

export default function HistoryPage() {
  const [historyIds, setHistoryIds] = useState<number[]>([]);

  useEffect(() => {
    setHistoryIds(getHistory());
  }, []);

  const historyVideos = historyIds
    .map((id) =>
      videos.find((video) => video.id === id)
    )
    .filter(
      (video): video is (typeof videos)[number] =>
        video !== undefined
    );

  const handleClearHistory = () => {
    clearHistory();
    setHistoryIds([]);
  };

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
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <HistoryIcon size={28} />

                <h1 className="text-2xl font-bold md:text-3xl">
                  History
                </h1>
              </div>

              <p className="mt-2 text-sm text-gray-500">
                Videos you recently watched
              </p>
            </div>

            {historyVideos.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
              >
                <Trash2 size={18} />
                <span className="hidden sm:inline">
                  Clear history
                </span>
              </button>
            )}
          </div>

          <VideoGrid
            videos={historyVideos}
            emptyTitle="Your history is empty"
            emptyMessage="Videos you watch will appear here."
          />
        </div>
      </section>
    </main>
  );
}
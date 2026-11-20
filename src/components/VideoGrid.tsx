import VideoCard from "@/components/VideoCard";
import type { Video } from "@/data/videos";

type VideoGridProps = {
  videos: Video[];
  emptyTitle: string;
  emptyMessage: string;
};

export default function VideoGrid({
  videos,
  emptyTitle,
  emptyMessage,
}: VideoGridProps) {
  if (videos.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center text-center">
        <div>
          <h2 className="text-xl font-semibold">
            {emptyTitle}
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            {emptyMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          {...video}
        />
      ))}
    </div>
  );
}
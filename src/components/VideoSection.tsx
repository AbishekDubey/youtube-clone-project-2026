import VideoCard from "@/components/VideoCard";

type Video = {
  id: number;
  title: string;
  channel: string;
  views: string;
  time: string;
  duration: string;
  thumbnail: string;
  avatar: string;
  videoUrl: string;
};

type VideoSectionProps = {
  title: string;
  videos: Video[];
};

export default function VideoSection({
  title,
  videos,
}: VideoSectionProps) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold md:text-2xl">
          {title}
        </h2>

        <button
          type="button"
          className="rounded-full px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
        >
          See all
        </button>
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {videos.map((video) => (
          <VideoCard key={video.id} {...video} />
        ))}
      </div>
    </section>
  );
}
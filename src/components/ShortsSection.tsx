import { Play } from "lucide-react";
import { videos } from "@/data/videos";

export default function ShortsSection() {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Play size={22} className="fill-red-600 text-red-600" />

          <h2 className="text-xl font-bold md:text-2xl">
            Shorts
          </h2>
        </div>

        <button
          type="button"
          className="rounded-full px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
        >
          See all
        </button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-3">
        {videos.slice(0, 6).map((video) => (
          <div
            key={video.id}
            className="group w-40 shrink-0 cursor-pointer sm:w-44 md:w-48"
          >
            <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-gray-200">
              <img
                src={video.thumbnail}
                alt={video.title}
                loading="lazy"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-12">
                <p className="line-clamp-2 text-sm font-semibold text-white">
                  {video.title}
                </p>

                <p className="mt-1 text-xs text-gray-200">
                  {video.views}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
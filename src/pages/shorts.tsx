import { useState } from "react";
import { useRouter } from "next/router";
import {
  ThumbsUp,
  MessageCircle,
  Share2,
  MoreVertical,
  Music2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

import Header from "@/components/Header";
import { videos } from "@/data/videos";

export default function ShortsPage() {
  const router = useRouter();

  const shorts = videos.slice(0, 8);

  const [liked, setLiked] = useState<number[]>([]);
  const [followed, setFollowed] = useState<number[]>([]);

  const toggleLike = (id: number) => {
    setLiked((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  const toggleFollow = (id: number) => {
    setFollowed((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  const handleShare = async (id: number) => {
    const url = `${window.location.origin}/watch/${id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "YouTube Short",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Short link copied!");
      }
    } catch {
      console.log("Share cancelled");
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <Header
  onMenuClick={() => {
    // Shorts page currently does not use a sidebar.
  }}
/>

      <div className="pt-16">
        <div className="mx-auto flex max-w-4xl flex-col items-center">
          {shorts.map((video, index) => (
            <section
              key={video.id}
              className="relative flex min-h-[calc(100vh-64px)] w-full items-center justify-center py-4"
            >
              {/* Short Video */}
              <div className="relative h-[calc(100vh-100px)] max-h-[800px] w-[min(100%,500px)] overflow-hidden rounded-2xl bg-gray-900">
                <video
                  src={video.videoUrl}
                  poster={video.thumbnail}
                  controls
                  loop
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />

                {/* Gradient */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/90 to-transparent" />

                {/* Video Information */}
                <div className="absolute bottom-5 left-5 right-16">
                  <div className="mb-3 flex items-center gap-3">
                    <img
                      src={video.avatar}
                      alt={video.channel}
                      className="h-10 w-10 rounded-full object-cover"
                    />

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {video.channel}
                      </p>

                      <p className="text-xs text-gray-300">
                        {video.views}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleFollow(video.id)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold ${
                        followed.includes(video.id)
                          ? "bg-gray-700 text-white"
                          : "bg-white text-black"
                      }`}
                    >
                      {followed.includes(video.id)
                        ? "Following"
                        : "Follow"}
                    </button>
                  </div>

                  <h2 className="line-clamp-2 text-sm font-semibold leading-6">
                    {video.title}
                  </h2>

                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-300">
                    <Music2 size={14} />
                    Original audio
                  </div>
                </div>

                {/* Right Actions */}
                <div className="absolute bottom-6 right-3 flex flex-col items-center gap-5">
                  <button
                    type="button"
                    onClick={() => toggleLike(video.id)}
                    className="flex flex-col items-center gap-1"
                  >
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-full ${
                        liked.includes(video.id)
                          ? "bg-white text-black"
                          : "bg-black/50 text-white"
                      }`}
                    >
                      <ThumbsUp
                        size={22}
                        className={
                          liked.includes(video.id)
                            ? "fill-black"
                            : ""
                        }
                      />
                    </div>

                    <span className="text-[11px]">
                      {liked.includes(video.id)
                        ? "Liked"
                        : "Like"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      document
                        .getElementById(`comments-${video.id}`)
                        ?.scrollIntoView({
                          behavior: "smooth",
                        })
                    }
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50">
                      <MessageCircle size={22} />
                    </div>

                    <span className="text-[11px]">
                      Comments
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShare(video.id)}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50">
                      <Share2 size={22} />
                    </div>

                    <span className="text-[11px]">
                      Share
                    </span>
                  </button>

                  <button
                    type="button"
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50">
                      <MoreVertical size={22} />
                    </div>

                    <span className="text-[11px]">
                      More
                    </span>
                  </button>
                </div>

                {/* Comments Anchor */}
                <div
                  id={`comments-${video.id}`}
                  className="absolute bottom-0 left-0"
                />
              </div>

              {/* Desktop Side Navigation */}
              <div className="ml-4 hidden flex-col gap-3 md:flex">
                <button
                  type="button"
                  disabled={index === 0}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 disabled:opacity-30"
                  onClick={() => {
                    document
                      .querySelectorAll("section")
                      [index - 1]?.scrollIntoView({
                        behavior: "smooth",
                      });
                  }}
                >
                  <ChevronUp size={20} />
                </button>

                <button
                  type="button"
                  disabled={index === shorts.length - 1}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 disabled:opacity-30"
                  onClick={() => {
                    document
                      .querySelectorAll("section")
                      [index + 1]?.scrollIntoView({
                        behavior: "smooth",
                      });
                  }}
                >
                  <ChevronDown size={20} />
                </button>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
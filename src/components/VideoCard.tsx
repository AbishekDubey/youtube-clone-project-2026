import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  MoreVertical,
  Clock3,
  X,
} from "lucide-react";

import {
  getWatchLater,
  toggleWatchLater,
} from "@/lib/storage";

type VideoCardProps = {
  id: number;
  title: string;
  channel: string;
  views: string;
  time: string;
  duration: string;
  thumbnail: string;
  avatar: string;
};

export default function VideoCard({
  id,
  title,
  channel,
  views,
  time,
  duration,
  thumbnail,
  avatar,
}: VideoCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(getWatchLater().includes(id));
  }, [id]);

  const handleWatchLater = () => {
    const newSavedState = toggleWatchLater(id);

    setSaved(newSavedState);
    setMenuOpen(false);
  };

  /*
   * IMPORTANT:
   * The Next.js route is /watch/[id]
   * Therefore the URL must be /watch/123
   * and NOT /watch?id=123
   */
  const watchUrl = `/watch/${id}`;

  return (
    <article className="group relative min-w-0">
      {/* Thumbnail */}
      <Link href={watchUrl} className="block">
        <div className="relative aspect-video overflow-hidden rounded-xl bg-gray-200">
          <img
            src={thumbnail}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />

          <span className="absolute bottom-2 right-2 rounded bg-black/90 px-1.5 py-0.5 text-xs font-medium text-white">
            {duration}
          </span>
        </div>
      </Link>

      {/* Video Info */}
      <div className="mt-3 flex gap-3">
        {/* Avatar */}
        <Link href={watchUrl} className="shrink-0">
          <img
            src={avatar}
            alt={channel}
            loading="lazy"
            className="h-9 w-9 rounded-full object-cover sm:h-10 sm:w-10"
          />
        </Link>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <Link href={watchUrl} className="block">
            <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-black sm:text-[15px]">
              {title}
            </h3>

            <div className="mt-1 flex items-center gap-1">
              <p className="truncate text-sm text-gray-600">
                {channel}
              </p>

              <CheckCircle2
                size={13}
                className="shrink-0 text-gray-500"
              />
            </div>

            <p className="text-sm text-gray-600">
              {views} • {time}
            </p>
          </Link>
        </div>

        {/* More Button */}
        <div className="relative shrink-0">
          <button
            type="button"
            aria-label="More options"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMenuOpen((prev) => !prev);
            }}
            className="hidden h-8 w-8 items-center justify-center rounded-full text-black transition hover:bg-gray-100 sm:flex"
          >
            <MoreVertical size={18} />
          </button>

          {/* More Menu */}
          {menuOpen && (
            <div className="absolute right-0 top-9 z-50 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-2 shadow-xl">
              <button
                type="button"
                onClick={handleWatchLater}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-gray-100"
              >
                <Clock3 size={19} />

                {saved
                  ? "Remove from Watch later"
                  : "Save to Watch later"}
              </button>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium hover:bg-gray-100"
              >
                <X size={19} />

                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
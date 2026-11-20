
import { useEffect, useState } from "react";

import type { Video } from "@/data/videos";
import { getUploadedVideos } from "@/lib/uploadStorage";

type BackendVideo = {
  _id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  channelName: string;
  channelId?:
    | {
        _id?: string;
        name?: string;
        email?: string;
      }
    | string;
  views?: number;
  likes?: number;
  dislikes?: number;
  category?: string;
  duration?: string;
  createdAt?: string;
  updatedAt?: string;
};

type BackendVideoResponse = {
  success: boolean;
  count?: number;
  videos?: BackendVideo[];
};

function createNumericId(objectId: string) {
  const hex = objectId.slice(-8);
  const parsed = Number.parseInt(hex, 16);

  if (!Number.isFinite(parsed)) {
    return Date.now();
  }

  return parsed;
}

function formatViews(views: number) {
  if (!Number.isFinite(views) || views <= 0) {
    return "0 views";
  }

  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M views`;
  }

  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K views`;
  }

  return `${views} views`;
}

function formatTimeAgo(dateString?: string) {
  if (!dateString) {
    return "Just now";
  }

  const createdAt = new Date(dateString).getTime();

  if (!Number.isFinite(createdAt)) {
    return "Just now";
  }

  const difference = Math.max(0, Date.now() - createdAt);

  const minutes = Math.floor(difference / (1000 * 60));
  const hours = Math.floor(difference / (1000 * 60 * 60));
  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (minutes < 1) return "Just now";

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  if (weeks < 5) {
    return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  }

  if (months < 12) {
    return `${months} month${months === 1 ? "" : "s"} ago`;
  }

  return `${years} year${years === 1 ? "" : "s"} ago`;
}

function convertBackendVideo(video: BackendVideo): Video {
  const channelName =
    video.channelName ||
    (typeof video.channelId === "object"
      ? video.channelId?.name
      : "") ||
    "Unknown Channel";

  // Preserve the MongoDB User ObjectId.
  const channelId =
    typeof video.channelId === "object"
      ? video.channelId?._id
      : video.channelId;

  const playableVideoUrl =
    video.videoUrl ===
    "https://www.w3schools.com/html/mov_bbb.mp4"
      ? "/test-video.mp4"
      : video.videoUrl;

  return {
    id: createNumericId(video._id),
    backendId: video._id,

    // Actual MongoDB channel/creator ID.
    channelId,

    title: video.title || "Untitled video",
    description: video.description || "",
    channel: channelName,
    views: formatViews(video.views || 0),
    time: formatTimeAgo(video.createdAt),
    duration: video.duration || "0:00",
    category: video.category || "Other",
    thumbnail: video.thumbnailUrl || "",
    avatar: "https://i.pravatar.cc/100?img=12",
    videoUrl: playableVideoUrl,
  };
}

export function useAllVideos() {
  const [allVideos, setAllVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let objectUrls: string[] = [];
    let mounted = true;

    const loadVideos = async () => {
      try {
        let backendVideos: Video[] = [];

        /*
         * 1. LOAD VIDEOS FROM MONGODB
         */
        try {
          const response = await fetch("/api/backend/videos");

          if (!response.ok) {
            throw new Error(
              `Backend returned ${response.status}`
            );
          }

          const data: BackendVideoResponse =
            await response.json();

          if (
            data.success &&
            Array.isArray(data.videos)
          ) {
            backendVideos = data.videos
              .filter(
                (video) =>
                  video &&
                  typeof video._id === "string" &&
                  typeof video.videoUrl === "string"
              )
              .map(convertBackendVideo);
          }

          console.log(
            "[frontend] Backend videos:",
            backendVideos
          );

          console.log(
            "[frontend] Backend video count:",
            backendVideos.length
          );
        } catch (backendError) {
          console.error(
            "[frontend] Failed to load backend videos:",
            backendError
          );
        }

        /*
         * 2. LOAD LOCAL UPLOADED VIDEOS
         */
        let convertedLocalVideos: Video[] = [];

        try {
          const uploadedVideos = await getUploadedVideos();

          const validUploadedVideos = uploadedVideos.filter(
            (video) =>
              video &&
              typeof video.id === "number" &&
              video.videoBlob instanceof Blob
          );

          convertedLocalVideos = validUploadedVideos.map(
            (video) => {
              const videoUrl = URL.createObjectURL(
                video.videoBlob
              );

              objectUrls.push(videoUrl);

              let thumbnail = "";

              if (video.thumbnailBlob instanceof Blob) {
                thumbnail = URL.createObjectURL(
                  video.thumbnailBlob
                );

                objectUrls.push(thumbnail);
              }

              return {
                id: video.id,
                backendId: undefined,

                // Local videos do not have a MongoDB channel ID.
                channelId: undefined,

                title: video.title || "Untitled video",
                description: video.description || "",
                channel: video.channel || "Abishek Dubey",
                views: video.views || "0 views",
                time: video.time || "Just now",
                duration: video.duration || "0:00",
                category: video.category || "Technology",
                thumbnail,
                avatar:
                  video.avatar ||
                  "https://i.pravatar.cc/100?img=12",
                videoUrl,
              };
            }
          );
        } catch (localError) {
          console.error(
            "Failed to load local uploaded videos:",
            localError
          );
        }

        /*
         * 3. BUILD FINAL VIDEO LIST
         */
        if (mounted) {
          const demoVideoUrl =
            "https://mdn.github.io/learning-area/html/multimedia-and-embedding/video-and-audio-content/rabbit320.mp4";

          const filteredBackendVideos =
            backendVideos.filter(
              (video) => video.videoUrl !== demoVideoUrl
            );

          setAllVideos([
            ...filteredBackendVideos,
            ...convertedLocalVideos,
          ]);
        }
      } catch (error) {
        console.error("Failed to load videos:", error);

        if (mounted) {
          setAllVideos([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadVideos();

    return () => {
      mounted = false;

      objectUrls.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  return {
    videos: allVideos.filter(Boolean),
    loading,
  };
}

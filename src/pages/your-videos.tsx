
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  Video,
  Trash2,
  Eye,
  Pencil,
  X,
  Save,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

import {
  deleteUploadedVideo,
  getUploadedVideos,
  saveUploadedVideo,
  type UploadedVideo,
} from "@/lib/uploadStorage";

import { getCurrentUser } from "@/lib/auth";
import {
  getCurrentBackendUser,
  getBackendToken,
} from "@/lib/backendAuth";

const BACKEND_API_URL = "http://localhost:5000/api/videos";

type BackendVideo = {
  _id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  videoPublicId?: string;
  thumbnailPublicId?: string;
  channelName?: string;
  channelId?: string | { _id?: string; name?: string };
  views?: number;
  category?: string;
  duration?: string;
  visibility?: string;
  createdAt?: string;
};

type LocalVideoDisplay = UploadedVideo & {
  source: "local";
  videoUrl: string;
  thumbnailUrl: string;
};

type BackendVideoDisplay = {
  source: "backend";
  id: number;
  backendId: string;
  ownerId: string;
  title: string;
  description: string;
  category: string;
  visibility: string;
  duration: string;
  channel: string;
  views: string;
  time: string;
  avatar: string;
  videoUrl: string;
  thumbnailUrl: string;
  videoPublicId: string;
  thumbnailPublicId: string;
};

type VideoDisplay =
  | LocalVideoDisplay
  | BackendVideoDisplay;

type EditForm = {
  title: string;
  description: string;
  category: string;
  visibility: string;
};

type BackendVideoResponse = {
  success: boolean;
  videos?: BackendVideo[];
  video?: BackendVideo;
  message?: string;
};

const emptyForm: EditForm = {
  title: "",
  description: "",
  category: "",
  visibility: "Public",
};

function createNumericId(objectId: string) {
  return Number.parseInt(objectId.slice(-8), 16);
}

function formatViews(views = 0) {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M views`;
  }

  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K views`;
  }

  return `${views} views`;
}

function formatTimeAgo(dateString?: string) {
  if (!dateString) return "Just now";

  const date = new Date(dateString).getTime();

  if (!Number.isFinite(date)) return "Just now";

  const difference = Math.max(0, Date.now() - date);
  const minutes = Math.floor(difference / 60000);
  const hours = Math.floor(difference / 3600000);
  const days = Math.floor(difference / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days < 30) return `${days} days ago`;

  return `${Math.floor(days / 30)} months ago`;
}

function getVideoKey(video: VideoDisplay) {
  return video.source === "backend"
    ? `backend:${video.backendId}`
    : `local:${video.id}`;
}

export default function YourVideosPage() {
  const router = useRouter();

  const [uploadedVideos, setUploadedVideos] = useState<
    VideoDisplay[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");

  const [editingVideo, setEditingVideo] =
    useState<VideoDisplay | null>(null);

  const [editForm, setEditForm] =
    useState<EditForm>(emptyForm);

  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(
    null
  );

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const objectUrlsRef = useRef<string[]>([]);

  // Load MongoDB and IndexedDB videos
  useEffect(() => {
    if (!router.isReady) return;

    let cancelled = false;
    const createdUrls: string[] = [];

    const loadVideos = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const localUser = getCurrentUser();

        if (!localUser) {
          await router.replace(
            `/login?returnUrl=${encodeURIComponent("/your-videos")}`
          );
          return;
        }

        const backendUser = await getCurrentBackendUser();
        const token = getBackendToken();

        if (
          !backendUser?.id ||
          !token ||
          backendUser.email.trim().toLowerCase() !==
            localUser.email.trim().toLowerCase()
        ) {
          await router.replace(
            `/login?returnUrl=${encodeURIComponent("/your-videos")}`
          );
          return;
        }

        if (cancelled) return;

        setCurrentUserId(backendUser.id);

        // 1. Fetch this user's MongoDB videos
        let mongoVideos: BackendVideoDisplay[] = [];

        try {
          const response = await fetch(
            `${BACKEND_API_URL}/mine`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const data =
            (await response.json()) as BackendVideoResponse;

          if (!response.ok || !data.success) {
            throw new Error(
              data.message || "Failed to fetch account videos."
            );
          }

          mongoVideos = (data.videos || [])
            .filter(
              (video) =>
                video &&
                typeof video._id === "string" &&
                typeof video.videoUrl === "string"
            )
            .map((video) => ({
              source: "backend" as const,
              id: createNumericId(video._id),
              backendId: video._id,
              ownerId: backendUser.id,
              title: video.title || "Untitled video",
              description: video.description || "",
              category: video.category || "Other",
              visibility: video.visibility || "Public",
              duration: video.duration || "0:00",
              channel:
                video.channelName ||
                backendUser.name ||
                "My Channel",
              views: formatViews(video.views || 0),
              time: formatTimeAgo(video.createdAt),
              avatar: "https://i.pravatar.cc/100?img=12",
              videoUrl: video.videoUrl,
              thumbnailUrl: video.thumbnailUrl || "",
              videoPublicId: video.videoPublicId || "",
              thumbnailPublicId: video.thumbnailPublicId || "",
            }));
        } catch (backendError) {
          console.error(
            "Failed to load MongoDB videos:",
            backendError
          );

          if (!cancelled) {
            setErrorMessage(
              "Unable to load your cloud videos. Your local videos will still be displayed."
            );
          }
        }

        // 2. Fetch existing IndexedDB videos
        const storedVideos = await getUploadedVideos();

        const localVideos: LocalVideoDisplay[] =
          storedVideos.map((video) => {
            const videoUrl = URL.createObjectURL(
              video.videoBlob
            );

            createdUrls.push(videoUrl);

            let thumbnailUrl = "";

            if (video.thumbnailBlob) {
              thumbnailUrl = URL.createObjectURL(
                video.thumbnailBlob
              );

              createdUrls.push(thumbnailUrl);
            }

            return {
              ...video,
              source: "local",
              videoUrl,
              thumbnailUrl,
            };
          });

        if (cancelled) {
          createdUrls.forEach((url) =>
            URL.revokeObjectURL(url)
          );
          return;
        }

        objectUrlsRef.current.push(...createdUrls);

        // 3. Combine both sources without deleting either.
        setUploadedVideos([
          ...mongoVideos,
          ...localVideos,
        ]);
      } catch (error) {
        console.error("Failed to load your videos:", error);

        if (!cancelled) {
          setErrorMessage(
            "Unable to load your videos. Please refresh and try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setCheckingAuth(false);
        }
      }
    };

    void loadVideos();

    return () => {
      cancelled = true;

      createdUrls.forEach((url) =>
        URL.revokeObjectURL(url)
      );

      objectUrlsRef.current = [];
    };
  }, [router.isReady, router]);

  const myVideos = uploadedVideos.filter((video) => {
    if (video.source === "backend") return true;

    return video.ownerId === currentUserId;
  });

  const legacyVideos = uploadedVideos.filter(
    (video) =>
      video.source === "local" && !video.ownerId
  );

  const revokeVideoUrls = (video: LocalVideoDisplay) => {
    const urls = [
      video.videoUrl,
      video.thumbnailUrl,
    ].filter(Boolean);

    urls.forEach((url) => URL.revokeObjectURL(url));

    objectUrlsRef.current =
      objectUrlsRef.current.filter(
        (url) => !urls.includes(url)
      );
  };

  // Open edit form
  const openEdit = (video: VideoDisplay) => {
    if (
      video.source === "local" &&
      video.ownerId !== currentUserId
    ) {
      setErrorMessage(
        "You cannot edit a legacy video."
      );
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setEditingVideo(video);

    setEditForm({
      title: video.title,
      description: video.description || "",
      category: video.category || "",
      visibility: video.visibility || "Public",
    });
  };

  const closeEdit = () => {
    if (savingEdit) return;

    setEditingVideo(null);
    setEditForm(emptyForm);
  };

  // Save MongoDB or IndexedDB changes
  const handleSaveEdit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!editingVideo || savingEdit) return;

    const title = editForm.title.trim();

    if (!title) {
      setErrorMessage("Please enter a video title.");
      return;
    }

    if (
      !["Public", "Unlisted", "Private"].includes(
        editForm.visibility
      )
    ) {
      setErrorMessage("Please select a valid visibility.");
      return;
    }

    try {
      setSavingEdit(true);
      setErrorMessage("");
      setSuccessMessage("");

      if (editingVideo.source === "backend") {
        // Update MongoDB video
        const token = getBackendToken();

        if (!token) {
          throw new Error("Please sign in again.");
        }

        const response = await fetch(
          `${BACKEND_API_URL}/${editingVideo.backendId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              title,
              description: editForm.description.trim(),
              category: editForm.category.trim(),
              visibility: editForm.visibility,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Unable to update cloud video."
          );
        }

        setUploadedVideos((previous) =>
          previous.map((video) =>
            video.source === "backend" &&
            video.backendId === editingVideo.backendId
              ? {
                  ...video,
                  title,
                  description: editForm.description.trim(),
                  category: editForm.category.trim(),
                  visibility: editForm.visibility,
                }
              : video
          )
        );
      } else {
        // Update local IndexedDB video, preserving original blobs.
        const updatedVideo: UploadedVideo = {
          ...editingVideo,
          id: editingVideo.id,
          ownerId: editingVideo.ownerId,
          title,
          description: editForm.description.trim(),
          category: editForm.category.trim(),
          visibility: editForm.visibility,
          videoBlob: editingVideo.videoBlob,
          thumbnailBlob: editingVideo.thumbnailBlob,
        };

        await saveUploadedVideo(updatedVideo);

        setUploadedVideos((previous) =>
          previous.map((video) =>
            video.source === "local" &&
            video.id === editingVideo.id
              ? {
                  ...video,
                  ...updatedVideo,
                }
              : video
          )
        );
      }

      setEditingVideo(null);
      setEditForm(emptyForm);
      setSuccessMessage(
        "Video details updated successfully."
      );
    } catch (error) {
      console.error("Failed to update video:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Could not save changes. Please try again."
      );
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete MongoDB or IndexedDB video
  const handleDelete = async (video: VideoDisplay) => {
    if (
      video.source === "local" &&
      video.ownerId !== currentUserId
    ) {
      setErrorMessage(
        "You cannot delete a legacy video."
      );
      return;
    }

    const key = getVideoKey(video);

    if (deletingId !== null) return;

    const message =
      video.source === "backend"
        ? `Delete "${video.title}"?\n\nThis removes its MongoDB record and attempts to remove its Cloudinary assets.`
        : `Delete "${video.title}"?\n\nThis permanently removes this uploaded video from this browser's local storage.`;

    const confirmed = window.confirm(message);

    if (!confirmed) return;

    try {
      setDeletingId(key);
      setErrorMessage("");
      setSuccessMessage("");

      if (video.source === "backend") {
        const token = getBackendToken();

        if (!token) {
          throw new Error("Please sign in again.");
        }

        const response = await fetch(
          `${BACKEND_API_URL}/${video.backendId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Unable to delete cloud video."
          );
        }

        setUploadedVideos((previous) =>
          previous.filter(
            (item) =>
              item.source !== "backend" ||
              item.backendId !== video.backendId
          )
        );

        setSuccessMessage(
          data.message || "Cloud video deleted successfully."
        );
      } else {
        await deleteUploadedVideo(video.id);

        revokeVideoUrls(video);

        setUploadedVideos((previous) =>
          previous.filter(
            (item) =>
              item.source !== "local" ||
              item.id !== video.id
          )
        );

        setSuccessMessage(
          "Local video deleted successfully."
        );
      }

      if (
        editingVideo &&
        getVideoKey(editingVideo) === key
      ) {
        setEditingVideo(null);
      }
    } catch (error) {
      console.error("Failed to delete video:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete this video. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // Reusable video card
  const renderVideoCard = (
    video: VideoDisplay,
    canManage: boolean
  ) => {
    const key = getVideoKey(video);

    return (
      <article key={key} className="group min-w-0">
        <Link
          href={`/watch/${video.id}`}
          aria-label={`Watch ${video.title}`}
          className="relative block aspect-video overflow-hidden rounded-xl bg-gray-200"
        >
          {video.thumbnailUrl ? (
            <img
              src={video.thumbnailUrl}
              alt={video.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <video
              src={video.videoUrl}
              preload="metadata"
              aria-label={`${video.title} preview`}
              className="h-full w-full object-cover"
            />
          )}

          <span className="absolute bottom-2 right-2 rounded bg-black/90 px-1.5 py-0.5 text-xs font-medium text-white">
            {video.duration}
          </span>
        </Link>

        <div className="mt-3 flex gap-3">
          <img
            src={video.avatar}
            alt={video.channel}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />

          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-sm font-semibold leading-5">
              {video.title}
            </h3>

            <p className="mt-1 text-sm text-gray-600">
              {video.channel}
            </p>

            <p className="text-sm text-gray-500">
              {video.views} • {video.time}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              {video.category} • {video.visibility}
            </p>

            <p className="mt-1 text-xs text-gray-400">
              {video.source === "backend"
                ? "Cloud video"
                : "Local video"}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/watch/${video.id}`}
            className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2 text-xs font-medium hover:bg-gray-200"
          >
            <Eye size={15} />
            View
          </Link>

          {canManage && (
            <>
              <button
                type="button"
                onClick={() => openEdit(video)}
                disabled={deletingId === key}
                className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2 text-xs font-medium hover:bg-gray-200 disabled:opacity-50"
              >
                <Pencil size={15} />
                Edit
              </button>

              <button
                type="button"
                onClick={() => void handleDelete(video)}
                disabled={deletingId !== null}
                className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {deletingId === key ? (
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                ) : (
                  <Trash2 size={15} />
                )}
                Delete
              </button>
            </>
          )}
        </div>
      </article>
    );
  };

  if (!router.isReady || checkingAuth || loading) {
    return (
      <main className="min-h-screen bg-white text-black">
        <Header onMenuClick={() => {}} />

        <div className="flex min-h-screen items-center justify-center gap-2 pt-16 text-sm text-gray-500">
          <Loader2 size={20} className="animate-spin" />
          Checking your account and loading videos...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <Header onMenuClick={() => {}} />
      <Sidebar isOpen={true} onClose={() => {}} />
      <MobileNav />

      <section className="pt-16 lg:ml-64">
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:pb-8">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <Video size={28} />

                <h1 className="text-2xl font-bold md:text-3xl">
                  Your Videos
                </h1>
              </div>

              <p className="mt-2 text-sm text-gray-500">
                Manage your Cloudinary and local videos.
              </p>
            </div>

            <Link
              href="/upload"
              className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
            >
              <Upload size={16} />
              Upload
            </Link>
          </div>

          {successMessage && (
            <div
              role="status"
              className="mb-4 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800"
            >
              <CheckCircle2 size={18} className="shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              <AlertCircle size={18} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* MY VIDEOS */}
          <section className="mb-12">
            <div className="mb-5">
              <h2 className="text-xl font-bold">
                My Videos ({myVideos.length})
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Cloud videos and local uploads belonging to your account.
              </p>
            </div>

            {myVideos.length > 0 ? (
              <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {myVideos.map((video) =>
                  renderVideoCard(video, true)
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center">
                <Video
                  size={42}
                  className="mx-auto text-gray-400"
                />

                <h3 className="mt-3 font-semibold">
                  No account videos yet
                </h3>

                <p className="mt-2 text-sm text-gray-500">
                  Upload a new video to see it here.
                </p>

                <Link
                  href="/upload"
                  className="mt-4 inline-flex rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  Upload video
                </Link>
              </div>
            )}
          </section>

          {/* LEGACY VIDEOS */}
          <section className="border-t border-gray-200 pt-8">
            <div className="mb-5">
              <h2 className="text-xl font-bold">
                Legacy Videos ({legacyVideos.length})
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Previously uploaded local videos without account ownership.
                These are preserved separately.
              </p>
            </div>

            {legacyVideos.length > 0 ? (
              <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {legacyVideos.map((video) =>
                  renderVideoCard(video, false)
                )}
              </div>
            ) : (
              <p className="rounded-xl bg-gray-50 p-5 text-sm text-gray-500">
                No legacy videos found.
              </p>
            )}
          </section>
        </div>
      </section>

      {/* EDIT VIDEO MODAL */}
      {editingVideo && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-black/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEdit();
            }
          }}
        >
          <form
            onSubmit={handleSaveEdit}
            aria-labelledby="edit-video-title"
            className="my-auto w-full max-w-lg rounded-2xl bg-white p-5 text-black shadow-2xl sm:p-6"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2
                  id="edit-video-title"
                  className="text-xl font-bold"
                >
                  Edit video
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Update details without replacing your original video.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                disabled={savingEdit}
                aria-label="Close edit form"
                className="rounded-full p-2 hover:bg-gray-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="edit-video-title-input"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Title *
                </label>

                <input
                  id="edit-video-title-input"
                  value={editForm.title}
                  onChange={(event) =>
                    setEditForm((previous) => ({
                      ...previous,
                      title: event.target.value,
                    }))
                  }
                  required
                  maxLength={150}
                  disabled={savingEdit}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-video-description"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Description
                </label>

                <textarea
                  id="edit-video-description"
                  value={editForm.description}
                  onChange={(event) =>
                    setEditForm((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                  rows={4}
                  maxLength={5000}
                  disabled={savingEdit}
                  className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-video-category"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Category
                </label>

                <input
                  id="edit-video-category"
                  value={editForm.category}
                  onChange={(event) =>
                    setEditForm((previous) => ({
                      ...previous,
                      category: event.target.value,
                    }))
                  }
                  maxLength={80}
                  disabled={savingEdit}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-video-visibility"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Visibility
                </label>

                <select
                  id="edit-video-visibility"
                  value={editForm.visibility}
                  onChange={(event) =>
                    setEditForm((previous) => ({
                      ...previous,
                      visibility: event.target.value,
                    }))
                  }
                  disabled={savingEdit}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-black"
                >
                  <option value="Public">Public</option>
                  <option value="Unlisted">Unlisted</option>
                  <option value="Private">Private</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEdit}
                disabled={savingEdit}
                className="rounded-full px-4 py-2.5 text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={savingEdit || !editForm.title.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingEdit ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Save size={16} />
                )}

                {savingEdit ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

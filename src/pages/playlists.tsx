
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock3,
  ListVideo,
  Plus,
  Trash2,
  X,
  Play,
  Check,
} from "lucide-react";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import VideoGrid from "@/components/VideoGrid";
import { videos } from "@/data/videos";
import { getWatchLater } from "@/lib/storage";
import {
  addVideoToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylists,
  removeVideoFromPlaylist,
  type UserPlaylist,
} from "@/lib/playlistStorage";

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<UserPlaylist[]>([]);
  const [watchLaterIds, setWatchLaterIds] = useState<number[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAddVideos, setShowAddVideos] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [playlistDescription, setPlaylistDescription] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refreshData = useCallback(() => {
    setPlaylists(getPlaylists());
    setWatchLaterIds(getWatchLater());
  }, []);

  useEffect(() => {
    refreshData();

    const handleUpdate = () => refreshData();
    window.addEventListener("youtube-playlists-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("youtube-playlists-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [refreshData]);

  const selectedPlaylist = useMemo(
    () => playlists.find((item) => item.id === selectedPlaylistId),
    [playlists, selectedPlaylistId]
  );

  const selectedVideos = useMemo(() => {
    if (!selectedPlaylist) return [];

    return selectedPlaylist.videoIds
      .map((id) => videos.find((video) => video.id === id))
      .filter((video): video is (typeof videos)[number] => video !== undefined);
  }, [selectedPlaylist]);

  const availableVideos = useMemo(() => {
    const existingIds = selectedPlaylist?.videoIds ?? [];
    const term = search.trim().toLowerCase();

    return videos.filter((video) => {
      if (existingIds.includes(video.id)) return false;

      return (
        !term ||
        video.title.toLowerCase().includes(term) ||
        video.channel.toLowerCase().includes(term) ||
        video.category.toLowerCase().includes(term)
      );
    });
  }, [search, selectedPlaylist]);

  const watchLaterVideos = useMemo(
    () =>
      watchLaterIds
        .map((id) => videos.find((video) => video.id === id))
        .filter((video): video is (typeof videos)[number] => video !== undefined),
    [watchLaterIds]
  );

  const handleCreatePlaylist = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const playlist = createPlaylist(playlistName, playlistDescription);
      refreshData();
      setPlaylistName("");
      setPlaylistDescription("");
      setShowCreateForm(false);
      setSelectedPlaylistId(playlist.id);
      setMessage("Playlist created successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create playlist.");
    }
  };

  const handleDeletePlaylist = (playlist: UserPlaylist) => {
    const confirmed = window.confirm(
      `Delete "${playlist.name}"? This will remove the playlist, not the original videos.`
    );

    if (!confirmed) return;

    const success = deletePlaylist(playlist.id);

    if (success) {
      if (selectedPlaylistId === playlist.id) {
        setSelectedPlaylistId(null);
      }

      refreshData();
      setMessage("Playlist deleted.");
      setError("");
    } else {
      setError("Unable to delete playlist.");
    }
  };

  const handleAddVideo = (videoId: number) => {
    if (!selectedPlaylistId) return;

    const success = addVideoToPlaylist(selectedPlaylistId, videoId);

    if (success) {
      refreshData();
      setMessage("Video added to playlist.");
      setError("");
    } else {
      setError("Could not add this video. Please try again.");
    }
  };

  const handleRemoveVideo = (videoId: number) => {
    if (!selectedPlaylistId) return;

    const success = removeVideoFromPlaylist(selectedPlaylistId, videoId);

    if (success) {
      refreshData();
      setMessage("Video removed from playlist.");
      setError("");
    } else {
      setError("Could not remove this video.");
    }
  };

  return (
    <main className="min-h-screen bg-white text-black dark:bg-[#0f0f0f] dark:text-white">
      <Header onMenuClick={() => {}} />
      <Sidebar isOpen={true} onClose={() => {}} />
      <MobileNav />

      <section className="pt-16 lg:ml-64">
        <div className="p-4 pb-24 sm:p-6 lg:pb-10">
          {selectedPlaylist ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setSelectedPlaylistId(null);
                  setShowAddVideos(false);
                  setSearch("");
                  setMessage("");
                  setError("");
                }}
                className="mb-6 inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200 dark:bg-[#272727] dark:hover:bg-[#383838]"
              >
                <ArrowLeft size={18} />
                All playlists
              </button>

              <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <ListVideo size={30} />
                    <h1 className="text-2xl font-bold md:text-3xl">
                      {selectedPlaylist.name}
                    </h1>
                  </div>

                  <p className="mt-2 text-sm text-gray-500">
                    {selectedPlaylist.description || "No description"}
                  </p>

                  <p className="mt-2 text-sm text-gray-500">
                    {selectedVideos.length} videos
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedVideos.length > 0 && (
                    <Link
                      href={`/watch/${selectedVideos[0].id}`}
                      className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-black"
                    >
                      <Play size={17} />
                      Play first video
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowAddVideos((value) => !value);
                      setSearch("");
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold hover:bg-gray-200 dark:bg-[#272727] dark:hover:bg-[#383838]"
                  >
                    <Plus size={18} />
                    Add videos
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeletePlaylist(selectedPlaylist)}
                    className="inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                  >
                    <Trash2 size={17} />
                    Delete
                  </button>
                </div>
              </div>

              {showAddVideos && (
                <section className="mb-8 rounded-xl border border-gray-200 p-4 dark:border-[#383838]">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="font-semibold">Add videos to this playlist</h2>
                    <button
                      type="button"
                      aria-label="Close add videos"
                      onClick={() => setShowAddVideos(false)}
                      className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-[#272727]"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search videos by title, channel or category..."
                    className="mb-4 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-[#444]"
                  />

                  {availableVideos.length ? (
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {availableVideos.map((video) => (
                        <div
                          key={video.id}
                          className="flex min-w-0 items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-[#383838]"
                        >
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="h-16 w-28 shrink-0 rounded-md object-cover"
                          />

                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-semibold">
                              {video.title}
                            </p>
                            <p className="mt-1 truncate text-xs text-gray-500">
                              {video.channel}
                            </p>
                            <button
                              type="button"
                              onClick={() => handleAddVideo(video.id)}
                              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
                            >
                              <Plus size={15} />
                              Add
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-6 text-center text-sm text-gray-500">
                      No more matching videos to add.
                    </p>
                  )}
                </section>
              )}

              {selectedVideos.length > 0 ? (
                <div className="space-y-3">
                  {selectedVideos.map((video, index) => (
                    <div
                      key={video.id}
                      className="flex min-w-0 items-center gap-3 rounded-xl border border-gray-200 p-3 dark:border-[#383838] sm:gap-4"
                    >
                      <span className="hidden w-5 text-sm text-gray-500 sm:block">
                        {index + 1}
                      </span>

                      <Link
                        href={`/watch/${video.id}`}
                        className="relative block w-32 shrink-0 overflow-hidden rounded-lg sm:w-44"
                      >
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="aspect-video w-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1.5 py-0.5 text-xs text-white">
                          {video.duration}
                        </span>
                      </Link>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/watch/${video.id}`}
                          className="line-clamp-2 text-sm font-semibold hover:text-blue-600 sm:text-base"
                        >
                          {video.title}
                        </Link>
                        <p className="mt-1 text-sm text-gray-500">
                          {video.channel}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {video.views} · {video.time}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveVideo(video.id)}
                        title="Remove from playlist"
                        aria-label={`Remove ${video.title} from playlist`}
                        className="rounded-full p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-[#272727]"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center dark:border-[#383838]">
                  <ListVideo size={42} className="mx-auto text-gray-400" />
                  <h2 className="mt-4 text-lg font-semibold">This playlist is empty</h2>
                  <p className="mt-2 text-sm text-gray-500">
                    Add videos to build your playlist.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddVideos(true)}
                    className="mt-4 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-black"
                  >
                    Add videos
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <ListVideo size={30} />
                    <h1 className="text-2xl font-bold md:text-3xl">
                      Playlists
                    </h1>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Create playlists and organize your videos.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm((value) => !value);
                    setError("");
                    setMessage("");
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-black"
                >
                  <Plus size={18} />
                  Create playlist
                </button>
              </div>

              {showCreateForm && (
                <form
                  onSubmit={handleCreatePlaylist}
                  className="mb-8 max-w-2xl space-y-4 rounded-xl border border-gray-200 p-5 dark:border-[#383838]"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">New playlist</h2>
                    <button
                      type="button"
                      aria-label="Close form"
                      onClick={() => setShowCreateForm(false)}
                      className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-[#272727]"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium">
                      Playlist name
                    </span>
                    <input
                      required
                      maxLength={100}
                      value={playlistName}
                      onChange={(event) => setPlaylistName(event.target.value)}
                      placeholder="e.g. React Tutorials"
                      className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-[#444]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium">
                      Description (optional)
                    </span>
                    <textarea
                      maxLength={500}
                      rows={3}
                      value={playlistDescription}
                      onChange={(event) => setPlaylistDescription(event.target.value)}
                      placeholder="What is this playlist about?"
                      className="w-full resize-y rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-[#444]"
                    />
                  </label>

                  <button
                    type="submit"
                    className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-black"
                  >
                    Create
                  </button>
                </form>
              )}

              {message && (
                <p role="status" className="mb-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
                  <Check className="mr-2 inline" size={16} />
                  {message}
                </p>
              )}

              {error && (
                <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <section className="mb-10">
                <div className="mb-4 flex items-center gap-3">
                  <Clock3 size={23} />
                  <h2 className="text-xl font-bold">Watch Later</h2>
                  <span className="text-sm text-gray-500">
                    {watchLaterVideos.length} videos
                  </span>
                </div>

                  {watchLaterVideos.length ? <VideoGrid
                  videos={watchLaterVideos}
                  emptyTitle="Your Watch Later list is empty"
                  emptyMessage="Save videos to watch them later."
                /> : (
                  <p className="rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-500 dark:border-[#383838]">
                    Your Watch Later list is empty. Save videos from the video options menu.
                  </p>
                )}
              </section>

              <section>
                <h2 className="mb-5 text-xl font-bold">Your playlists</h2>

                {playlists.length ? (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {playlists.map((playlist) => {
                      const playlistVideos = playlist.videoIds
                        .map((id) => videos.find((video) => video.id === id))
                        .filter((video): video is (typeof videos)[number] => video !== undefined);

                      return (
                        <article
                          key={playlist.id}
                          className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-[#383838] dark:bg-[#181818]"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPlaylistId(playlist.id);
                              setMessage("");
                              setError("");
                            }}
                            className="group grid aspect-video w-full grid-cols-2 overflow-hidden bg-gray-100 dark:bg-[#272727]"
                            aria-label={`Open playlist ${playlist.name}`}
                          >
                            {playlistVideos.length ? (
                              playlistVideos.slice(0, 4).map((video) => (
                                <img
                                  key={video.id}
                                  src={video.thumbnail}
                                  alt={video.title}
                                  className="h-full w-full object-cover"
                                />
                              ))
                            ) : (
                              <div className="col-span-2 flex flex-col items-center justify-center gap-2 text-gray-500">
                                <ListVideo size={36} />
                                <span className="text-sm">No videos yet</span>
                              </div>
                            )}
                          </button>

                          <div className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="truncate text-lg font-bold">
                                  {playlist.name}
                                </h3>
                                <p className="mt-1 text-sm text-gray-500">
                                  {playlistVideos.length} videos
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeletePlaylist(playlist)}
                                aria-label={`Delete ${playlist.name}`}
                                title="Delete playlist"
                                className="rounded-full p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>

                            <p className="mt-3 line-clamp-2 min-h-10 text-sm text-gray-500">
                              {playlist.description || "No description"}
                            </p>

                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPlaylistId(playlist.id);
                                setMessage("");
                                setError("");
                              }}
                              className="mt-4 w-full rounded-full bg-gray-100 px-4 py-2.5 text-sm font-semibold hover:bg-gray-200 dark:bg-[#272727] dark:hover:bg-[#383838]"
                            >
                              View playlist
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center dark:border-[#383838]">
                    <ListVideo size={44} className="mx-auto text-gray-400" />
                    <h3 className="mt-4 text-lg font-semibold">No playlists yet</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Create your first playlist to get started.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(true)}
                      className="mt-4 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-black"
                    >
                      Create playlist
                    </button>
                  </div>
                )}
              </section>

              <section className="mt-12">
                <h2 className="mb-4 text-xl font-bold">Explore videos</h2>
                <VideoGrid
                  videos={videos.slice(0, 8)}
                  emptyTitle="No videos available"
                  emptyMessage="Videos will appear here when available."
                />
              </section>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

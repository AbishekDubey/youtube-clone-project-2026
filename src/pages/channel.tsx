
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Camera,
  CheckCircle2,
  Edit3,
  Share2,
  Save,
  X,
  Video,
} from "lucide-react";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

import { getCurrentUser } from "@/lib/auth";
import { useAllVideos } from "@/hooks/useAllVideos";

import {
  getChannelProfile,
  saveChannelProfile,
  type ChannelProfile,
} from "@/lib/channelStorage";

import { getChannelSubscriptionStatus } from "@/lib/subscriptionApi";

import type { Video as VideoType } from "@/data/videos";

export default function ChannelPage() {
  const router = useRouter();
  const { videos, loading: videosLoading } = useAllVideos();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<ChannelProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [bannerPreview, setBannerPreview] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);

  const user = getCurrentUser();

  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth >= 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!router.isReady) return;

    let mounted = true;

    const loadProfile = async () => {
      const currentUser = getCurrentUser();

      if (!currentUser) {
        router.replace("/login?returnUrl=%2Fchannel");
        return;
      }

      try {
        const savedProfile = await getChannelProfile();

        if (!mounted) return;

        const currentProfile: ChannelProfile = {
          ...savedProfile,
          name: currentUser.name,
        };

        setProfile(currentProfile);
        setEditDescription(currentProfile.description || "");
        setAvatarPreview(currentProfile.avatar || "");
        setBannerPreview(currentProfile.banner || "");
      } catch (error) {
        console.error("Channel profile error:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [router.isReady, router]);

  const channelVideos = useMemo(() => {
    if (!user) return [];

    return videos.filter(
      (video) =>
        video.channel?.trim().toLowerCase() ===
        user.name.trim().toLowerCase()
    );
  }, [videos, user]);

  useEffect(() => {
    let mounted = true;

    const loadSubscriberCount = async () => {
      const channelId = channelVideos.find(
        (video) => video.channelId
      )?.channelId;

      if (!channelId) {
        setSubscriberCount(null);
        return;
      }

      try {
        const result = await getChannelSubscriptionStatus(channelId);

        if (mounted) {
          setSubscriberCount(result.subscriberCount);
        }
      } catch (error) {
        console.error("Subscriber count error:", error);
      }
    };

    loadSubscriberCount();

    return () => {
      mounted = false;
    };
  }, [channelVideos]);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const compressImage = (
    file: File,
    maxWidth: number,
    quality: number
  ): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const image = new Image();

        image.onload = () => {
          const scale = Math.min(1, maxWidth / image.width);
          const canvas = document.createElement("canvas");

          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);

          const context = canvas.getContext("2d");

          if (!context) {
            reject(new Error("Unable to process image."));
            return;
          }

          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };

        image.onerror = () => reject(new Error("Invalid image."));
        image.src = String(reader.result);
      };

      reader.onerror = () => reject(new Error("Unable to read image."));
      reader.readAsDataURL(file);
    });

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "avatar" | "banner"
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image.");
      return;
    }

    try {
      const image = await compressImage(
        file,
        type === "avatar" ? 400 : 1280,
        0.75
      );

      if (type === "avatar") setAvatarPreview(image);
      else setBannerPreview(image);

      setSaveMessage("");
    } catch {
      alert("Unable to load image.");
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    try {
      setSavingProfile(true);
      setSaveMessage("");

      const updatedProfile: ChannelProfile = {
        ...profile,
        avatar: avatarPreview,
        banner: bannerPreview,
        description: editDescription.trim(),
      };

      await saveChannelProfile(updatedProfile);
      setProfile(updatedProfile);
      setCustomizeOpen(false);
      setSaveMessage("Changes saved successfully.");
    } catch (error) {
      console.error(error);
      setSaveMessage("Unable to save changes.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleCancel = () => {
    if (!profile) return;

    setAvatarPreview(profile.avatar || "");
    setBannerPreview(profile.banner || "");
    setEditDescription(profile.description || "");
    setCustomizeOpen(false);
    setSaveMessage("");
  };

  const handleShare = async () => {
    try {
      const url = window.location.href;

      if (navigator.share) {
        await navigator.share({
          title: `${profile?.name} - YouTube Clone`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setSaveMessage("Channel link copied!");
      }
    } catch {
      // Share cancelled.
    }
  };

  if (!router.isReady || loading || !profile) {
    return (
      <main className="min-h-screen bg-white text-black">
        <Header onMenuClick={() => setSidebarOpen((value) => !value)} />
        <div className="flex min-h-screen items-center justify-center pt-16">
          <p className="text-sm text-gray-500">Loading channel...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <Header onMenuClick={() => setSidebarOpen((value) => !value)} />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <MobileNav />

      <section
        className={`pt-16 transition-all ${
          sidebarOpen ? "lg:ml-64" : "lg:ml-0"
        }`}
      >
        <div className="relative h-36 overflow-hidden bg-gray-200 sm:h-48 md:h-56 lg:h-64">
          {bannerPreview ? (
            <img
              src={bannerPreview}
              alt="Channel banner"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-r from-gray-200 to-gray-300">
              <Camera size={36} className="text-gray-400" />
            </div>
          )}

          <button
            type="button"
            onClick={() => setCustomizeOpen(true)}
            className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium shadow"
          >
            <Camera size={18} />
            Customize
          </button>
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          {saveMessage && (
            <p className="mt-4 rounded-lg bg-gray-100 p-3 text-sm">
              {saveMessage}
            </p>
          )}

          {customizeOpen && (
            <section className="mt-5 rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b p-5">
                <h2 className="text-lg font-semibold">
                  Customize your channel
                </h2>

                <button type="button" onClick={handleCancel}>
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6 p-5">
                <div>
                  <p className="mb-3 text-sm font-semibold">
                    Profile picture
                  </p>

                  <div className="flex items-center gap-4">
                    <img
                      src={avatarPreview || "/default-avatar.png"}
                      alt="Avatar preview"
                      className="h-20 w-20 rounded-full bg-gray-200 object-cover"
                    />

                    <label className="cursor-pointer rounded-full bg-gray-100 px-4 py-2 text-sm">
                      Change picture
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) =>
                          handleImageChange(event, "avatar")
                        }
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-sm font-semibold">
                    Channel banner
                  </p>

                  <label className="inline-flex cursor-pointer rounded-full bg-gray-100 px-4 py-2 text-sm">
                    Upload banner
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) =>
                        handleImageChange(event, "banner")
                      }
                    />
                  </label>
                </div>

                <div>
                  <label
                    htmlFor="channel-description"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Channel description
                  </label>

                  <textarea
                    id="channel-description"
                    value={editDescription}
                    onChange={(event) =>
                      setEditDescription(event.target.value)
                    }
                    maxLength={1000}
                    rows={4}
                    className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t p-5">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-full bg-gray-100 px-5 py-2 text-sm"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="flex items-center gap-2 rounded-full bg-black px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  <Save size={16} />
                  {savingProfile ? "Saving..." : "Save changes"}
                </button>
              </div>
            </section>
          )}

          <div className="mt-5 flex flex-col gap-5 md:flex-row md:items-end">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-3xl font-bold sm:h-32 sm:w-32">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={profile.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(profile.name)
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold sm:text-3xl">
                    {profile.name}
                  </h1>
                  <CheckCircle2 size={18} className="text-gray-500" />
                </div>

                <p className="mt-1 text-sm text-gray-500">
                  {profile.username}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {subscriberCount === null
                    ? "Subscriber count unavailable"
                    : `${subscriberCount.toLocaleString()} subscribers`}{" "}
                  • {channelVideos.length} videos
                </p>

                <p className="mt-2 max-w-2xl text-sm text-gray-600">
                  {profile.description}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCustomizeOpen(true)}
                  className="flex items-center gap-2 rounded-full bg-black px-5 py-2 text-sm font-semibold text-white"
                >
                  <Edit3 size={16} />
                  Customize
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm"
                >
                  <Share2 size={17} />
                  Share
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 border-b border-gray-200 pb-4">
            <h2 className="text-xl font-bold">Videos</h2>
          </div>

          <div className="pt-6">
            {videosLoading ? (
              <div className="py-20 text-center text-sm text-gray-500">
                Loading videos...
              </div>
            ) : channelVideos.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {channelVideos.map((video) => (
                  <VideoCard
                    key={video.backendId || video.id}
                    video={video}
                  />
                ))}
              </div>
            ) : (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center">
                <Video size={48} className="text-gray-400" />
                <h2 className="mt-4 text-xl font-semibold">
                  No videos yet
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  Upload your first video to your channel.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/upload")}
                  className="mt-5 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Upload video
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function VideoCard({ video }: { video: VideoType }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(`/watch/${video.id}`)}
      className="group min-w-0 text-left"
    >
      <div className="relative aspect-video overflow-hidden rounded-xl bg-gray-200">
        {video.thumbnail ? (
          <img
            src={video.thumbnail}
            alt={video.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Video size={32} className="text-gray-400" />
          </div>
        )}
        <span className="absolute bottom-2 right-2 rounded bg-black px-2 py-1 text-xs text-white">
          {video.duration}
        </span>
      </div>

      <div className="mt-3">
        <h3 className="line-clamp-2 text-sm font-semibold">
          {video.title}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {video.views} • {video.time}
        </p>
      </div>
    </button>
  );
}

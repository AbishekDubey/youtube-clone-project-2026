
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

import {
  getMySubscriptions,
  unsubscribeFromChannel,
  type SubscribedChannel,
} from "@/lib/subscriptionApi";

import { videos } from "@/data/videos";

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscribedChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unsubscribing, setUnsubscribing] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadSubscriptions = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getMySubscriptions();

        if (isMounted) {
          setSubscriptions(response.channels || []);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load subscriptions."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSubscriptions();

    return () => {
      isMounted = false;
    };
  }, []);

  const latestVideos = useMemo(() => {
    const channelIds = new Set(
      subscriptions.map((channel) => channel._id)
    );

    return videos
      .filter((video) => {
        const videoChannelId = video.channelId;
        return videoChannelId
          ? channelIds.has(videoChannelId)
          : false;
      })
      .sort((a, b) => b.id - a.id);
  }, [subscriptions]);

  const handleUnsubscribe = async (channelId: string) => {
    try {
      setUnsubscribing(channelId);

      await unsubscribeFromChannel(channelId);

      setSubscriptions((previous) =>
        previous.filter((channel) => channel._id !== channelId)
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to unsubscribe. Please try again."
      );
    } finally {
      setUnsubscribing(null);
    }
  };

  return (
    <main className="min-h-screen bg-white text-black">
      <Header onMenuClick={() => {}} />

      <Sidebar isOpen={true} onClose={() => {}} />

      <MobileNav />

      <section className="pt-16 lg:ml-64">
        <div className="p-4 pb-20 sm:p-5 md:p-6 lg:pb-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold md:text-3xl">
              Subscriptions
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Latest videos from channels you follow
            </p>
          </div>

          {error && (
            <div className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[350px] items-center justify-center">
              <p className="text-sm text-gray-500">
                Loading your subscriptions...
              </p>
            </div>
          ) : subscriptions.length > 0 ? (
            <>
              {/* Subscribed Channels */}
              <section className="mb-10">
                <h2 className="mb-5 text-xl font-bold">
                  Your channels
                </h2>

                <div className="flex gap-6 overflow-x-auto pb-3">
                  {subscriptions.map((channel) => (
                    <div
                      key={channel._id}
                      className="flex min-w-[140px] shrink-0 flex-col items-center text-center"
                    >
                      <img
                        src={channel.avatar || "/default-avatar.png"}
                        alt={channel.name}
                        className="h-20 w-20 rounded-full object-cover"
                      />

                      <h3 className="mt-3 line-clamp-1 text-sm font-semibold">
                        {channel.name}
                      </h3>

                      <p className="mt-1 text-xs text-gray-500">
                        Subscribed channel
                      </p>

                      <button
                        type="button"
                        disabled={unsubscribing === channel._id}
                        onClick={() => handleUnsubscribe(channel._id)}
                        className="mt-3 rounded-full bg-gray-200 px-4 py-2 text-xs font-semibold hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {unsubscribing === channel._id
                          ? "Unsubscribing..."
                          : "Subscribed"}
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Latest Videos */}
              <section>
                <h2 className="mb-5 text-xl font-bold md:text-2xl">
                  Latest videos
                </h2>

                {latestVideos.length > 0 ? (
                  <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {latestVideos.map((video) => (
                      <Link
                        key={video.id}
                        href={`/watch/${video.id}`}
                        className="group min-w-0"
                      >
                        <div className="relative aspect-video overflow-hidden rounded-xl bg-gray-200">
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />

                          <span className="absolute bottom-2 right-2 rounded bg-black/90 px-1.5 py-0.5 text-xs text-white">
                            {video.duration}
                          </span>
                        </div>

                        <div className="mt-3 flex gap-3">
                          <img
                            src={video.avatar}
                            alt={video.channel}
                            loading="lazy"
                            className="h-10 w-10 shrink-0 rounded-full object-cover"
                          />

                          <div className="min-w-0">
                            <h3 className="line-clamp-2 text-sm font-semibold">
                              {video.title}
                            </h3>

                            <p className="mt-1 text-sm text-gray-600">
                              {video.channel}
                            </p>

                            <p className="text-sm text-gray-500">
                              {video.views} • {video.time}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-[250px] items-center justify-center text-center">
                    <div>
                      <h2 className="text-xl font-semibold">
                        No videos available
                      </h2>

                      <p className="mt-2 text-sm text-gray-500">
                        You are subscribed, but matching videos are not
                        available in the current video list.
                      </p>
                    </div>
                  </div>
                )}
              </section>
            </>
          ) : (
            <div className="flex min-h-[450px] items-center justify-center text-center">
              <div>
                <h2 className="text-2xl font-bold">
                  No subscriptions yet
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                  Open a video and click Subscribe to start building
                  your subscriptions.
                </p>

                <Link
                  href="/"
                  className="mt-5 inline-flex rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  Explore videos
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

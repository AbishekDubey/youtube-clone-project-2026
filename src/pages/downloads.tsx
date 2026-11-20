import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/router";
import {
  Download,
  FileVideo,
  Trash2,
  Crown,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

import { getCurrentUser } from "@/lib/auth";

import {
  DOWNLOAD_LIMITS,
  formatFileSize,
  getDownloadRecords,
  getRemainingQuota,
  getSubscriptionPlan,
  clearDownloadRecords,
  type DownloadRecord,
} from "@/lib/downloadStorage";

import type {
  SubscriptionPlan,
} from "@/lib/subscriptionStorage";

export default function DownloadsPage() {
  const router =
    useRouter();

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [userId, setUserId] =
    useState("");

  const [records, setRecords] =
    useState<DownloadRecord[]>(
      []
    );

  const [plan, setPlan] =
    useState<SubscriptionPlan>(
      "Free"
    );

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    if (!router.isReady) {
      return;
    }

    const user =
      getCurrentUser();

    if (!user) {
      router.replace(
        `/login?returnUrl=${encodeURIComponent(
          "/downloads"
        )}`
      );

      return;
    }

    const id =
      user.email;

    const currentPlan =
      getSubscriptionPlan();

    setUserId(id);
    setPlan(currentPlan);

    setRecords(
      getDownloadRecords(id)
    );

    setLoading(false);
  }, [
    router.isReady,
    router,
  ]);

  const quotaLimit =
    DOWNLOAD_LIMITS[plan];

  const quotaRemaining =
    userId
      ? getRemainingQuota(
          userId,
          plan
        )
      : quotaLimit;

  const quotaUsed =
    Math.max(
      0,
      quotaLimit -
        quotaRemaining
    );

  const quotaPercentage =
    quotaLimit > 0
      ? Math.min(
          100,
          (quotaUsed /
            quotaLimit) *
            100
        )
      : 0;

  const completedDownloads =
    useMemo(
      () =>
        records.filter(
          (record) =>
            record.status ===
            "completed"
        ),
      [records]
    );

  const handleClearHistory =
    () => {
      if (!userId) {
        return;
      }

      const confirmed =
        window.confirm(
          "Clear your complete download history?"
        );

      if (!confirmed) {
        return;
      }

      clearDownloadRecords(
        userId
      );

      setRecords([]);
    };

  if (
    !router.isReady ||
    loading
  ) {
    return (
      <main className="min-h-screen bg-white text-black">
        <Header
          onMenuClick={() =>
            setSidebarOpen(
              (previous) =>
                !previous
            )
          }
        />

        <div className="flex min-h-screen items-center justify-center pt-16">
          <p className="text-sm text-gray-500">
            Loading downloads...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <Header
        onMenuClick={() =>
          setSidebarOpen(
            (previous) =>
              !previous
          )
        }
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() =>
          setSidebarOpen(false)
        }
      />

      <MobileNav />

      <section
        className={`min-h-screen pt-16 transition-all duration-300 ${
          sidebarOpen
            ? "lg:ml-64"
            : ""
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Download
                  size={28}
                />

                <h1 className="text-2xl font-bold sm:text-3xl">
                  Downloads
                </h1>
              </div>

              <p className="mt-2 text-sm text-gray-500">
                Manage your downloaded videos and
                download quota.
              </p>
            </div>

            {records.length >
              0 && (
              <button
                type="button"
                onClick={
                  handleClearHistory
                }
                className="flex w-fit items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2
                  size={17}
                />
                Clear history
              </button>
            )}
          </div>

          {/* Plan + Quota */}
          <section className="mt-7 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100">
                  <Crown
                    size={22}
                  />
                </div>

                <div>
                  <p className="text-xs text-gray-500">
                    Current plan
                  </p>

                  <p className="text-lg font-bold">
                    {plan}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/subscriptions"
                  )
                }
                className="mt-5 rounded-full bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Manage subscription
              </button>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">
                    Daily download quota
                  </p>

                  <p className="mt-1 text-lg font-bold">
                    {quotaRemaining}{" "}
                    remaining
                  </p>
                </div>

                <p className="text-sm text-gray-500">
                  {quotaUsed}/
                  {quotaLimit}
                </p>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-black transition-all"
                  style={{
                    width: `${quotaPercentage}%`,
                  }}
                />
              </div>

              <p className="mt-3 text-xs text-gray-500">
                Your quota resets at the start of the next
                day.
              </p>
            </div>
          </section>

          {/* Notice */}
          {plan ===
            "Free" &&
            quotaRemaining ===
              0 && (
              <div className="mt-5 flex gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                <AlertCircle
                  size={20}
                  className="shrink-0 text-yellow-700"
                />

                <div>
                  <p className="text-sm font-semibold text-yellow-800">
                    Daily download limit reached
                  </p>

                  <p className="mt-1 text-xs text-yellow-700">
                    Free users can download up to{" "}
                    {DOWNLOAD_LIMITS.Free} video per day in
                    this demo.
                  </p>
                </div>
              </div>
            )}

          {/* Downloads */}
          <section className="mt-8">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Download history
              </h2>

              <span className="text-sm text-gray-500">
                {completedDownloads.length} completed
              </span>
            </div>

            {records.length > 0 ? (
              <div className="space-y-3">
                {records.map(
                  (record) => (
                    <DownloadCard
                      key={record.id}
                      record={record}
                    />
                  )
                )}
              </div>
            ) : (
              <div className="flex min-h-[350px] items-center justify-center rounded-2xl border border-dashed border-gray-300 text-center">
                <div>
                  <Download
                    size={48}
                    className="mx-auto text-gray-300"
                  />

                  <h3 className="mt-4 text-lg font-semibold">
                    No downloads yet
                  </h3>

                  <p className="mt-2 text-sm text-gray-500">
                    Videos that you download will appear here.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      router.push("/")
                    }
                    className="mt-5 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
                  >
                    Browse videos
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function DownloadCard({
  record,
}: {
  record: DownloadRecord;
}) {
  const statusSuccess =
    record.status ===
    "completed";

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row">
      {/* Thumbnail */}
      <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-gray-200 sm:w-48">
        {record.thumbnail ? (
          <img
            src={record.thumbnail}
            alt={record.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <FileVideo
              size={35}
              className="text-gray-400"
            />
          </div>
        )}
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-2 font-semibold">
          {record.title}
        </h3>

        <div className="mt-2 grid gap-1 text-xs text-gray-500 sm:grid-cols-2">
          <p>
            Downloaded:{" "}
            {new Date(
              record.downloadedAt
            ).toLocaleString()}
          </p>

          <p>
            File size:{" "}
            {formatFileSize(
              record.fileSize
            )}
          </p>

          <p>
            Plan:{" "}
            {record.subscriptionPlan}
          </p>

          <p>
            Remaining quota:{" "}
            {record.remainingQuota}
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
              statusSuccess
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {statusSuccess ? (
              <CheckCircle2
                size={13}
              />
            ) : (
              <AlertCircle
                size={13}
              />
            )}

            {record.status}
          </span>

          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium">
            {record.fileName}
          </span>
        </div>
      </div>
    </article>
  );
}
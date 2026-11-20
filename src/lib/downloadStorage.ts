import {
  getCurrentPlan,
  type SubscriptionPlan,
} from "@/lib/subscriptionStorage";

export type DownloadStatus =
  | "completed"
  | "failed"
  | "cancelled";

export type DownloadRecord = {
  id: string;
  userId: string;
  videoId: number;
  title: string;
  thumbnail: string;
  downloadedAt: string;
  status: DownloadStatus;
  fileSize: number;
  fileName: string;
  subscriptionPlan: SubscriptionPlan;
  quotaLimit: number;
  quotaUsed: number;
  remainingQuota: number;

  /*
   * Audit information.
   * These fields are best-effort on the client.
   * A real backend/database is required for trusted
   * IP logging and secure audit records.
   */
  ipAddress?: string;
  browser?: string;
  operatingSystem?: string;
  deviceType?: string;
  deviceModel?: string;
  location?: string;

  errorMessage?: string;
  startedAt?: string;
  updatedAt?: string;
};

type DownloadRecordInput =
  Omit<
    DownloadRecord,
    | "id"
    | "downloadedAt"
    | "quotaUsed"
    | "remainingQuota"
    | "subscriptionPlan"
    | "quotaLimit"
  > &
  Partial<
    Pick<
      DownloadRecord,
      "subscriptionPlan" | "quotaLimit"
    >
  >;

type FailedDownloadInput =
  Omit<
    DownloadRecord,
    | "id"
    | "downloadedAt"
    | "status"
    | "quotaUsed"
    | "remainingQuota"
    | "subscriptionPlan"
    | "quotaLimit"
  > &
  Partial<
    Pick<
      DownloadRecord,
      "subscriptionPlan" | "quotaLimit"
    >
  >;

export const DOWNLOAD_LIMITS: Record<
  SubscriptionPlan,
  number
> = {
  Free: 1,
  Bronze: 5,
  Silver: 10,
  Gold: 20,
};

const DOWNLOAD_KEY =
  "youtube_download_records";

const DOWNLOAD_LOCK_KEY =
  "youtube_download_locks";

const DUPLICATE_WINDOW_MS =
  24 * 60 * 60 * 1000;

const LOCK_TIMEOUT_MS =
  10 * 60 * 1000;

export function getSubscriptionPlan(): SubscriptionPlan {
  return getCurrentPlan();
}

function isSubscriptionPlan(
  value: unknown
): value is SubscriptionPlan {
  return (
    value === "Free" ||
    value === "Bronze" ||
    value === "Silver" ||
    value === "Gold"
  );
}

function isDownloadStatus(
  value: unknown
): value is DownloadStatus {
  return (
    value === "completed" ||
    value === "failed" ||
    value === "cancelled"
  );
}

function isValidDownloadRecord(
  value: unknown
): value is DownloadRecord {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const record =
    value as Partial<DownloadRecord>;

  return (
    typeof record.id === "string" &&
    typeof record.userId === "string" &&
    typeof record.videoId === "number" &&
    typeof record.title === "string" &&
    typeof record.thumbnail === "string" &&
    typeof record.downloadedAt === "string" &&
    isDownloadStatus(record.status) &&
    typeof record.fileSize === "number" &&
    typeof record.fileName === "string" &&
    isSubscriptionPlan(
      record.subscriptionPlan
    ) &&
    typeof record.quotaLimit ===
      "number" &&
    typeof record.quotaUsed ===
      "number" &&
    typeof record.remainingQuota ===
      "number"
  );
}

function getStoredRecords(): DownloadRecord[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  try {
    const data =
      localStorage.getItem(
        DOWNLOAD_KEY
      );

    if (!data) {
      return [];
    }

    const parsed =
      JSON.parse(data);

    if (
      !Array.isArray(parsed)
    ) {
      return [];
    }

    return parsed.filter(
      isValidDownloadRecord
    );
  } catch (error) {
    console.error(
      "Failed to load download records:",
      error
    );

    return [];
  }
}

function saveRecords(
  records: DownloadRecord[]
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return false;
  }

  try {
    localStorage.setItem(
      DOWNLOAD_KEY,
      JSON.stringify(records)
    );

    return true;
  } catch (error) {
    console.error(
      "Failed to save download records:",
      error
    );

    return false;
  }
}

function startOfToday() {
  const date =
    new Date();

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date.getTime();
}

function getRecordTime(
  record: DownloadRecord
) {
  const time =
    new Date(
      record.downloadedAt
    ).getTime();

  return Number.isFinite(time)
    ? time
    : 0;
}

function cleanupExpiredLocks() {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    const raw =
      localStorage.getItem(
        DOWNLOAD_LOCK_KEY
      );

    if (!raw) {
      return;
    }

    const locks =
      JSON.parse(raw);

    if (
      !locks ||
      typeof locks !==
        "object"
    ) {
      localStorage.removeItem(
        DOWNLOAD_LOCK_KEY
      );

      return;
    }

    const now =
      Date.now();

    const activeLocks =
      Object.fromEntries(
        Object.entries(
          locks
        ).filter(
          ([, value]) => {
            if (
              !value ||
              typeof value !==
                "object"
            ) {
              return false;
            }

            const createdAt =
              Number(
                (
                  value as {
                    createdAt?: number;
                  }
                ).createdAt
              );

            return (
              Number.isFinite(
                createdAt
              ) &&
              now - createdAt <
                LOCK_TIMEOUT_MS
            );
          }
        )
      );

    localStorage.setItem(
      DOWNLOAD_LOCK_KEY,
      JSON.stringify(
        activeLocks
      )
    );
  } catch {
    localStorage.removeItem(
      DOWNLOAD_LOCK_KEY
    );
  }
}

function getDownloadLockKey(
  userId: string,
  videoId: number
) {
  return `${userId}::${videoId}`;
}

function hasActiveDownloadLock(
  userId: string,
  videoId: number
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return false;
  }

  cleanupExpiredLocks();

  try {
    const raw =
      localStorage.getItem(
        DOWNLOAD_LOCK_KEY
      );

    if (!raw) {
      return false;
    }

    const locks =
      JSON.parse(raw);

    const lockKey =
      getDownloadLockKey(
        userId,
        videoId
      );

    const lock =
      locks?.[lockKey];

    if (
      !lock ||
      typeof lock !==
        "object"
    ) {
      return false;
    }

    const createdAt =
      Number(
        lock.createdAt
      );

    return (
      Number.isFinite(
        createdAt
      ) &&
      Date.now() -
        createdAt <
        LOCK_TIMEOUT_MS
    );
  } catch {
    return false;
  }
}

export function beginDownloadLock(
  userId: string,
  videoId: number
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return false;
  }

  cleanupExpiredLocks();

  if (
    hasActiveDownloadLock(
      userId,
      videoId
    )
  ) {
    return false;
  }

  try {
    const raw =
      localStorage.getItem(
        DOWNLOAD_LOCK_KEY
      );

    const locks =
      raw
        ? JSON.parse(raw)
        : {};

    locks[
      getDownloadLockKey(
        userId,
        videoId
      )
    ] = {
      createdAt:
        Date.now(),
      userId,
      videoId,
    };

    localStorage.setItem(
      DOWNLOAD_LOCK_KEY,
      JSON.stringify(
        locks
      )
    );

    return true;
  } catch {
    return false;
  }
}

export function endDownloadLock(
  userId: string,
  videoId: number
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    const raw =
      localStorage.getItem(
        DOWNLOAD_LOCK_KEY
      );

    if (!raw) {
      return;
    }

    const locks =
      JSON.parse(raw);

    delete locks[
      getDownloadLockKey(
        userId,
        videoId
      )
    ];

    localStorage.setItem(
      DOWNLOAD_LOCK_KEY,
      JSON.stringify(
        locks
      )
    );
  } catch {
    localStorage.removeItem(
      DOWNLOAD_LOCK_KEY
    );
  }
}

export function getTodayDownloads(
  userId: string
) {
  const today =
    startOfToday();

  return getStoredRecords()
    .filter(
      (record) =>
        record.userId ===
          userId &&
        getRecordTime(
          record
        ) >= today &&
        record.status ===
          "completed"
    )
    .sort(
      (a, b) =>
        getRecordTime(b) -
        getRecordTime(a)
    );
}

export function getTodayDownloadCount(
  userId: string
) {
  return getTodayDownloads(
    userId
  ).length;
}

export function getRemainingQuota(
  userId: string,
  plan?: SubscriptionPlan
) {
  const currentPlan =
    plan ??
    getSubscriptionPlan();

  const limit =
    DOWNLOAD_LIMITS[
      currentPlan
    ];

  const used =
    getTodayDownloadCount(
      userId
    );

  return Math.max(
    0,
    limit - used
  );
}

export function canDownloadVideo(
  userId: string,
  videoId: number,
  plan?: SubscriptionPlan
) {
  const currentPlan =
    plan ??
    getSubscriptionPlan();

  const todayDownloads =
    getTodayDownloads(
      userId
    );

  const alreadyDownloaded =
    todayDownloads.some(
      (record) =>
        record.videoId ===
        videoId
    );

  if (
    alreadyDownloaded
  ) {
    return {
      allowed: false,
      reason:
        "This video has already been downloaded today.",
    };
  }

  if (
    hasActiveDownloadLock(
      userId,
      videoId
    )
  ) {
    return {
      allowed: false,
      reason:
        "This video is already being downloaded. Please wait.",
    };
  }

  const limit =
    DOWNLOAD_LIMITS[
      currentPlan
    ];

  if (
    todayDownloads.length >=
    limit
  ) {
    return {
      allowed: false,
      reason:
        `Your ${currentPlan} plan has reached its daily download limit.`,
    };
  }

  return {
    allowed: true,
    reason: "",
  };
}

export function createDownloadRecord(
  data: DownloadRecordInput
) {
  const currentPlan =
    getSubscriptionPlan();

  const quotaLimit =
    DOWNLOAD_LIMITS[
      currentPlan
    ];

  const quotaUsed =
    getTodayDownloadCount(
      data.userId
    ) + 1;

  const now =
    new Date().toISOString();

  const record: DownloadRecord =
    {
      ...data,

      /*
       * Never trust plan/quota values supplied
       * by the caller. Always calculate from
       * the current subscription state.
       */
      subscriptionPlan:
        currentPlan,

      quotaLimit,

      id:
        `download_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 10)}`,

      downloadedAt:
        now,

      quotaUsed,

      remainingQuota:
        Math.max(
          0,
          quotaLimit -
            quotaUsed
        ),

      startedAt:
        data.startedAt ??
        now,

      updatedAt:
        now,
    };

  const records =
    getStoredRecords();

  /*
   * Final duplicate protection.
   */
  const duplicate =
    records.some(
      (existing) =>
        existing.userId ===
          data.userId &&
        existing.videoId ===
          data.videoId &&
        existing.status ===
          "completed" &&
        Date.now() -
          getRecordTime(
            existing
          ) <
          DUPLICATE_WINDOW_MS
    );

  if (duplicate) {
    endDownloadLock(
      data.userId,
      data.videoId
    );

    throw new Error(
      "This video has already been downloaded recently."
    );
  }

  const saved =
    saveRecords([
      record,
      ...records,
    ]);

  if (!saved) {
    endDownloadLock(
      data.userId,
      data.videoId
    );

    throw new Error(
      "Unable to save download record."
    );
  }

  endDownloadLock(
    data.userId,
    data.videoId
  );

  return record;
}

export function addFailedDownload(
  data: FailedDownloadInput
) {
  const currentPlan =
    getSubscriptionPlan();

  const quotaLimit =
    DOWNLOAD_LIMITS[
      currentPlan
    ];

  const now =
    new Date().toISOString();

  const record: DownloadRecord =
    {
      ...data,

      id:
        `download_failed_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 10)}`,

      downloadedAt:
        now,

      status:
        "failed",

      subscriptionPlan:
        currentPlan,

      quotaLimit,

      quotaUsed:
        getTodayDownloadCount(
          data.userId
        ),

      remainingQuota:
        getRemainingQuota(
          data.userId,
          currentPlan
        ),

      startedAt:
        data.startedAt ??
        now,

      updatedAt:
        now,

      errorMessage:
        data.errorMessage ??
        "Download failed.",
    };

  const records =
    getStoredRecords();

  const saved =
    saveRecords([
      record,
      ...records,
    ]);

  endDownloadLock(
    data.userId,
    data.videoId
  );

  if (!saved) {
    console.error(
      "Failed to save failed download record."
    );
  }

  return record;
}

export function addCancelledDownload(
  data: FailedDownloadInput
) {
  const currentPlan =
    getSubscriptionPlan();

  const quotaLimit =
    DOWNLOAD_LIMITS[
      currentPlan
    ];

  const now =
    new Date().toISOString();

  const record: DownloadRecord =
    {
      ...data,

      id:
        `download_cancelled_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 10)}`,

      downloadedAt:
        now,

      status:
        "cancelled",

      subscriptionPlan:
        currentPlan,

      quotaLimit,

      quotaUsed:
        getTodayDownloadCount(
          data.userId
        ),

      remainingQuota:
        getRemainingQuota(
          data.userId,
          currentPlan
        ),

      startedAt:
        data.startedAt ??
        now,

      updatedAt:
        now,

      errorMessage:
        data.errorMessage ??
        "Download cancelled.",
    };

  const records =
    getStoredRecords();

  saveRecords([
    record,
    ...records,
  ]);

  endDownloadLock(
    data.userId,
    data.videoId
  );

  return record;
}

export function getDownloadRecords(
  userId: string
) {
  return getStoredRecords()
    .filter(
      (record) =>
        record.userId ===
        userId
    )
    .sort(
      (a, b) =>
        getRecordTime(b) -
        getRecordTime(a)
    );
}

export function getAllDownloadRecords() {
  return getStoredRecords().sort(
    (a, b) =>
      getRecordTime(b) -
      getRecordTime(a)
  );
}

export function getDownloadRecord(
  downloadId: string
) {
  return getStoredRecords().find(
    (record) =>
      record.id ===
      downloadId
  );
}

export function getDownloadHistoryForVideo(
  userId: string,
  videoId: number
) {
  return getStoredRecords()
    .filter(
      (record) =>
        record.userId ===
          userId &&
        record.videoId ===
          videoId
    )
    .sort(
      (a, b) =>
        getRecordTime(b) -
        getRecordTime(a)
    );
}

export function clearDownloadRecords(
  userId: string
) {
  const records =
    getStoredRecords();

  const updated =
    records.filter(
      (record) =>
        record.userId !==
        userId
    );

  saveRecords(
    updated
  );
}

export function formatFileSize(
  bytes: number
) {
  if (
    !Number.isFinite(
      bytes
    ) ||
    bytes <= 0
  ) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
  ];

  const index =
    Math.min(
      units.length - 1,
      Math.floor(
        Math.log(bytes) /
          Math.log(1024)
      )
    );

  const size =
    bytes /
    Math.pow(
      1024,
      index
    );

  return `${size.toFixed(
    index === 0 ? 0 : 2
  )} ${units[index]}`;
}
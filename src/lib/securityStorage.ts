export type LoginEventType =
  | "login_attempt"
  | "login_success"
  | "otp_required"
  | "otp_success"
  | "otp_failed"
  | "device_removed";

export type LoginHistoryRecord = {
  id: string;
  userEmail: string;
  event: LoginEventType;
  timestamp: string;
  ipAddress: string;
  browser: string;
  browserVersion: string;
  operatingSystem: string;
  deviceType: "Desktop" | "Mobile" | "Tablet";
  deviceModel: string;
  city: string;
  state: string;
  country: string;
  approximateLocation: string;
  deviceId: string;
  success: boolean;
  message: string;
};

const LOGIN_HISTORY_KEY =
  "youtube_login_history";

function readJSON<T>(
  key: string,
  fallback: T
): T {
  if (
    typeof window ===
    "undefined"
  ) {
    return fallback;
  }

  try {
    const data =
      localStorage.getItem(
        key
      );

    if (!data) {
      return fallback;
    }

    return JSON.parse(
      data
    ) as T;
  } catch {
    return fallback;
  }
}

function saveJSON<T>(
  key: string,
  value: T
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  } catch (error) {
    console.error(
      `Failed to save ${key}:`,
      error
    );
  }
}

export function getLoginHistory(
  userEmail: string
) {
  return readJSON<
    LoginHistoryRecord[]
  >(
    LOGIN_HISTORY_KEY,
    []
  )
    .filter(
      (record) =>
        record.userEmail ===
        userEmail
    )
    .sort(
      (a, b) =>
        new Date(
          b.timestamp
        ).getTime() -
        new Date(
          a.timestamp
        ).getTime()
    );
}

export function getAllLoginHistory() {
  return readJSON<
    LoginHistoryRecord[]
  >(
    LOGIN_HISTORY_KEY,
    []
  );
}

export function addLoginHistory(
  record: Omit<
    LoginHistoryRecord,
    "id" | "timestamp"
  >
) {
  const history =
    getAllLoginHistory();

  const newRecord: LoginHistoryRecord =
    {
      ...record,
      id:
        `login_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 9)}`,
      timestamp:
        new Date().toISOString(),
    };

  saveJSON(
    LOGIN_HISTORY_KEY,
    [
      newRecord,
      ...history,
    ]
  );

  return newRecord;
}

export function clearLoginHistory(
  userEmail: string
) {
  const history =
    getAllLoginHistory();

  saveJSON(
    LOGIN_HISTORY_KEY,
    history.filter(
      (record) =>
        record.userEmail !==
        userEmail
    )
  );
}

export function getLoginStatistics(
  userEmail: string
) {
  const history =
    getLoginHistory(
      userEmail
    );

  return {
    total:
      history.length,

    successful:
      history.filter(
        (item) =>
          item.success
      ).length,

    failed:
      history.filter(
        (item) =>
          !item.success
      ).length,

    otpRequired:
      history.filter(
        (item) =>
          item.event ===
          "otp_required"
      ).length,

    otpFailed:
      history.filter(
        (item) =>
          item.event ===
          "otp_failed"
      ).length,

    trusted:
      history.filter(
        (item) =>
          item.event ===
          "otp_success"
      ).length,
  };
}
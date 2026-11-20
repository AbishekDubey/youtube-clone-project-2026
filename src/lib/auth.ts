export type User = {
  name: string;
  email: string;
};

export type LoginSession = {
  email: string;
  loginAt: string;
  deviceId: string;
  ipAddress?: string;
  browser?: string;
  browserVersion?: string;
  operatingSystem?: string;
  deviceType?: "Desktop" | "Mobile" | "Tablet";
  deviceModel?: string;
  city?: string;
  state?: string;
  country?: string;
  approximateLocation?: string;
};

export type LoginSecurityRecord = {
  id: string;
  email: string;
  type:
    | "login"
    | "failed-login"
    | "otp-sent"
    | "otp-success"
    | "otp-failed"
    | "trusted-device";
  timestamp: string;
  successful: boolean;
  deviceId: string;
  ipAddress?: string;
  browser?: string;
  browserVersion?: string;
  operatingSystem?: string;
  deviceType?: "Desktop" | "Mobile" | "Tablet";
  deviceModel?: string;
  city?: string;
  state?: string;
  country?: string;
  approximateLocation?: string;
  message?: string;
};

export type TrustedDevice = {
  id: string;
  deviceId: string;
  email: string;
  trustedAt: string;
  expiresAt: string;
  deviceName: string;
  browser?: string;
  browserVersion?: string;
  operatingSystem?: string;
  deviceType?: "Desktop" | "Mobile" | "Tablet";
  deviceModel?: string;
  ipAddress?: string;
  city?: string;
  state?: string;
  country?: string;
};

export type OTPChallenge = {
  email: string;
  code: string;
  createdAt: string;
  expiresAt: string;
  attempts: number;
  verified: boolean;
  purpose:
    | "login"
    | "security";
};

export type LoginContext = {
  deviceId?: string;
  ipAddress?: string;
  browser?: string;
  browserVersion?: string;
  operatingSystem?: string;
  deviceType?: "Desktop" | "Mobile" | "Tablet";
  deviceModel?: string;
  city?: string;
  state?: string;
  country?: string;
  approximateLocation?: string;
};

const AUTH_KEY =
  "youtube_current_user";

const SESSION_KEY =
  "youtube_login_session";

const LOGIN_ATTEMPTS_KEY =
  "youtube_login_attempts";

const LOGIN_SECURITY_KEY =
  "youtube_login_security_records";

const TRUSTED_DEVICES_KEY =
  "youtube_trusted_devices";

const OTP_KEY =
  "youtube_otp_challenge";

const DEVICE_ID_KEY =
  "youtube_device_id";

const MAX_LOGIN_ATTEMPTS = 5;

const LOGIN_BLOCK_TIME =
  10 * 60 * 1000;

const OTP_VALIDITY =
  5 * 60 * 1000;

const TRUSTED_DEVICE_VALIDITY =
  30 * 24 * 60 * 60 * 1000;

const MAX_OTP_ATTEMPTS = 5;

/* =========================================
   SAFE STORAGE HELPERS
========================================= */

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

function writeJSON<T>(
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
      JSON.stringify(
        value
      )
    );
  } catch (error) {
    console.error(
      "Unable to save local data:",
      error
    );
  }
}

/* =========================================
   DEVICE IDENTIFICATION
========================================= */

function generateDeviceId() {
  return `device_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

export function getOrCreateDeviceId() {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  const existing =
    localStorage.getItem(
      DEVICE_ID_KEY
    );

  if (existing) {
    return existing;
  }

  const deviceId =
    generateDeviceId();

  localStorage.setItem(
    DEVICE_ID_KEY,
    deviceId
  );

  return deviceId;
}

export function getStoredDeviceId() {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  return (
    localStorage.getItem(
      DEVICE_ID_KEY
    ) || ""
  );
}

/* =========================================
   BROWSER / DEVICE INFORMATION
========================================= */

function detectBrowser() {
  if (
    typeof navigator ===
    "undefined"
  ) {
    return {
      name: "Unknown",
      version: "",
    };
  }

  const userAgent =
    navigator.userAgent;

  const browsers = [
    {
      name: "Edge",
      regex:
        /Edg\/([\d.]+)/,
    },
    {
      name: "Opera",
      regex:
        /OPR\/([\d.]+)/,
    },
    {
      name: "Chrome",
      regex:
        /Chrome\/([\d.]+)/,
    },
    {
      name: "Firefox",
      regex:
        /Firefox\/([\d.]+)/,
    },
    {
      name: "Safari",
      regex:
        /Version\/([\d.]+).*Safari/,
    },
  ];

  for (const browser of browsers) {
    const match =
      userAgent.match(
        browser.regex
      );

    if (match) {
      return {
        name:
          browser.name,
        version:
          match[1],
      };
    }
  }

  return {
    name: "Unknown",
    version: "",
  };
}

function detectOperatingSystem() {
  if (
    typeof navigator ===
    "undefined"
  ) {
    return "Unknown";
  }

  const userAgent =
    navigator.userAgent;

  if (
    /Windows NT/i.test(
      userAgent
    )
  ) {
    return "Windows";
  }

  if (
    /Android/i.test(
      userAgent
    )
  ) {
    return "Android";
  }

  if (
    /iPhone|iPad|iPod/i.test(
      userAgent
    )
  ) {
    return "iOS";
  }

  if (
    /Mac OS X/i.test(
      userAgent
    )
  ) {
    return "macOS";
  }

  if (
    /Linux/i.test(
      userAgent
    )
  ) {
    return "Linux";
  }

  return "Unknown";
}

function detectDeviceType():
  | "Desktop"
  | "Mobile"
  | "Tablet" {
  if (
    typeof navigator ===
    "undefined"
  ) {
    return "Desktop";
  }

  const userAgent =
    navigator.userAgent;

  if (
    /iPad|Tablet/i.test(
      userAgent
    )
  ) {
    return "Tablet";
  }

  if (
    /Android|iPhone|iPod|Mobile/i.test(
      userAgent
    )
  ) {
    return "Mobile";
  }

  return "Desktop";
}

function detectDeviceModel() {
  if (
    typeof navigator ===
    "undefined"
  ) {
    return "Unknown";
  }

  const userAgent =
    navigator.userAgent;

  const androidMatch =
    userAgent.match(
      /Android [^;]+;\s*([^;)]+)/
    );

  if (
    androidMatch?.[1]
  ) {
    return androidMatch[1].trim();
  }

  if (
    /iPhone/i.test(
      userAgent
    )
  ) {
    return "iPhone";
  }

  if (
    /iPad/i.test(
      userAgent
    )
  ) {
    return "iPad";
  }

  if (
    /Macintosh/i.test(
      userAgent
    )
  ) {
    return "Mac";
  }

  if (
    /Windows/i.test(
      userAgent
    )
  ) {
    return "Windows PC";
  }

  return "Unknown";
}

export function getCurrentDeviceInfo(): LoginContext {
  const browser =
    detectBrowser();

  return {
    deviceId:
      getOrCreateDeviceId(),
    browser:
      browser.name,
    browserVersion:
      browser.version,
    operatingSystem:
      detectOperatingSystem(),
    deviceType:
      detectDeviceType(),
    deviceModel:
      detectDeviceModel(),
  };
}

/* =========================================
   LOGIN TIME / THEME
========================================= */

/*
 * Task 4:
 * 05:00 AM to 12:00 PM IST -> Light
 * all other times -> Dark
 */
export function getLoginTimeTheme():
  | "light"
  | "dark" {
  const now =
    new Date();

  const parts =
    new Intl.DateTimeFormat(
      "en-IN",
      {
        timeZone:
          "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }
    ).formatToParts(
      now
    );

  const hour =
    Number(
      parts.find(
        (part) =>
          part.type ===
          "hour"
      )?.value || 0
    );

  const minute =
    Number(
      parts.find(
        (part) =>
          part.type ===
          "minute"
      )?.value || 0
    );

  const totalMinutes =
    hour * 60 + minute;

  const start =
    5 * 60;

  const end =
    12 * 60;

  if (
    totalMinutes >=
      start &&
    totalMinutes <=
      end
  ) {
    return "light";
  }

  return "dark";
}

/* =========================================
   USER
========================================= */

export function getCurrentUser(): User | null {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  try {
    const data =
      localStorage.getItem(
        AUTH_KEY
      );

    if (!data) {
      return null;
    }

    const user =
      JSON.parse(
        data
      ) as User;

    if (
      !user ||
      typeof user.name !==
        "string" ||
      typeof user.email !==
        "string"
    ) {
      return null;
    }

    if (
      !user.name.trim() ||
      !user.email.trim()
    ) {
      return null;
    }

    return {
      name:
        user.name.trim(),
      email:
        user.email
          .trim()
          .toLowerCase(),
    };
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return (
    getCurrentUser() !==
    null
  );
}

/* =========================================
   SESSION
========================================= */

export function getLoginSession():
  | LoginSession
  | null {
  return readJSON<
    LoginSession | null
  >(
    SESSION_KEY,
    null
  );
}

/* =========================================
   LOGIN SECURITY LOG
========================================= */

function createSecurityId() {
  return `security_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function getLoginSecurityRecords(
  email?: string
) {
  const records =
    readJSON<
      LoginSecurityRecord[]
    >(
      LOGIN_SECURITY_KEY,
      []
    );

  return records
    .filter(
      (record) =>
        !email ||
        record.email
          .toLowerCase() ===
          email
            .toLowerCase()
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

export function addLoginSecurityRecord(
  data: Omit<
    LoginSecurityRecord,
    "id" | "timestamp"
  >
) {
  const records =
    readJSON<
      LoginSecurityRecord[]
    >(
      LOGIN_SECURITY_KEY,
      []
    );

  const record:
    LoginSecurityRecord =
    {
      ...data,
      id:
        createSecurityId(),
      timestamp:
        new Date().toISOString(),
    };

  writeJSON(
    LOGIN_SECURITY_KEY,
    [
      record,
      ...records,
    ].slice(0, 500)
  );

  return record;
}

/* =========================================
   LOGIN
========================================= */

export function loginUser(
  user: User,
  context:
    | string
    | LoginContext = ""
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const deviceInfo =
    typeof context ===
    "string"
      ? {
          ...getCurrentDeviceInfo(),
          deviceId:
            context ||
            getOrCreateDeviceId(),
        }
      : {
          ...getCurrentDeviceInfo(),
          ...context,
          deviceId:
            context.deviceId ||
            getOrCreateDeviceId(),
        };

  const loginAt =
    new Date().toISOString();

  const normalizedUser: User =
    {
      name:
        user.name.trim(),
      email:
        user.email
          .trim()
          .toLowerCase(),
    };

  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify(
      normalizedUser
    )
  );

  const session:
    LoginSession =
    {
      email:
        normalizedUser.email,
      loginAt,
      deviceId:
        deviceInfo.deviceId ||
        "",
      ipAddress:
        deviceInfo.ipAddress,
      browser:
        deviceInfo.browser,
      browserVersion:
        deviceInfo.browserVersion,
      operatingSystem:
        deviceInfo.operatingSystem,
      deviceType:
        deviceInfo.deviceType,
      deviceModel:
        deviceInfo.deviceModel,
      city:
        deviceInfo.city,
      state:
        deviceInfo.state,
      country:
        deviceInfo.country,
      approximateLocation:
        deviceInfo.approximateLocation,
    };

  writeJSON(
    SESSION_KEY,
    session
  );

  addLoginSecurityRecord({
    email:
      normalizedUser.email,
    type: "login",
    successful: true,
    deviceId:
      session.deviceId,
    ipAddress:
      session.ipAddress,
    browser:
      session.browser,
    browserVersion:
      session.browserVersion,
    operatingSystem:
      session.operatingSystem,
    deviceType:
      session.deviceType,
    deviceModel:
      session.deviceModel,
    city:
      session.city,
    state:
      session.state,
    country:
      session.country,
    approximateLocation:
      session.approximateLocation,
    message:
      "Login successful.",
  });

  return session;
}

/* =========================================
   LOGOUT
========================================= */

export function logoutUser() {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  localStorage.removeItem(
    AUTH_KEY
  );

  localStorage.removeItem(
    SESSION_KEY
  );

  localStorage.removeItem(
    OTP_KEY
  );
}

export function clearCurrentSession() {
  logoutUser();
}

/* =========================================
   LOGIN ATTEMPT PROTECTION
========================================= */

type LoginAttemptData = {
  count: number;
  blockedUntil: number;
};

function getLoginAttempts():
  LoginAttemptData {
  return readJSON(
    LOGIN_ATTEMPTS_KEY,
    {
      count: 0,
      blockedUntil: 0,
    }
  );
}

function saveLoginAttempts(
  data: LoginAttemptData
) {
  writeJSON(
    LOGIN_ATTEMPTS_KEY,
    data
  );
}

export function isLoginBlocked() {
  const attempts =
    getLoginAttempts();

  if (
    attempts.blockedUntil >
    Date.now()
  ) {
    return true;
  }

  if (
    attempts.blockedUntil !==
      0 &&
    attempts.blockedUntil <=
      Date.now()
  ) {
    saveLoginAttempts({
      count: 0,
      blockedUntil: 0,
    });
  }

  return false;
}

export function getLoginBlockRemaining() {
  const attempts =
    getLoginAttempts();

  if (
    attempts.blockedUntil <=
    Date.now()
  ) {
    return 0;
  }

  return Math.ceil(
    (attempts.blockedUntil -
      Date.now()) /
      1000
  );
}

export function recordFailedLogin(
  context: LoginContext = {}
) {
  const attempts =
    getLoginAttempts();

  const nextCount =
    attempts.count + 1;

  const deviceInfo =
    {
      ...getCurrentDeviceInfo(),
      ...context,
    };

  if (
    nextCount >=
    MAX_LOGIN_ATTEMPTS
  ) {
    saveLoginAttempts({
      count:
        nextCount,
      blockedUntil:
        Date.now() +
        LOGIN_BLOCK_TIME,
    });

    addLoginSecurityRecord({
      email:
        context
          .city ||
        "unknown",
      type:
        "failed-login",
      successful: false,
      deviceId:
        deviceInfo.deviceId ||
        "",
      ipAddress:
        deviceInfo.ipAddress,
      browser:
        deviceInfo.browser,
      browserVersion:
        deviceInfo.browserVersion,
      operatingSystem:
        deviceInfo.operatingSystem,
      deviceType:
        deviceInfo.deviceType,
      deviceModel:
        deviceInfo.deviceModel,
      city:
        deviceInfo.city,
      state:
        deviceInfo.state,
      country:
        deviceInfo.country,
      approximateLocation:
        deviceInfo.approximateLocation,
      message:
        "Login temporarily blocked after too many failed attempts.",
    });

    return {
      blocked: true,
      attemptsLeft: 0,
    };
  }

  saveLoginAttempts({
    count:
      nextCount,
    blockedUntil: 0,
  });

  return {
    blocked: false,
    attemptsLeft:
      MAX_LOGIN_ATTEMPTS -
      nextCount,
  };
}

export function resetLoginAttempts() {
  saveLoginAttempts({
    count: 0,
    blockedUntil: 0,
  });
}

/* =========================================
   TRUSTED DEVICES
========================================= */

function cleanupExpiredTrustedDevices() {
  const devices =
    readJSON<
      TrustedDevice[]
    >(
      TRUSTED_DEVICES_KEY,
      []
    );

  const now =
    Date.now();

  const active =
    devices.filter(
      (device) =>
        new Date(
          device.expiresAt
        ).getTime() >
        now
    );

  writeJSON(
    TRUSTED_DEVICES_KEY,
    active
  );

  return active;
}

export function getTrustedDevices(
  email?: string
) {
  return cleanupExpiredTrustedDevices()
    .filter(
      (device) =>
        !email ||
        device.email
          .toLowerCase() ===
          email
            .toLowerCase()
    )
    .sort(
      (a, b) =>
        new Date(
          b.trustedAt
        ).getTime() -
        new Date(
          a.trustedAt
        ).getTime()
    );
}

export function isDeviceTrusted(
  email: string,
  deviceId = getStoredDeviceId()
) {
  if (
    !email ||
    !deviceId
  ) {
    return false;
  }

  return getTrustedDevices(
    email
  ).some(
    (device) =>
      device.deviceId ===
      deviceId
  );
}

export function trustCurrentDevice(
  email: string,
  context: LoginContext = {}
) {
  if (
    !email
  ) {
    return null;
  }

  const deviceInfo =
    {
      ...getCurrentDeviceInfo(),
      ...context,
    };

  const devices =
    cleanupExpiredTrustedDevices();

  const now =
    new Date();

  const expiresAt =
    new Date(
      now.getTime() +
        TRUSTED_DEVICE_VALIDITY
    );

  const existingIndex =
    devices.findIndex(
      (device) =>
        device.email
          .toLowerCase() ===
          email
            .toLowerCase() &&
        device.deviceId ===
          deviceInfo.deviceId
    );

  const record:
    TrustedDevice =
    {
      id:
        `trusted_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 9)}`,
      deviceId:
        deviceInfo.deviceId ||
        getOrCreateDeviceId(),
      email:
        email
          .trim()
          .toLowerCase(),
      trustedAt:
        now.toISOString(),
      expiresAt:
        expiresAt.toISOString(),
      deviceName:
        `${deviceInfo.browser || "Unknown browser"} on ${
          deviceInfo.operatingSystem ||
          "Unknown OS"
        }`,
      browser:
        deviceInfo.browser,
      browserVersion:
        deviceInfo.browserVersion,
      operatingSystem:
        deviceInfo.operatingSystem,
      deviceType:
        deviceInfo.deviceType,
      deviceModel:
        deviceInfo.deviceModel,
      ipAddress:
        deviceInfo.ipAddress,
      city:
        deviceInfo.city,
      state:
        deviceInfo.state,
      country:
        deviceInfo.country,
    };

  if (
    existingIndex >=
    0
  ) {
    devices[
      existingIndex
    ] = record;
  } else {
    devices.unshift(
      record
    );
  }

  writeJSON(
    TRUSTED_DEVICES_KEY,
    devices.slice(0, 50)
  );

  addLoginSecurityRecord({
    email:
      record.email,
    type:
      "trusted-device",
    successful: true,
    deviceId:
      record.deviceId,
    ipAddress:
      record.ipAddress,
    browser:
      record.browser,
    browserVersion:
      record.browserVersion,
    operatingSystem:
      record.operatingSystem,
    deviceType:
      record.deviceType,
    deviceModel:
      record.deviceModel,
    city:
      record.city,
    state:
      record.state,
    country:
      record.country,
    message:
      "Device marked as trusted.",
  });

  return record;
}

export function revokeTrustedDevice(
  email: string,
  deviceId: string
) {
  const devices =
    cleanupExpiredTrustedDevices();

  const updated =
    devices.filter(
      (device) =>
        !(
          device.email
            .toLowerCase() ===
            email
              .toLowerCase() &&
          device.deviceId ===
            deviceId
        )
    );

  writeJSON(
    TRUSTED_DEVICES_KEY,
    updated
  );

  return (
    devices.length !==
    updated.length
  );
}

export function removeAllTrustedDevices(
  email: string
) {
  const devices =
    cleanupExpiredTrustedDevices();

  const updated =
    devices.filter(
      (device) =>
        device.email
          .toLowerCase() !==
        email
          .toLowerCase()
    );

  writeJSON(
    TRUSTED_DEVICES_KEY,
    updated
  );
}

/* =========================================
   OTP
========================================= */

function generateOTP() {
  return Math.floor(
    100000 +
      Math.random() *
        900000
  ).toString();
}

export function createOTPChallenge(
  email: string,
  purpose:
    | "login"
    | "security" = "login"
) {
  if (
    !email ||
    typeof window ===
      "undefined"
  ) {
    return null;
  }

  const now =
    Date.now();

  const challenge:
    OTPChallenge =
    {
      email:
        email
          .trim()
          .toLowerCase(),
      code:
        generateOTP(),
      createdAt:
        new Date(
          now
        ).toISOString(),
      expiresAt:
        new Date(
          now +
            OTP_VALIDITY
        ).toISOString(),
      attempts: 0,
      verified: false,
      purpose,
    };

  writeJSON(
    OTP_KEY,
    challenge
  );

  addLoginSecurityRecord({
    email:
      challenge.email,
    type:
      "otp-sent",
    successful: true,
    deviceId:
      getOrCreateDeviceId(),
    ...getCurrentDeviceInfo(),
    message:
      "OTP challenge created.",
  });

  /*
   * Development/demo only:
   * return the OTP so the existing frontend
   * can connect it to its email/OTP UI.
   *
   * In production this code must be sent
   * by a server-side email/SMS service and
   * never exposed to the browser.
   */
  return challenge;
}

export function getOTPChallenge():
  | OTPChallenge
  | null {
  const challenge =
    readJSON<
      OTPChallenge | null
    >(
      OTP_KEY,
      null
    );

  if (
    !challenge
  ) {
    return null;
  }

  if (
    new Date(
      challenge.expiresAt
    ).getTime() <=
    Date.now()
  ) {
    localStorage.removeItem(
      OTP_KEY
    );

    return null;
  }

  return challenge;
}

export function verifyOTP(
  email: string,
  code: string
) {
  const challenge =
    getOTPChallenge();

  if (
    !challenge
  ) {
    return {
      success: false,
      reason:
        "OTP has expired or does not exist.",
    };
  }

  if (
    challenge.email !==
    email
      .trim()
      .toLowerCase()
  ) {
    return {
      success: false,
      reason:
        "OTP does not belong to this account.",
    };
  }

  if (
    challenge.attempts >=
    MAX_OTP_ATTEMPTS
  ) {
    localStorage.removeItem(
      OTP_KEY
    );

    return {
      success: false,
      reason:
        "Too many OTP attempts. Please request a new OTP.",
    };
  }

  challenge.attempts +=
    1;

  if (
    code.trim() !==
    challenge.code
  ) {
    writeJSON(
      OTP_KEY,
      challenge
    );

    addLoginSecurityRecord({
      email:
        challenge.email,
      type:
        "otp-failed",
      successful: false,
      deviceId:
        getOrCreateDeviceId(),
      ...getCurrentDeviceInfo(),
      message:
        "Incorrect OTP entered.",
    });

    return {
      success: false,
      reason:
        "Incorrect OTP.",
      attemptsLeft:
        Math.max(
          0,
          MAX_OTP_ATTEMPTS -
            challenge.attempts
        ),
    };
  }

  challenge.verified =
    true;

  writeJSON(
    OTP_KEY,
    challenge
  );

  addLoginSecurityRecord({
    email:
      challenge.email,
    type:
      "otp-success",
    successful: true,
    deviceId:
      getOrCreateDeviceId(),
    ...getCurrentDeviceInfo(),
    message:
      "OTP verification successful.",
  });

  return {
    success: true,
    reason:
      "OTP verified successfully.",
  };
}

export function clearOTPChallenge() {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  localStorage.removeItem(
    OTP_KEY
  );
}

/* =========================================
   NEW LOGIN CHECK
========================================= */

export function requiresOTPForLogin(
  email: string,
  context: LoginContext = {}
) {
  const deviceInfo =
    {
      ...getCurrentDeviceInfo(),
      ...context,
    };

  return !isDeviceTrusted(
    email,
    deviceInfo.deviceId
  );
}

/* =========================================
   SECURITY UTILITIES
========================================= */

export function getCurrentSecurityContext() {
  const session =
    getLoginSession();

  return {
    ...getCurrentDeviceInfo(),
    ...(session || {}),
  };
}

export function clearSecurityHistory() {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  localStorage.removeItem(
    LOGIN_SECURITY_KEY
  );

  localStorage.removeItem(
    TRUSTED_DEVICES_KEY
  );

  localStorage.removeItem(
    OTP_KEY
  );
}
export type DeviceInfo = {
  id: string;
  userEmail: string;
  deviceName: string;
  browser: string;
  operatingSystem: string;
  ipAddress: string;
  location: string;
  createdAt: string;
  lastActiveAt: string;
  trusted: boolean;
  current: boolean;
};

export type OTPChallenge = {
  id: string;
  userEmail: string;
  deviceId: string;
  code: string;
  createdAt: number;
  expiresAt: number;
  verified: boolean;
};

const DEVICES_KEY =
  "youtube_trusted_devices";

const OTP_KEY =
  "youtube_otp_challenge";

const OTP_EXPIRY =
  5 * 60 * 1000;

const OTP_COOLDOWN =
  60 * 1000;

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
      localStorage.getItem(key);

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
      JSON.stringify(value)
    );
  } catch (error) {
    console.error(
      `Failed to save ${key}:`,
      error
    );
  }
}

/* =========================================
   DEVICE ID
========================================= */

export function getDeviceId() {
  if (
    typeof window ===
    "undefined"
  ) {
    return "server";
  }

  const raw = [
    navigator.userAgent,
    navigator.language,
    navigator.platform,
    window.screen.width,
    window.screen.height,
    window.devicePixelRatio,
    Intl.DateTimeFormat()
      .resolvedOptions()
      .timeZone,
  ].join("|");

  let hash = 0;

  for (
    let index = 0;
    index < raw.length;
    index++
  ) {
    hash =
      (hash << 5) -
      hash +
      raw.charCodeAt(index);

    hash |= 0;
  }

  return `device_${Math.abs(
    hash
  )}`;
}

/* =========================================
   BROWSER
========================================= */

export function getBrowserName() {
  if (
    typeof navigator ===
    "undefined"
  ) {
    return "Unknown";
  }

  const userAgent =
    navigator.userAgent;

  if (
    /Edg/i.test(
      userAgent
    )
  ) {
    return "Microsoft Edge";
  }

  if (
    /Chrome/i.test(
      userAgent
    ) &&
    !/Edg/i.test(
      userAgent
    )
  ) {
    return "Google Chrome";
  }

  if (
    /Firefox/i.test(
      userAgent
    )
  ) {
    return "Mozilla Firefox";
  }

  if (
    /Safari/i.test(
      userAgent
    ) &&
    !/Chrome/i.test(
      userAgent
    )
  ) {
    return "Safari";
  }

  return "Unknown Browser";
}

/* =========================================
   OPERATING SYSTEM
========================================= */

export function getOperatingSystem() {
  if (
    typeof navigator ===
    "undefined"
  ) {
    return "Unknown";
  }

  const userAgent =
    navigator.userAgent;

  if (
    /Windows/i.test(
      userAgent
    )
  ) {
    return "Windows";
  }

  if (
    /Mac OS X/i.test(
      userAgent
    )
  ) {
    return "macOS";
  }

  if (
    /Android/i.test(
      userAgent
    )
  ) {
    return "Android";
  }

  if (
    /iPhone|iPad/i.test(
      userAgent
    )
  ) {
    return "iOS";
  }

  if (
    /Linux/i.test(
      userAgent
    )
  ) {
    return "Linux";
  }

  return "Unknown OS";
}

/* =========================================
   DEVICE NAME
========================================= */

export function getDeviceName() {
  return `${getOperatingSystem()} • ${getBrowserName()}`;
}

/* =========================================
   DEVICE STORAGE
========================================= */

function getStoredDevices(): DeviceInfo[] {
  return readJSON<
    DeviceInfo[]
  >(
    DEVICES_KEY,
    []
  );
}

function saveDevices(
  devices: DeviceInfo[]
) {
  writeJSON(
    DEVICES_KEY,
    devices
  );
}

/* =========================================
   GET USER DEVICES
========================================= */

export function getUserDevices(
  userEmail: string
) {
  return getStoredDevices()
    .filter(
      (device) =>
        device.userEmail ===
        userEmail
    )
    .sort(
      (a, b) =>
        new Date(
          b.lastActiveAt
        ).getTime() -
        new Date(
          a.lastActiveAt
        ).getTime()
    );
}

/* =========================================
   GET CURRENT DEVICE
========================================= */

export function getCurrentDevice(
  userEmail: string
) {
  const deviceId =
    getDeviceId();

  return getStoredDevices().find(
    (device) =>
      device.userEmail ===
        userEmail &&
      device.id ===
        deviceId
  ) || null;
}

/* =========================================
   CREATE / UPDATE DEVICE
========================================= */

export function createDevice(
  userEmail: string,
  ipAddress = "Unknown",
  location = "Unknown"
) {
  const deviceId =
    getDeviceId();

  const now =
    new Date().toISOString();

  const devices =
    getStoredDevices();

  const existing =
    devices.find(
      (device) =>
        device.userEmail ===
          userEmail &&
        device.id ===
          deviceId
    );

  if (existing) {
    const updated =
      devices.map(
        (device) => {
          if (
            device.userEmail ===
              userEmail &&
            device.id ===
              deviceId
          ) {
            return {
              ...device,
              ipAddress,
              location,
              lastActiveAt:
                now,
              current: true,
            };
          }

          return {
            ...device,
            current: false,
          };
        }
      );

    saveDevices(
      updated
    );

    return (
      updated.find(
        (device) =>
          device.userEmail ===
            userEmail &&
          device.id ===
            deviceId
      ) || null
    );
  }

  const updated =
    devices.map(
      (device) => ({
        ...device,
        current: false,
      })
    );

  const newDevice: DeviceInfo =
    {
      id: deviceId,
      userEmail,
      deviceName:
        getDeviceName(),
      browser:
        getBrowserName(),
      operatingSystem:
        getOperatingSystem(),
      ipAddress,
      location,
      createdAt: now,
      lastActiveAt: now,
      trusted: false,
      current: true,
    };

  saveDevices([
    ...updated,
    newDevice,
  ]);

  return newDevice;
}

/* =========================================
   TRUST CHECK
========================================= */

export function isDeviceTrusted(
  userEmail: string,
  deviceId: string
) {
  return getStoredDevices().some(
    (device) =>
      device.userEmail ===
        userEmail &&
      device.id ===
        deviceId &&
      device.trusted
  );
}

/*
 * Device + IP + Location check.
 *
 * A trusted device is only treated as
 * trusted for login when the known IP
 * and location also match.
 */
export function isDeviceTrustedForLogin(
  userEmail: string,
  deviceId: string,
  ipAddress: string,
  location: string
) {
  const device =
    getStoredDevices().find(
      (item) =>
        item.userEmail ===
          userEmail &&
        item.id ===
          deviceId
    );

  if (!device) {
    return false;
  }

  if (!device.trusted) {
    return false;
  }

  /*
   * When an old record did not contain
   * IP/location, require verification.
   */
  if (
    !device.ipAddress ||
    device.ipAddress ===
      "Unknown"
  ) {
    return false;
  }

  /*
   * Unknown incoming IP/location should
   * not automatically bypass verification.
   */
  if (
    !ipAddress ||
    ipAddress === "Unknown"
  ) {
    return false;
  }

  if (
    !location ||
    location === "Unknown"
  ) {
    return false;
  }

  const sameIp =
    device.ipAddress ===
    ipAddress;

  const sameLocation =
    device.location ===
    location;

  return (
    sameIp &&
    sameLocation
  );
}

/* =========================================
   TRUST DEVICE
========================================= */

export function trustDevice(
  userEmail: string,
  deviceId: string
) {
  const devices =
    getStoredDevices();

  const updated =
    devices.map(
      (device) => {
        if (
          device.userEmail ===
            userEmail &&
          device.id ===
            deviceId
        ) {
          return {
            ...device,
            trusted: true,
          };
        }

        return device;
      }
    );

  saveDevices(
    updated
  );

  return true;
}

/* =========================================
   UPDATE DEVICE SECURITY DATA
========================================= */

export function updateDeviceSecurityInfo(
  userEmail: string,
  deviceId: string,
  ipAddress: string,
  location: string
) {
  const devices =
    getStoredDevices();

  const now =
    new Date().toISOString();

  const updated =
    devices.map(
      (device) => {
        if (
          device.userEmail ===
            userEmail &&
          device.id ===
            deviceId
        ) {
          return {
            ...device,
            ipAddress,
            location,
            lastActiveAt:
              now,
            current: true,
          };
        }

        return {
          ...device,
          current: false,
        };
      }
    );

  saveDevices(
    updated
  );

  return (
    updated.find(
      (device) =>
        device.userEmail ===
          userEmail &&
        device.id ===
          deviceId
    ) || null
  );
}

/* =========================================
   REMOVE / REVOKE DEVICE
========================================= */

export function revokeTrustedDevice(
  userEmail: string,
  deviceId: string
) {
  const devices =
    getStoredDevices();

  const updated =
    devices.filter(
      (device) =>
        !(
          device.userEmail ===
            userEmail &&
          device.id ===
            deviceId
        )
    );

  saveDevices(
    updated
  );

  return true;
}

/* =========================================
   OTP
========================================= */

export function getOTPChallenge():
  | OTPChallenge
  | null {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  const challenge =
    readJSON<
      OTPChallenge | null
    >(
      OTP_KEY,
      null
    );

  if (!challenge) {
    return null;
  }

  if (
    challenge.expiresAt <=
    Date.now()
  ) {
    localStorage.removeItem(
      OTP_KEY
    );

    return null;
  }

  return challenge;
}

export function canRequestOTP() {
  const challenge =
    getOTPChallenge();

  if (!challenge) {
    return true;
  }

  return (
    Date.now() -
      challenge.createdAt >=
    OTP_COOLDOWN
  );
}

export function createOTPChallenge(
  userEmail: string,
  deviceId: string
) {
  if (
    !canRequestOTP()
  ) {
    return null;
  }

  const code =
    Math.floor(
      100000 +
        Math.random() *
          900000
    ).toString();

  const now =
    Date.now();

  const challenge: OTPChallenge =
    {
      id:
        `otp_${now}_${Math.random()
          .toString(36)
          .slice(2, 8)}`,
      userEmail,
      deviceId,
      code,
      createdAt:
        now,
      expiresAt:
        now +
        OTP_EXPIRY,
      verified: false,
    };

  writeJSON(
    OTP_KEY,
    challenge
  );

  return challenge;
}

export function verifyOTP(
  code: string
) {
  const challenge =
    getOTPChallenge();

  if (!challenge) {
    return {
      success: false,
      reason:
        "OTP expired. Please request a new OTP.",
    };
  }

  if (
    challenge.verified
  ) {
    return {
      success: false,
      reason:
        "This OTP has already been used.",
    };
  }

  if (
    challenge.code !==
    code.trim()
  ) {
    return {
      success: false,
      reason:
        "Invalid OTP.",
    };
  }

  const verifiedChallenge: OTPChallenge =
    {
      ...challenge,
      verified: true,
    };

  writeJSON(
    OTP_KEY,
    verifiedChallenge
  );

  return {
    success: true,
    reason:
      "OTP verified successfully.",
    challenge:
      verifiedChallenge,
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
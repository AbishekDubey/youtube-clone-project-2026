import type {
  NextApiRequest,
  NextApiResponse,
} from "next";

import { isIP } from "node:net";

type LocationInfo = {
  city: string;
  state: string;
  country: string;
  timezone: string;
};

type DeviceInfoResponse = {
  success: boolean;
  ipAddress: string;
  location: LocationInfo;
  userAgent: string;
};

type ErrorResponse = {
  success: false;
  error: string;
};

type ResponseData =
  | DeviceInfoResponse
  | ErrorResponse;

type GeoResponse = {
  ip?: string;
  city?: string;
  region?: string;
  region_code?: string;
  country_name?: string;
  country_code?: string;
  timezone?: string;
};

function getClientIp(
  req: NextApiRequest
) {
  const forwarded =
    req.headers[
      "x-forwarded-for"
    ];

  if (
    typeof forwarded ===
    "string"
  ) {
    const firstIp =
      forwarded
        .split(",")[0]
        ?.trim();

    if (
      firstIp &&
      isIP(firstIp)
    ) {
      return firstIp;
    }
  }

  const realIp =
    req.headers[
      "x-real-ip"
    ];

  if (
    typeof realIp ===
      "string" &&
    isIP(realIp)
  ) {
    return realIp;
  }

  const socketIp =
    req.socket.remoteAddress;

  if (
    socketIp &&
    isIP(socketIp)
  ) {
    return socketIp;
  }

  return "";
}

function isLocalIp(
  ip: string
) {
  if (!ip) {
    return true;
  }

  if (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "localhost"
  ) {
    return true;
  }

  if (
    /^10\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(
      ip
    )
  ) {
    return true;
  }

  return false;
}

async function lookupIp(
  ip: string
): Promise<GeoResponse> {
  const endpoint =
    !isLocalIp(ip) &&
    isIP(ip)
      ? `https://ipapi.co/${encodeURIComponent(
          ip
        )}/json/`
      : "https://ipapi.co/json/";

  const response =
    await fetch(
      endpoint,
      {
        headers: {
          Accept:
            "application/json",
          "User-Agent":
            "YouTube-Clone-Security/1.0",
        },
      }
    );

  if (!response.ok) {
    throw new Error(
      `Geo lookup failed: ${response.status}`
    );
  }

  return (await response.json()) as GeoResponse;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (
    req.method !==
    "GET"
  ) {
    return res
      .status(405)
      .json({
        success: false,
        error:
          "Method not allowed.",
      });
  }

  try {
    const requestIp =
      getClientIp(req);

    const geo =
      await lookupIp(
        requestIp
      );

    const ipAddress =
      geo.ip ||
      requestIp ||
      "Unknown";

    return res
      .status(200)
      .json({
        success: true,
        ipAddress,
        location: {
          city:
            geo.city ||
            "Unknown",
          state:
            geo.region ||
            "Unknown",
          country:
            geo.country_name ||
            "Unknown",
          timezone:
            geo.timezone ||
            "Unknown",
        },
        userAgent:
          typeof req
            .headers[
            "user-agent"
          ] === "string"
            ? req.headers[
                "user-agent"
              ]
            : "Unknown",
      });
  } catch (error) {
    console.error(
      "Device information error:",
      error
    );

    const fallbackIp =
      getClientIp(
        req
      );

    return res
      .status(200)
      .json({
        success: true,
        ipAddress:
          fallbackIp ||
          "Unknown",
        location: {
          city:
            "Unknown",
          state:
            "Unknown",
          country:
            "Unknown",
          timezone:
            "Unknown",
        },
        userAgent:
          typeof req
            .headers[
            "user-agent"
          ] === "string"
            ? req.headers[
                "user-agent"
              ]
            : "Unknown",
      });
  }
}
import type {
  NextApiRequest,
  NextApiResponse,
} from "next";

import fs from "fs";
import path from "path";
import { Readable } from "stream";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  /* =========================================
     ONLY GET REQUEST
  ========================================= */

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  /* =========================================
     GET VIDEO URL
  ========================================= */

  const { url } = req.query;

  if (!url || typeof url !== "string") {
    return res.status(400).json({
      success: false,
      message: "Video URL is required",
    });
  }

  console.log(
    "[download] Requested URL:",
    url
  );

  try {
    /* =========================================
       LOCAL NEXT.JS PUBLIC VIDEO
       
       Example:
       /test-video.mp4
       
       We directly read it from:
       D:\YOUTUBE\youtube-next\public\test-video.mp4
    ========================================= */

    if (url.startsWith("/")) {
      const cleanPath = url.split("?")[0];

      if (
        cleanPath.includes("..") ||
        cleanPath.includes("\\")
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid video path",
        });
      }

      const publicDirectory =
        path.join(
          process.cwd(),
          "public"
        );

      const filePath =
        path.join(
          publicDirectory,
          cleanPath.substring(1)
        );

      console.log(
        "[download] Local file:",
        filePath
      );

      /* =====================================
         CHECK FILE
      ===================================== */

      if (!fs.existsSync(filePath)) {
        console.error(
          "[download] File not found:",
          filePath
        );

        return res.status(404).json({
          success: false,
          message:
            "Video file not found",
        });
      }

      const stats =
        fs.statSync(filePath);

      if (!stats.isFile()) {
        return res.status(400).json({
          success: false,
          message:
            "Requested path is not a video file",
        });
      }

      /* =====================================
         DETERMINE CONTENT TYPE
      ===================================== */

      const extension =
        path
          .extname(filePath)
          .toLowerCase();

      let contentType =
        "application/octet-stream";

      if (extension === ".mp4") {
        contentType = "video/mp4";
      } else if (
        extension === ".webm"
      ) {
        contentType = "video/webm";
      } else if (
        extension === ".mov"
      ) {
        contentType = "video/quicktime";
      } else if (
        extension === ".mkv"
      ) {
        contentType =
          "video/x-matroska";
      }

      /* =====================================
         FILE NAME
      ===================================== */

      const originalName =
        path.basename(filePath);

      const safeFileName =
        originalName.replace(
          /[^a-zA-Z0-9._-]/g,
          "_"
        );

      /* =====================================
         RESPONSE HEADERS
      ===================================== */

      res.statusCode = 200;

      res.setHeader(
        "Content-Type",
        contentType
      );

      res.setHeader(
        "Content-Length",
        stats.size
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeFileName}"`
      );

      res.setHeader(
        "Cache-Control",
        "no-cache"
      );

      /* =====================================
         STREAM LOCAL FILE
      ===================================== */

      const fileStream =
        fs.createReadStream(
          filePath
        );

      fileStream.on(
        "error",
        (error) => {
          console.error(
            "[download] File stream error:",
            error
          );

          if (
            !res.headersSent
          ) {
            res.status(500).json({
              success: false,
              message:
                "Failed to read video file",
            });
          } else {
            res.end();
          }
        }
      );

      fileStream.pipe(res);

      return;
    }

    /* =========================================
       EXTERNAL VIDEO URL
       
       Example:
       https://example.com/video.mp4
    ========================================= */

    const videoResponse =
      await fetch(url);

    console.log(
      "[download] External response:",
      videoResponse.status,
      videoResponse.statusText
    );

    if (!videoResponse.ok) {
      return res.status(
        videoResponse.status
      ).json({
        success: false,
        message:
          "Unable to download video",
      });
    }

    /* =========================================
       CONTENT TYPE
    ========================================= */

    const contentType =
      videoResponse.headers.get(
        "content-type"
      ) || "video/mp4";

    const contentLength =
      videoResponse.headers.get(
        "content-length"
      );

    /* =========================================
       HEADERS
    ========================================= */

    res.setHeader(
      "Content-Type",
      contentType
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="youtube-clone-video.mp4"'
    );

    if (contentLength) {
      res.setHeader(
        "Content-Length",
        contentLength
      );
    }

    /* =========================================
       CHECK BODY
    ========================================= */

    if (!videoResponse.body) {
      return res.status(500).json({
        success: false,
        message:
          "Video stream unavailable",
      });
    }

    /* =========================================
       STREAM EXTERNAL VIDEO
    ========================================= */

    const nodeStream =
      Readable.fromWeb(
        videoResponse.body as any
      );

    nodeStream.pipe(res);
  } catch (error) {
    console.error(
      "[download] Download error:",
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message:
          "Failed to download video",
      });
    }

    res.end();
  }
}
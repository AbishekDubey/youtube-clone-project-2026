
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, SyntheticEvent } from "react";
import { useRouter } from "next/router";
import {
  Upload,
  Image as ImageIcon,
  Video as VideoIcon,
  CheckCircle2,
  X,
} from "lucide-react";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

import {
  getCurrentBackendUser,
  getBackendToken,
} from "@/lib/backendAuth";

import { getCurrentUser } from "@/lib/auth";

const BACKEND_API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
  "http://localhost:5000";

const VIDEOS_API_URL = `${BACKEND_API_URL}/api/videos`;

const MAX_VIDEO_SIZE = 1024 * 1024 * 1024;
const MAX_THUMBNAIL_SIZE = 10 * 1024 * 1024;
const CHUNK_SIZE = 20 * 1024 * 1024;

const categories = [
  "Programming",
  "React",
  "Next.js",
  "JavaScript",
  "Web Development",
  "Education",
  "Music",
  "Gaming",
  "Sports",
  "Technology",
  "AI",
  "News",
  "Travel",
  "Cooking",
  "Comedy",
  "Movies",
];

type CloudinarySignature = {
  success: boolean;
  signature: string;
  timestamp: number;
  folder: string;
  cloudName: string;
  apiKey: string;
  message?: string;
};

type CloudinaryUploadResponse = {
  secure_url?: string;
  public_id?: string;
  done?: boolean;
  error?: {
    message?: string;
  };
};

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes
      .toString()
      .padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

function isValidVideo(file: File) {
  return (
    file.type.startsWith("video/") ||
    /\.(mp4|webm|mov|m4v|mkv|avi)$/i.test(file.name)
  );
}

function isValidImage(file: File) {
  return (
    file.type.startsWith("image/") ||
    /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name)
  );
}

async function getCloudinarySignature(token: string) {
  const response = await fetch(
    `${VIDEOS_API_URL}/cloudinary-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = (await response.json()) as CloudinarySignature;

  if (!response.ok || !data.success) {
    throw new Error(
      data.message || "Unable to prepare Cloudinary upload."
    );
  }

  return data;
}

// Normal upload for thumbnail images.
async function uploadImageToCloudinary(
  file: File,
  token: string
) {
  const signatureData = await getCloudinarySignature(token);

  const formData = new FormData();

  formData.append("file", file);
  formData.append("api_key", signatureData.apiKey);
  formData.append("timestamp", String(signatureData.timestamp));
  formData.append("signature", signatureData.signature);
  formData.append("folder", signatureData.folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const data =
    (await response.json()) as CloudinaryUploadResponse;

  if (!response.ok || !data.secure_url || !data.public_id) {
    throw new Error(
      data.error?.message || "Thumbnail upload failed."
    );
  }

  return {
    secureUrl: data.secure_url,
    publicId: data.public_id,
  };
}

// Chunked upload for large video files.
async function uploadVideoToCloudinary(
  file: File,
  token: string,
  onProgress: (percentage: number) => void,
  activeRequest: React.MutableRefObject<XMLHttpRequest | null>,
  cancelRef: React.MutableRefObject<boolean>
) {
  const signatureData = await getCloudinarySignature(token);

  const uploadUrl =
    `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/video/upload`;

  const uploadId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  let start = 0;

  while (start < file.size) {
    if (cancelRef.current) {
      throw new Error("Upload cancelled.");
    }

    const end = Math.min(start + CHUNK_SIZE, file.size) - 1;
    const chunk = file.slice(start, end + 1);

    const formData = new FormData();

    formData.append("file", chunk, file.name);
    formData.append("api_key", signatureData.apiKey);
    formData.append("timestamp", String(signatureData.timestamp));
    formData.append("signature", signatureData.signature);
    formData.append("folder", signatureData.folder);

    const result = await new Promise<CloudinaryUploadResponse>(
      (resolve, reject) => {
        const xhr = new XMLHttpRequest();

        activeRequest.current = xhr;

        xhr.open("POST", uploadUrl);

        xhr.setRequestHeader(
          "X-Unique-Upload-Id",
          uploadId
        );

        xhr.setRequestHeader(
          "Content-Range",
          `bytes ${start}-${end}/${file.size}`
        );

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentage = Math.round(
              ((start + event.loaded) / file.size) * 100
            );

            onProgress(Math.min(percentage, 100));
          }
        };

        xhr.onload = () => {
          activeRequest.current = null;

          let response: CloudinaryUploadResponse;

          try {
            response = JSON.parse(xhr.responseText);
          } catch {
            reject(
              new Error("Invalid response received from Cloudinary.")
            );
            return;
          }

          if (xhr.status < 200 || xhr.status >= 300) {
            reject(
              new Error(
                response.error?.message ||
                  `Cloudinary upload failed (${xhr.status}).`
              )
            );
            return;
          }

          if (response.error) {
            reject(
              new Error(
                response.error.message || "Cloudinary upload failed."
              )
            );
            return;
          }

          resolve(response);
        };

        xhr.onerror = () => {
          activeRequest.current = null;

          reject(
            new Error("Network error during video upload.")
          );
        };

        xhr.onabort = () => {
          activeRequest.current = null;
          reject(new Error("Upload cancelled."));
        };

        xhr.send(formData);
      }
    );

    start = end + 1;

    if (start === file.size) {
      if (!result.secure_url || !result.public_id) {
        throw new Error(
          "Cloudinary did not return the final uploaded video."
        );
      }

      onProgress(100);

      return {
        secureUrl: result.secure_url,
        publicId: result.public_id,
      };
    }
  }

  throw new Error("Video upload could not be completed.");
}

export default function UploadPage() {
  const router = useRouter();

  const [checkingAuth, setCheckingAuth] = useState(true);

  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);

  const [videoPreview, setVideoPreview] = useState("");
  const [thumbnailPreview, setThumbnailPreview] = useState("");

  const [videoDuration, setVideoDuration] = useState("0:00");
  const [durationReady, setDurationReady] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [category, setCategory] = useState("Programming");
  const [visibility, setVisibility] = useState("Public");

  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const [error, setError] = useState("");

  const activeUploadRequest =
    useRef<XMLHttpRequest | null>(null);

  const cancelUploadRef = useRef(false);

  // Authentication check.
  useEffect(() => {
    if (!router.isReady) return;

    let active = true;

    const verifyAuthentication = async () => {
      try {
        const localUser = getCurrentUser();

        if (!localUser) {
          await router.replace(
            `/login?returnUrl=${encodeURIComponent("/upload")}`
          );
          return;
        }

        const backendUser = await getCurrentBackendUser();

        if (!backendUser || !backendUser.id) {
          await router.replace(
            `/login?returnUrl=${encodeURIComponent("/upload")}`
          );
          return;
        }

        if (
          backendUser.email.trim().toLowerCase() !==
          localUser.email.trim().toLowerCase()
        ) {
          await router.replace("/login");
          return;
        }

        if (active) {
          setCheckingAuth(false);
        }
      } catch (authError) {
        console.error(
          "Authentication verification failed:",
          authError
        );

        if (active) {
          await router.replace("/login");
        }
      }
    };

    void verifyAuthentication();

    return () => {
      active = false;
    };
  }, [router.isReady, router]);

  // Clean up preview URLs.
  useEffect(() => {
    return () => {
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }

      if (thumbnailPreview) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [videoPreview, thumbnailPreview]);

  // Clean up an active request if the page unmounts.
  useEffect(() => {
    return () => {
      cancelUploadRef.current = true;
      activeUploadRequest.current?.abort();
    };
  }, []);

  const handleVideoChange = (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!isValidVideo(file)) {
      setError("Please select a valid video file.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      setError(
        "Video size must not exceed 1 GB. Please choose a smaller video."
      );
      e.target.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setError("");
    setVideoFile(file);
    setVideoPreview(previewUrl);

    setVideoDuration("0:00");
    setDurationReady(false);
    setUploadProgress(0);

    e.target.value = "";
  };

  const handleThumbnailChange = (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!isValidImage(file)) {
      setError("Please select a valid image file.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_THUMBNAIL_SIZE) {
      setError("Thumbnail size must not exceed 10 MB.");
      e.target.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setError("");
    setThumbnailFile(file);
    setThumbnailPreview(previewUrl);

    e.target.value = "";
  };

  const handleVideoLoaded = (
    e: SyntheticEvent<HTMLVideoElement>
  ) => {
    const duration = e.currentTarget.duration;

    if (!Number.isFinite(duration) || duration <= 0) {
      setDurationReady(false);
      setError(
        "Unable to read video duration. Please choose another supported video format."
      );
      return;
    }

    setVideoDuration(formatDuration(duration));
    setDurationReady(true);
    setError("");
  };

  const handleVideoError = () => {
    setDurationReady(false);

    setError(
      "Unable to preview this video. Please select a supported video file."
    );
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview("");
    setVideoDuration("0:00");
    setDurationReady(false);
    setUploadProgress(0);
    setError("");
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview("");
  };

  const resetForm = () => {
    setVideoFile(null);
    setThumbnailFile(null);

    setVideoPreview("");
    setThumbnailPreview("");

    setVideoDuration("0:00");
    setDurationReady(false);

    setTitle("");
    setDescription("");

    setCategory("Programming");
    setVisibility("Public");

    setPublished(false);
    setUploadProgress(0);
    setUploadingVideo(false);
    setError("");
  };

  // Cancel an active video upload.
  const cancelVideoUpload = () => {
    cancelUploadRef.current = true;
    activeUploadRequest.current?.abort();
  };

  // Publish video to Cloudinary and save metadata in MongoDB.
  const handlePublish = async () => {
    const user = getCurrentUser();

    if (!user) {
      await router.push(
        `/login?returnUrl=${encodeURIComponent("/upload")}`
      );
      return;
    }

    if (!videoFile) {
      setError("Please select a video.");
      return;
    }

    if (videoFile.size > MAX_VIDEO_SIZE) {
      setError("Video size must not exceed 1 GB.");
      return;
    }

    if (!durationReady) {
      setError(
        "Please wait until the video preview and duration are loaded."
      );
      return;
    }

    if (!title.trim()) {
      setError("Please enter a video title.");
      return;
    }

    if (title.trim().length > 100) {
      setError("Video title cannot exceed 100 characters.");
      return;
    }

    if (description.length > 5000) {
      setError("Description cannot exceed 5000 characters.");
      return;
    }

    try {
      setPublishing(true);
      setError("");
      setUploadProgress(0);

      cancelUploadRef.current = false;

      // Verify backend session.
      const backendUser = await getCurrentBackendUser();
      const token = getBackendToken();

      if (
        !backendUser ||
        !backendUser.id ||
        !token ||
        backendUser.email.trim().toLowerCase() !==
          user.email.trim().toLowerCase()
      ) {
        setError(
          "Your login session is invalid. Please sign in again."
        );

        await router.replace("/login");
        return;
      }

      // Step 1: Upload video in chunks.
      setUploadingVideo(true);

      const uploadedVideo = await uploadVideoToCloudinary(
        videoFile,
        token,
        setUploadProgress,
        activeUploadRequest,
        cancelUploadRef
      );

      setUploadingVideo(false);

      // Step 2: Upload thumbnail if selected.
      let uploadedThumbnail = {
        secureUrl: "",
        publicId: "",
      };

      if (thumbnailFile) {
        uploadedThumbnail = await uploadImageToCloudinary(
          thumbnailFile,
          token
        );
      }

      // Step 3: Save video details in MongoDB.
      const createResponse = await fetch(VIDEOS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),

          videoUrl: uploadedVideo.secureUrl,
          thumbnailUrl: uploadedThumbnail.secureUrl,

          videoPublicId: uploadedVideo.publicId,
          thumbnailPublicId: uploadedThumbnail.publicId,

          category,
          duration: videoDuration,
          visibility,
        }),
      });

      const createData = await createResponse.json();

      if (!createResponse.ok || !createData.success) {
        throw new Error(
          createData.message ||
            "Unable to save video details in the database. The uploaded Cloudinary file may still exist."
        );
      }

      setPublished(true);
    } catch (err) {
      console.error("Video publishing failed:", err);

      if (
        cancelUploadRef.current ||
        (err instanceof Error && err.message === "Upload cancelled.")
      ) {
        setError("Video upload cancelled.");
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to publish the video. Please try again."
        );
      }
    } finally {
      setPublishing(false);
      setUploadingVideo(false);
      activeUploadRequest.current = null;
    }
  };

  if (!router.isReady || checkingAuth) {
    return (
      <main className="min-h-screen bg-gray-50 text-black">
        <Header onMenuClick={() => {}} />

        <div className="flex min-h-screen items-center justify-center pt-16">
          <p className="text-sm text-gray-500">
            Checking your account...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 text-black">
      <Header onMenuClick={() => {}} />

      <Sidebar isOpen={true} onClose={() => {}} />

      <MobileNav />

      <section className="pt-16 lg:ml-64">
        <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6 lg:pb-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold md:text-3xl">
              Upload Video
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Upload and publish a new video to your channel
            </p>
          </div>

          {published ? (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
              <CheckCircle2
                size={56}
                className="mx-auto text-green-600"
              />

              <h2 className="mt-5 text-2xl font-bold">
                Video published!
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
                Your video has been uploaded to Cloudinary and its
                details have been saved successfully.
              </p>

              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => router.push("/your-videos")}
                  className="rounded-full bg-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  View Your Videos
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black ring-1 ring-gray-300 hover:bg-gray-100"
                >
                  Upload Another
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {error}
                </div>
              )}

              {/* Video selection */}
              <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <VideoIcon size={24} />

                  <div>
                    <h2 className="font-semibold">Video file</h2>

                    <p className="text-sm text-gray-500">
                      Maximum video size: 1 GB
                    </p>
                  </div>
                </div>

                {videoPreview ? (
                  <div className="relative overflow-hidden rounded-xl bg-black">
                    <video
                      controls
                      preload="metadata"
                      src={videoPreview}
                      onLoadedMetadata={handleVideoLoaded}
                      onError={handleVideoError}
                      className="aspect-video w-full"
                    />

                    <button
                      type="button"
                      onClick={removeVideo}
                      aria-label="Remove video"
                      disabled={publishing}
                      className="absolute right-3 top-3 rounded-full bg-black/70 p-2 text-white hover:bg-black disabled:opacity-50"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-5 text-center transition hover:border-gray-500 hover:bg-gray-100">
                    <Upload
                      size={42}
                      className="text-gray-500"
                    />

                    <p className="mt-4 font-semibold">
                      Select a video to upload
                    </p>

                    <p className="mt-2 text-sm text-gray-500">
                      MP4, WebM or another supported video format
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      Maximum file size: 1 GB
                    </p>

                    <span className="mt-5 rounded-full bg-black px-5 py-2 text-sm font-medium text-white">
                      Choose video
                    </span>

                    <input
                      type="file"
                      accept="video/*,.mkv,.avi,.mov,.m4v"
                      onChange={handleVideoChange}
                      disabled={publishing}
                      className="hidden"
                      aria-label="Choose video file"
                    />
                  </label>
                )}

                {videoFile && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="max-w-full truncate text-sm text-gray-500">
                      {videoFile.name}
                    </p>

                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {(
                          videoFile.size /
                          (1024 * 1024)
                        ).toFixed(2)}{" "}
                        MB
                      </p>

                      <p className="text-xs text-gray-500">
                        Duration: {videoDuration}
                      </p>
                    </div>
                  </div>
                )}

                {/* Upload progress */}
                {uploadingVideo && (
                  <div className="mt-5">
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="font-medium">
                        Uploading video...
                      </span>

                      <span className="font-semibold">
                        {uploadProgress}%
                      </span>
                    </div>

                    <div
                      className="h-3 overflow-hidden rounded-full bg-gray-200"
                      role="progressbar"
                      aria-valuenow={uploadProgress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all"
                        style={{
                          width: `${uploadProgress}%`,
                        }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={cancelVideoUpload}
                      className="mt-3 rounded-full border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Cancel upload
                    </button>
                  </div>
                )}
              </section>

              {/* Video details */}
              <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
                <h2 className="mb-5 text-lg font-semibold">
                  Video details
                </h2>

                <div className="space-y-5">
                  <div>
                    <label
                      htmlFor="title"
                      className="mb-2 block text-sm font-medium"
                    >
                      Title
                    </label>

                    <input
                      id="title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Add a title for your video"
                      maxLength={100}
                      disabled={publishing}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100"
                    />

                    <p className="mt-1 text-right text-xs text-gray-400">
                      {title.length}/100
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="mb-2 block text-sm font-medium"
                    >
                      Description
                    </label>

                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) =>
                        setDescription(e.target.value)
                      }
                      placeholder="Tell viewers about your video"
                      rows={6}
                      maxLength={5000}
                      disabled={publishing}
                      className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100"
                    />

                    <p className="mt-1 text-right text-xs text-gray-400">
                      {description.length}/5000
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="category"
                      className="mb-2 block text-sm font-medium"
                    >
                      Category
                    </label>

                    <select
                      id="category"
                      value={category}
                      onChange={(e) =>
                        setCategory(e.target.value)
                      }
                      disabled={publishing}
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100"
                    >
                      {categories.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* Thumbnail */}
              <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <ImageIcon size={24} />

                  <div>
                    <h2 className="font-semibold">Thumbnail</h2>

                    <p className="text-sm text-gray-500">
                      Choose an image (maximum 10 MB)
                    </p>
                  </div>
                </div>

                {thumbnailPreview ? (
                  <div className="relative max-w-xl overflow-hidden rounded-xl">
                    <img
                      src={thumbnailPreview}
                      alt="Selected thumbnail"
                      className="aspect-video w-full object-cover"
                    />

                    <button
                      type="button"
                      onClick={removeThumbnail}
                      disabled={publishing}
                      aria-label="Remove thumbnail"
                      className="absolute right-3 top-3 rounded-full bg-black/70 p-2 text-white hover:bg-black disabled:opacity-50"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <label className="flex min-h-48 max-w-xl cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-5 text-center transition hover:border-gray-500 hover:bg-gray-100">
                    <ImageIcon
                      size={40}
                      className="text-gray-500"
                    />

                    <p className="mt-4 text-sm font-semibold">
                      Upload a thumbnail
                    </p>

                    <span className="mt-4 rounded-full bg-gray-100 px-5 py-2 text-sm font-medium">
                      Choose image
                    </span>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailChange}
                      disabled={publishing}
                      className="hidden"
                      aria-label="Choose thumbnail image"
                    />
                  </label>
                )}

                {thumbnailFile && (
                  <p className="mt-3 truncate text-sm text-gray-500">
                    {thumbnailFile.name}
                  </p>
                )}
              </section>

              {/* Visibility */}
              <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
                <h2 className="mb-5 text-lg font-semibold">
                  Visibility
                </h2>

                <div className="space-y-3">
                  {["Public", "Unlisted", "Private"].map(
                    (option) => (
                      <label
                        key={option}
                        className="flex cursor-pointer gap-3 rounded-xl border border-gray-200 p-4 transition hover:bg-gray-50"
                      >
                        <input
                          type="radio"
                          name="visibility"
                          value={option}
                          checked={visibility === option}
                          disabled={publishing}
                          onChange={(e) =>
                            setVisibility(e.target.value)
                          }
                          className="mt-1"
                        />

                        <div>
                          <p className="text-sm font-semibold">
                            {option}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {option === "Public"
                              ? "Anyone can watch this video."
                              : option === "Unlisted"
                              ? "Only people with the link can watch."
                              : "Only you can watch this video."}
                          </p>
                        </div>
                      </label>
                    )
                  )}
                </div>
              </section>

              {/* Actions */}
              <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => router.back()}
                  disabled={publishing}
                  className="rounded-full bg-gray-100 px-6 py-2.5 text-sm font-semibold hover:bg-gray-200 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={
                    publishing ||
                    !videoFile ||
                    !title.trim() ||
                    !durationReady
                  }
                  className="rounded-full bg-black px-7 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {publishing ? "Publishing..." : "Publish"}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

import {
  saveDownloadedVideo,
} from "@/lib/downloadFileStorage";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  MouseEvent,
} from "react";

import { useRouter } from "next/router";

import {
  ThumbsUp,
  ThumbsDown,
  Share2,
  Download,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Settings,
  Captions,
  PictureInPicture,
  SkipBack,
  SkipForward,
  MonitorPlay,
  ChevronDown,
  
  X,
} from "lucide-react";

import Header from "@/components/Header";
import CommentSection from "@/components/comments/CommentSection";
import { useAllVideos } from "@/hooks/useAllVideos";

import {
  addToHistory,
  getLikedVideos,
  toggleLikedVideo,
} from "@/lib/storage";

import { getCurrentUser } from "@/lib/auth";

import {
  getChannelSubscriptionStatus,
  subscribeToChannel,
  unsubscribeFromChannel,
} from "@/lib/subscriptionApi";

import { getBackendToken } from "@/lib/backendAuth";

import { addNotification } from "@/lib/notificationStorage";

import type {
  SubscriptionPlan,
} from "@/lib/subscriptionStorage";

import {
  addFailedDownload,
  beginDownloadLock,
  canDownloadVideo,
  createDownloadRecord,
  endDownloadLock,
  getRemainingQuota,
  getSubscriptionPlan,
  DOWNLOAD_LIMITS,
  formatFileSize,
} from "@/lib/downloadStorage";

type ExtendedVideo = {
  id: number;
  backendId?: string;
  channelId?: string;
  title: string;
  channel: string;
  thumbnail: string;
  avatar: string;
  videoUrl: string;
  duration?: string;
  views: string;
  time: string;
  description?: string;
  category?: string;
  captionsUrl?: string;
  subtitleUrl?: string;
  quality?: string;
};

type WatchProgress = {
  position: number;
  duration: number;
  completed: boolean;
  updatedAt: string;
};

const COMPLETION_PERCENTAGE = 0.9;
const AUTOPLAY_SECONDS = 8;

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const formattedMinutes =
    hours > 0
      ? String(minutes).padStart(2, "0")
      : String(minutes);

  const formattedSeconds = String(secs).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${formattedMinutes}:${formattedSeconds}`;
  }

  return `${formattedMinutes}:${formattedSeconds}`;
}

function getWatchProgressKey(videoId: number) {
  return `youtube_watch_progress_${videoId}`;
}

function readWatchProgress(videoId: number): WatchProgress | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const stored = localStorage.getItem(getWatchProgressKey(videoId));

    if (!stored) {
      return null;
    }

    return JSON.parse(stored) as WatchProgress;
  } catch {
    return null;
  }
}

function saveWatchProgress(
  videoId: number,
  position: number,
  duration: number,
  completed: boolean
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const data: WatchProgress = {
      position: Math.max(0, position),
      duration: Math.max(0, duration),
      completed,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(
      getWatchProgressKey(videoId),
      JSON.stringify(data)
    );
  } catch (error) {
    console.error("Failed to save watch progress:", error);
  }
}

function getCaptionSource(video: ExtendedVideo) {
  return video.captionsUrl || video.subtitleUrl || "";
}

function CustomVideoPlayer({
  video,
  nextVideo,
  onNext,
  onTheaterChange,
}: {
  video: ExtendedVideo;
  nextVideo?: ExtendedVideo;
  onNext: () => void;
  onTheaterChange: (value: boolean) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionSavedRef = useRef(false);
  const autoplayStartedRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [theaterMode, setTheaterMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [autoplayCountdown, setAutoplayCountdown] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [message, setMessage] = useState("");
  const [videoQuality, setVideoQuality] = useState(video.quality || "Auto");

  const captionSource = getCaptionSource(video);

  const showControls = () => {
    setControlsVisible(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (playing) {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
        setSpeedOpen(false);
      }, 3000);
    }
  };

  const showMessage = (text: string) => {
    setMessage(text);

    setTimeout(() => {
      setMessage("");
    }, 2500);
  };

  const saveCurrentProgress = (
    completed = completionSavedRef.current
  ) => {
    const element = videoRef.current;

    if (!element) {
      return;
    }

    saveWatchProgress(
      video.id,
      element.currentTime,
      Number.isFinite(element.duration) ? element.duration : duration,
      completed
    );
  };

  const togglePlay = async () => {
    const element = videoRef.current;

    if (!element) {
      return;
    }

    try {
      if (element.paused || element.ended) {
        window.dispatchEvent(
          new CustomEvent("youtube-video-play", {
            detail: element,
          })
        );

        await element.play();
      } else {
        element.pause();
      }
    } catch (error) {
      console.error("Playback error:", error);
      showMessage("Unable to play this video.");
    }
  };

  const seekBy = (seconds: number) => {
    const element = videoRef.current;

    if (!element) {
      return;
    }

    const nextTime = Math.min(
      Math.max(0, element.currentTime + seconds),
      element.duration || 0
    );

    element.currentTime = nextTime;
    setCurrentTime(nextTime);
    showControls();
  };

  const handleVolumeChange = (value: number) => {
    const element = videoRef.current;

    if (!element) {
      return;
    }

    const nextVolume = Math.min(1, Math.max(0, value));

    element.volume = nextVolume;
    element.muted = nextVolume === 0;

    setVolume(nextVolume);
    setMuted(element.muted);
    showControls();
  };

  const toggleMute = () => {
    const element = videoRef.current;

    if (!element) {
      return;
    }

    if (element.muted) {
      element.muted = false;

      if (element.volume === 0) {
        element.volume = 0.5;
        setVolume(0.5);
      }

      setMuted(false);
    } else {
      element.muted = true;
      setMuted(true);
    }

    showControls();
  };

  const changeSpeed = (rate: number) => {
    const element = videoRef.current;

    if (!element) {
      return;
    }

    element.playbackRate = rate;
    setPlaybackRate(rate);
    setSpeedOpen(false);
    showMessage(`Playback speed ${rate}×`);
    showControls();
  };

  const toggleFullscreen = async () => {
    const element = playerRef.current;

    if (!element) {
      return;
    }

    try {
      if (!document.fullscreenElement) {
        await element.requestFullscreen();
        setFullscreen(true);
      } else {
        await document.exitFullscreen();
        setFullscreen(false);
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
      showMessage("Fullscreen is not available.");
    }
  };

  const togglePictureInPicture = async () => {
    const element = videoRef.current;

    if (!element) {
      return;
    }

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return;
      }

      if (
        !document.pictureInPictureEnabled ||
        !("requestPictureInPicture" in element)
      ) {
        showMessage(
          "Picture-in-Picture is not supported by this browser."
        );
        return;
      }

      window.dispatchEvent(
        new CustomEvent("youtube-video-play", {
          detail: element,
        })
      );

      await element.requestPictureInPicture();
    } catch (error) {
      console.error("Picture-in-Picture error:", error);
      showMessage("Picture-in-Picture could not be enabled.");
    }
  };

  const toggleCaptions = () => {
    const element = videoRef.current;

    if (!element) {
      return;
    }

    if (!captionSource && element.textTracks.length === 0) {
      showMessage("Captions are not available for this video.");
      return;
    }

    setCaptionsEnabled((previous) => !previous);
  };

  const handleTimelineChange = (value: number) => {
    const element = videoRef.current;

    if (!element) {
      return;
    }

    element.currentTime = value;
    setCurrentTime(value);
    showControls();
  };

  const handleTimelineHover = (
    event: MouseEvent<HTMLDivElement>
  ) => {
    if (duration <= 0) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    const position = Math.min(
      1,
      Math.max(0, (event.clientX - rect.left) / rect.width)
    );

    const time = position * duration;

    setHoverTime(time);
    setHoverPosition(position * 100);

    const preview = previewVideoRef.current;

    if (preview && preview.readyState >= 1) {
      try {
        preview.currentTime = time;
        preview.pause();
      } catch {
        // Ignore preview seeking errors.
      }
    }
  };

  const handleTimelineLeave = () => {
    setHoverTime(null);
  };

  const startAutoplay = () => {
    if (!nextVideo || autoplayStartedRef.current) {
      return;
    }

    autoplayStartedRef.current = true;
    setAutoplayCountdown(AUTOPLAY_SECONDS);
  };

  const cancelAutoplay = () => {
    autoplayStartedRef.current = true;
    setAutoplayCountdown(null);
    showMessage("Autoplay cancelled.");
  };

  useEffect(() => {
    const element = videoRef.current;

    if (!element) {
      return;
    }

    setCurrentTime(0);
    setDuration(0);
    setPlaying(false);
    setLoading(true);
    setBufferedPercent(0);
    setAutoplayCountdown(null);
    setCaptionsEnabled(false);

    completionSavedRef.current = false;
    autoplayStartedRef.current = false;

    const savedProgress = readWatchProgress(video.id);

    const handleLoadedMetadata = () => {
      setDuration(element.duration);

      if (
        element.videoWidth > 0 &&
        element.videoHeight > 0
      ) {
        setVideoQuality(
          `${element.videoWidth}×${element.videoHeight}`
        );
      }

      if (
        savedProgress &&
        savedProgress.position > 5 &&
        Number.isFinite(element.duration) &&
        savedProgress.position < element.duration - 3
      ) {
        element.currentTime = savedProgress.position;
        setCurrentTime(savedProgress.position);
      }

      setLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(element.currentTime);

      if (
        Number.isFinite(element.duration) &&
        element.duration > 0
      ) {
        const completed =
          element.currentTime / element.duration >=
          COMPLETION_PERCENTAGE;

        if (completed && !completionSavedRef.current) {
          completionSavedRef.current = true;

          saveWatchProgress(
            video.id,
            element.currentTime,
            element.duration,
            true
          );
        }

        if (progressSaveTimeoutRef.current) {
          return;
        }

        progressSaveTimeoutRef.current = setTimeout(() => {
          progressSaveTimeoutRef.current = null;

          saveWatchProgress(
            video.id,
            element.currentTime,
            element.duration,
            completionSavedRef.current
          );
        }, 5000);
      }
    };

    const handleProgress = () => {
      if (
        !Number.isFinite(element.duration) ||
        element.duration <= 0 ||
        element.buffered.length === 0
      ) {
        return;
      }

      let bufferedEnd = 0;

      try {
        bufferedEnd = element.buffered.end(
          element.buffered.length - 1
        );
      } catch {
        bufferedEnd = 0;
      }

      setBufferedPercent(
        Math.min(
          100,
          Math.max(0, (bufferedEnd / element.duration) * 100)
        )
      );
    };

    const handlePlay = () => {
      setPlaying(true);
      setLoading(false);
      showControls();

      window.dispatchEvent(
        new CustomEvent("youtube-video-play", {
          detail: element,
        })
      );
    };

    const handlePause = () => {
      setPlaying(false);
      saveCurrentProgress();
      setControlsVisible(true);

      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };

    const handleWaiting = () => {
      setLoading(true);
    };

    const handlePlaying = () => {
      setLoading(false);
    };

    const handleEnded = () => {
      setPlaying(false);

      saveWatchProgress(
        video.id,
        element.duration,
        element.duration,
        true
      );

      completionSavedRef.current = true;
      startAutoplay();
    };

    const handleVolume = () => {
      setMuted(element.muted);
      setVolume(element.volume);
    };

    const handleRateChange = () => {
      setPlaybackRate(element.playbackRate);
    };

    element.addEventListener("loadedmetadata", handleLoadedMetadata);
    element.addEventListener("timeupdate", handleTimeUpdate);
    element.addEventListener("progress", handleProgress);
    element.addEventListener("play", handlePlay);
    element.addEventListener("pause", handlePause);
    element.addEventListener("waiting", handleWaiting);
    element.addEventListener("playing", handlePlaying);
    element.addEventListener("ended", handleEnded);
    element.addEventListener("volumechange", handleVolume);
    element.addEventListener("ratechange", handleRateChange);

    return () => {
      element.pause();
      saveCurrentProgress();

      element.removeEventListener(
        "loadedmetadata",
        handleLoadedMetadata
      );
      element.removeEventListener("timeupdate", handleTimeUpdate);
      element.removeEventListener("progress", handleProgress);
      element.removeEventListener("play", handlePlay);
      element.removeEventListener("pause", handlePause);
      element.removeEventListener("waiting", handleWaiting);
      element.removeEventListener("playing", handlePlaying);
      element.removeEventListener("ended", handleEnded);
      element.removeEventListener("volumechange", handleVolume);
      element.removeEventListener("ratechange", handleRateChange);
    };
  }, [video.id]);

  useEffect(() => {
    const element = videoRef.current;

    if (!element) {
      return;
    }

    const tracks = element.textTracks;

    for (let index = 0; index < tracks.length; index += 1) {
      tracks[index].mode = captionsEnabled ? "showing" : "hidden";
    }
  }, [captionsEnabled]);

  useEffect(() => {
    if (autoplayCountdown === null || !nextVideo) {
      return;
    }

    const timer = window.setInterval(() => {
      setAutoplayCountdown((current) => {
        if (current === null || current <= 1) {
          window.clearInterval(timer);
          onNext();
          return null;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [autoplayCountdown, nextVideo, onNext]);

  useEffect(() => {
    const handleFullscreen = () => {
      setFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreen);

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreen
      );
    };
  }, []);

  useEffect(() => {
    const handleOtherVideo = (event: Event) => {
      const customEvent = event as CustomEvent<HTMLVideoElement>;
      const otherVideo = customEvent.detail;

      if (otherVideo && otherVideo !== videoRef.current) {
        videoRef.current?.pause();
      }
    };

    window.addEventListener("youtube-video-play", handleOtherVideo);

    return () => {
      window.removeEventListener(
        "youtube-video-play",
        handleOtherVideo
      );
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;

      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      const element = videoRef.current;

      if (!element) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case " ":
        case "k":
          event.preventDefault();
          void togglePlay();
          break;

        case "arrowleft":
          event.preventDefault();
          seekBy(event.shiftKey ? -30 : -10);
          break;

        case "arrowright":
          event.preventDefault();
          seekBy(event.shiftKey ? 30 : 10);
          break;

        case "arrowup":
          event.preventDefault();
          handleVolumeChange(element.volume + 0.05);
          break;

        case "arrowdown":
          event.preventDefault();
          handleVolumeChange(element.volume - 0.05);
          break;

        case "m":
          event.preventDefault();
          toggleMute();
          break;

        case "f":
          event.preventDefault();
          void toggleFullscreen();
          break;

        case "t": {
          event.preventDefault();

          const next = !theaterMode;
          setTheaterMode(next);
          onTheaterChange(next);
          break;
        }

        case "c":
          event.preventDefault();
          toggleCaptions();
          break;

        case "p":
          event.preventDefault();
          void togglePictureInPicture();
          break;

        case "n":
          event.preventDefault();
          if (nextVideo) {
            onNext();
          }
          break;

        case "<":
        case ",":
          event.preventDefault();
          changeSpeed(Math.max(0.5, playbackRate - 0.25));
          break;

        case ">":
        case ".":
          event.preventDefault();
          changeSpeed(Math.min(2, playbackRate + 0.25));
          break;

        case "0":
          event.preventDefault();
          element.currentTime = 0;
          break;

        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9": {
          event.preventDefault();

          const percentage = Number(event.key) / 10;

          if (Number.isFinite(element.duration)) {
            element.currentTime = element.duration * percentage;
          }

          break;
        }

        default:
          break;
      }

      showControls();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    playbackRate,
    theaterMode,
    nextVideo,
    onNext,
    onTheaterChange,
  ]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }

      if (progressSaveTimeoutRef.current) {
        clearTimeout(progressSaveTimeoutRef.current);
      }
    };
  }, []);

  const progressPercent =
    duration > 0
      ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
      : 0;

  const remainingTime = Math.max(0, duration - currentTime);

  return (
    <div
      ref={playerRef}
      className={`relative overflow-hidden bg-black ${
        fullscreen
          ? "h-screen w-screen"
          : "aspect-video w-full"
      }`}
      onMouseMove={showControls}
      onMouseEnter={showControls}
      onMouseLeave={() => {
        if (playing) {
          setControlsVisible(false);
        }
      }}
    >
      <video
        ref={videoRef}
        key={video.id}
        playsInline
        preload="metadata"
        poster={video.thumbnail}
        className="h-full w-full object-contain"
      >
        <source src={video.videoUrl} type="video/mp4" />

        {captionSource && (
          <track
            kind="subtitles"
            src={captionSource}
            srcLang="en"
            label="English"
          />
        )}

        Your browser does not support the HTML5 video player.
      </video>

      <video
        ref={previewVideoRef}
        src={video.videoUrl}
        muted
        preload="metadata"
        aria-hidden="true"
        className="pointer-events-none absolute hidden h-24 w-40 rounded-lg border border-white/40 object-cover shadow-xl md:block"
        style={{
          opacity: hoverTime !== null ? 1 : 0,
          left: `calc(${hoverPosition}% - 80px)`,
          top: "calc(50% - 75px)",
        }}
      />

      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-black/60 p-4">
            <Loader2
              size={30}
              className="animate-spin text-white"
            />
          </div>
        </div>
      )}

      {message && (
        <div className="absolute left-1/2 top-5 z-20 -translate-x-1/2 rounded-full bg-black/80 px-4 py-2 text-xs font-medium text-white">
          {message}
        </div>
      )}

      {autoplayCountdown !== null && nextVideo && (
        <div className="absolute bottom-24 left-4 right-4 z-20 rounded-xl bg-black/90 p-4 text-white shadow-xl md:left-auto md:right-5 md:w-80">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-gray-300">
                Up next
              </p>

              <p className="mt-1 line-clamp-2 text-sm font-semibold">
                {nextVideo.title}
              </p>

              <p className="mt-2 text-xs text-gray-400">
                Playing in {autoplayCountdown} seconds
              </p>
            </div>

            <button
              type="button"
              onClick={cancelAutoplay}
              aria-label="Cancel autoplay"
              className="rounded-full p-2 hover:bg-white/10"
            >
              <X size={18} />
            </button>
          </div>

          <button
            type="button"
            onClick={onNext}
            className="mt-3 w-full rounded-full bg-white py-2 text-xs font-semibold text-black hover:bg-gray-200"
          >
            Play next now
          </button>
        </div>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-3 pt-12 transition-opacity duration-200 ${
          controlsVisible
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      >
        <div
          className="group relative h-5 cursor-pointer"
          onMouseMove={handleTimelineHover}
          onMouseLeave={handleTimelineLeave}
        >
          <div className="absolute left-0 right-0 top-2 h-1 rounded-full bg-white/30">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-white/40"
              style={{ width: `${bufferedPercent}%` }}
            />

            <div
              className="absolute left-0 top-0 h-full rounded-full bg-red-600"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <input
            type="range"
            min={0}
            max={duration || 0.1}
            step={0.1}
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) =>
              handleTimelineChange(Number(event.target.value))
            }
            aria-label="Video progress"
            className="absolute left-0 top-0 h-5 w-full cursor-pointer appearance-none bg-transparent"
          />

          {hoverTime !== null && (
            <div
              className="pointer-events-none absolute bottom-7 -translate-x-1/2 rounded bg-black/90 px-2 py-1 text-[10px] font-medium text-white"
              style={{ left: `${hoverPosition}%` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 text-white sm:gap-2">
          <button
            type="button"
            onClick={() => void togglePlay()}
            aria-label={playing ? "Pause" : "Play"}
            className="rounded-full p-2 hover:bg-white/10"
          >
            {playing ? (
              <Pause size={21} fill="currentColor" />
            ) : (
              <Play size={21} fill="currentColor" />
            )}
          </button>

          <button
            type="button"
            onClick={() => seekBy(-10)}
            aria-label="Seek backward 10 seconds"
            className="hidden rounded-full p-2 hover:bg-white/10 sm:block"
          >
            <SkipBack size={19} />
          </button>

          <button
            type="button"
            onClick={() => seekBy(10)}
            aria-label="Seek forward 10 seconds"
            className="hidden rounded-full p-2 hover:bg-white/10 sm:block"
          >
            <SkipForward size={19} />
          </button>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            className="rounded-full p-2 hover:bg-white/10"
          >
            {muted || volume === 0 ? (
              <VolumeX size={20} />
            ) : (
              <Volume2 size={20} />
            )}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(event) =>
              handleVolumeChange(Number(event.target.value))
            }
            aria-label="Volume"
            className="hidden w-20 md:block"
          />

          <div className="ml-1 whitespace-nowrap text-[11px] font-medium sm:text-xs">
            {formatTime(currentTime)} / {formatTime(duration)}
            <span className="hidden text-gray-300 sm:inline">
              {" • "}-{formatTime(remainingTime)}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <span className="hidden rounded px-2 py-1 text-[10px] font-semibold text-gray-200 sm:inline">
              {videoQuality}
            </span>

            <button
              type="button"
              onClick={toggleCaptions}
              aria-label="Toggle captions"
              title="Captions (C)"
              className={`rounded-full p-2 hover:bg-white/10 ${
                captionsEnabled ? "bg-white/20" : ""
              }`}
            >
              <Captions size={19} />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setSpeedOpen((previous) => !previous)
                }
                aria-label="Playback speed"
                title="Playback speed"
                className="flex items-center gap-1 rounded-full px-2 py-2 text-xs font-semibold hover:bg-white/10"
              >
                <Settings size={18} />

                <span className="hidden sm:inline">
                  {playbackRate}×
                </span>

                <ChevronDown size={13} />
              </button>

              {speedOpen && (
                <div className="absolute bottom-12 right-0 w-36 overflow-hidden rounded-xl bg-white py-2 text-black shadow-2xl">
                  <p className="px-4 py-2 text-xs font-semibold text-gray-500">
                    Playback speed
                  </p>

                  {[0.5, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => changeSpeed(rate)}
                      className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                        playbackRate === rate
                          ? "font-semibold"
                          : ""
                      }`}
                    >
                      <span>{rate}×</span>

                      {playbackRate === rate && (
                        <CheckCircle2 size={15} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                const next = !theaterMode;
                setTheaterMode(next);
                onTheaterChange(next);
              }}
              aria-label="Theater mode"
              title="Theater mode (T)"
              className={`rounded-full p-2 hover:bg-white/10 ${
                theaterMode ? "bg-white/20" : ""
              }`}
            >
              <MonitorPlay size={19} />
            </button>

            <button
              type="button"
              onClick={() => void togglePictureInPicture()}
              aria-label="Picture-in-Picture"
              title="Picture-in-Picture (P)"
              className="hidden rounded-full p-2 hover:bg-white/10 sm:block"
            >
              <PictureInPicture size={19} />
            </button>

            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
              title="Fullscreen (F)"
              className="rounded-full p-2 hover:bg-white/10"
            >
              {fullscreen ? (
                <Minimize2 size={19} />
              ) : (
                <Maximize2 size={19} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WatchPage() {
  const router = useRouter();
  const { videos, loading } = useAllVideos();

  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState("");
  const [shared, setShared] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [plan, setPlan] = useState<SubscriptionPlan>("Free");
  const [remainingQuota, setRemainingQuota] = useState(1);
  const [theaterMode, setTheaterMode] = useState(false);

  const rawId = router.query.id;

  const videoId =
    typeof rawId === "string" ? Number(rawId) : NaN;

  const video =
    Number.isFinite(videoId)
      ? (videos.find((item) => item && item.id === videoId) as
          | ExtendedVideo
          | undefined)
      : undefined;

  const recommendedVideos = useMemo(
    () =>
      videos
        .filter((item) => item && item.id !== videoId)
        .map((item) => item as ExtendedVideo),
    [videos, videoId]
  );

  const nextVideo = recommendedVideos[0];

  useEffect(() => {
    if (!router.isReady || loading || !video) {
      return;
    }

    addToHistory(video.id);

    const user = getCurrentUser();

    if (user) {
      setLiked(getLikedVideos().includes(video.id));
    } else {
      setLiked(false);
    }

    if (user) {
      const currentPlan = getSubscriptionPlan();

      setPlan(currentPlan);
      setRemainingQuota(
        getRemainingQuota(user.email, currentPlan)
      );
    }
  }, [router.isReady, loading, video]);

  useEffect(() => {
    let active = true;

    const loadSubscriptionStatus = async () => {
      setSubscribed(false);
      setSubscriberCount(0);
      setSubscriptionError("");

      if (!video?.channelId) {
        return;
      }

      try {
        const result = await getChannelSubscriptionStatus(video.channelId);

        if (!active) {
          return;
        }

        setSubscribed(result.isSubscribed);
        setSubscriberCount(result.subscriberCount);
      } catch (error) {
        console.error("Failed to load subscription status:", error);

        if (active) {
          setSubscriptionError(
            "Unable to load subscription information."
          );
        }
      }
    };

    void loadSubscriptionStatus();

    return () => {
      active = false;
    };
  }, [video?.channelId]);

  const requireLogin = () => {
    const user = getCurrentUser();

    if (user) {
      return true;
    }

    router.push(
      `/login?returnUrl=${encodeURIComponent(router.asPath)}`
    );

    return false;
  };

  const handleLike = () => {
    if (!video || !requireLogin()) {
      return;
    }

    const nextLiked = toggleLikedVideo(video.id);

    setLiked(nextLiked);
    setDisliked(false);

    if (nextLiked) {
      addNotification(
        "Video liked",
        `"${video.title}" was added to your liked videos.`
      );
    }
  };

  const handleDislike = () => {
    if (!video || !requireLogin()) {
      return;
    }

    if (liked) {
      toggleLikedVideo(video.id);
    }

    setLiked(false);
    setDisliked((previous) => !previous);
  };

  const handleSubscribe = async () => {
    if (!video || !requireLogin()) {
      return;
    }

    if (!video.channelId) {
      setSubscriptionError(
        "This channel is not available for subscription yet."
      );
      return;
    }

    const token = getBackendToken();

    if (!token) {
      setSubscriptionError("Please login again to subscribe.");
      void router.push(
        `/login?returnUrl=${encodeURIComponent(router.asPath)}`
      );
      return;
    }

    if (subscriptionLoading) {
      return;
    }

    try {
      setSubscriptionLoading(true);
      setSubscriptionError("");

      const result = subscribed
        ? await unsubscribeFromChannel(video.channelId)
        : await subscribeToChannel(video.channelId);

      setSubscribed(result.isSubscribed);
      setSubscriberCount(result.subscriberCount);

      if (result.isSubscribed) {
        addNotification(
          "Subscribed",
          `You subscribed to ${video.channel}.`
        );
      } else {
        addNotification(
          "Unsubscribed",
          `You unsubscribed from ${video.channel}.`
        );
      }
    } catch (error) {
      console.error("Subscription action failed:", error);
      setSubscriptionError(
        error instanceof Error
          ? error.message
          : "Subscription action failed. Please try again."
      );
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleShare = async () => {
    if (!video) {
      return;
    }

    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: video.title,
          url,
        });
        return;
      }

      await navigator.clipboard.writeText(url);
      setShared(true);

      setTimeout(() => {
        setShared(false);
      }, 2000);
    } catch {
      console.log("Share cancelled");
    }
  };

  const refreshQuota = () => {
    const user = getCurrentUser();

    if (!user) {
      return;
    }

    const currentPlan = getSubscriptionPlan();

    setPlan(currentPlan);
    setRemainingQuota(
      getRemainingQuota(user.email, currentPlan)
    );
  };

  const handleDownload = async () => {
  if (!video || !requireLogin()) {
    return;
  }

  const user = getCurrentUser();

  if (!user) {
    return;
  }

  setDownloadError("");
  setDownloadMessage("");

  const currentPlan = getSubscriptionPlan();

  const permission = canDownloadVideo(
    user.email,
    video.id,
    currentPlan
  );

  if (!permission.allowed) {
    setDownloadError(permission.reason);
    refreshQuota();
    return;
  }

  const lockAcquired = beginDownloadLock(
    user.email,
    video.id
  );

  if (!lockAcquired) {
    setDownloadError(
      "This video is already being downloaded. Please wait."
    );
    return;
  }

  try {
    setDownloading(true);

    console.log(
      "[download] Video URL:",
      video.videoUrl
    );

    let response: Response;

    /*
     * =========================================
     * CASE 1:
     * NEWLY UPLOADED LOCAL VIDEO
     *
     * Example:
     * blob:http://localhost:3000/xxxx
     *
     * Blob URLs only exist inside the browser.
     * Therefore we fetch them directly here.
     * =========================================
     */

    if (
      video.videoUrl.startsWith("blob:")
    ) {
      console.log(
        "[download] Detected browser blob URL"
      );

      response = await fetch(
        video.videoUrl
      );
    }

    /*
     * =========================================
     * CASE 2:
     * LOCAL NEXT.JS PUBLIC VIDEO
     *
     * Example:
     * /test-video.mp4
     * =========================================
     */

    else if (
      video.videoUrl.startsWith("/")
    ) {
      console.log(
        "[download] Detected local public video"
      );

      response = await fetch(
        video.videoUrl
      );
    }

    /*
     * =========================================
     * CASE 3:
     * EXTERNAL / BACKEND VIDEO
     *
     * Example:
     * https://example.com/video.mp4
     * =========================================
     */

    else {
      console.log(
        "[download] Using download proxy"
      );

      const downloadProxyUrl =
        `/api/backend/download?url=${encodeURIComponent(
          video.videoUrl
        )}`;

      response = await fetch(
        downloadProxyUrl
      );
    }

    /*
     * =========================================
     * CHECK RESPONSE
     * =========================================
     */

    if (!response.ok) {
      throw new Error(
        `Unable to access video file. HTTP ${response.status}`
      );
    }

    /*
     * =========================================
     * CONVERT RESPONSE TO BLOB
     * =========================================
     */

    const blob =
      await response.blob();

    if (!blob.size) {
      throw new Error(
        "Video file is empty."
      );
    }

    const fileSize =
      blob.size;

    console.log(
      "[download] File size:",
      fileSize
    );

    /*
     * =========================================
     * CREATE SAFE FILE NAME
     * =========================================
     */

    const safeTitle =
      video.title
        .replace(
          /[<>:"/\\|?*]/g,
          ""
        )
        .trim()
        .slice(0, 100) ||
      "video";

    const fileName =
      `${safeTitle}.mp4`;

    /*
     * =========================================
     * CREATE BROWSER DOWNLOAD URL
     * =========================================
     */

    const downloadUrl =
      URL.createObjectURL(
        blob
      );

    /*
     * =========================================
     * CREATE DOWNLOAD LINK
     * =========================================
     */

    const link =
      document.createElement("a");

    link.href =
      downloadUrl;

    link.download =
      fileName;

    link.style.display =
      "none";

    document.body.appendChild(
      link
    );

    /*
     * =========================================
     * START DOWNLOAD
     * =========================================
     */

    link.click();

    /*
     * =========================================
     * REMOVE LINK
     * =========================================
     */

    link.remove();

    /*
     * =========================================
     * RELEASE OBJECT URL
     * =========================================
     */

    setTimeout(() => {
      URL.revokeObjectURL(
        downloadUrl
      );
    }, 1000);

    /*
     * =========================================
     * CREATE DOWNLOAD RECORD
     * =========================================
     */

    const downloadRecord =
      createDownloadRecord({
        userId:
          user.email,

        videoId:
          video.id,

        title:
          video.title,

        thumbnail:
          video.thumbnail,

        status:
          "completed",

        fileSize:
          fileSize,

        fileName:
          fileName,

        subscriptionPlan:
          currentPlan,

        quotaLimit:
          DOWNLOAD_LIMITS[
            currentPlan
          ],
      });

    /*
     * =========================================
     * SAVE VIDEO TO INDEXEDDB
     * =========================================
     */

    await saveDownloadedVideo(
      downloadRecord.id,
      blob,
      fileName
    );

    /*
     * =========================================
     * REFRESH DOWNLOAD QUOTA
     * =========================================
     */

    refreshQuota();

    const updatedRemaining =
      getRemainingQuota(
        user.email,
        currentPlan
      );

    /*
     * =========================================
     * SUCCESS MESSAGE
     * =========================================
     */

    setDownloadMessage(
      `Download started • ${formatFileSize(
        fileSize
      )} • ${updatedRemaining} remaining`
    );

    /*
     * =========================================
     * NOTIFICATION
     * ========================================= */

    addNotification(
      "Download started",
      `"${video.title}" was downloaded using your ${currentPlan} plan.`
    );

    console.log(
      "[download] Download completed successfully"
    );
  } catch (error) {
    /*
     * =========================================
     * DOWNLOAD ERROR
     * =========================================
     */

    console.error(
      "[download] Download failed:",
      error
    );

    /*
     * =========================================
     * SAVE FAILED DOWNLOAD RECORD
     * =========================================
     */

    try {
      addFailedDownload({
        userId:
          user.email,

        videoId:
          video.id,

        title:
          video.title,

        thumbnail:
          video.thumbnail,

        fileSize:
          0,

        fileName:
          `${video.title}.mp4`,

        subscriptionPlan:
          currentPlan,

        quotaLimit:
          DOWNLOAD_LIMITS[
            currentPlan
          ],
      });
    } catch (
      recordError
    ) {
      console.error(
        "[download] Failed to record failed download:",
        recordError
      );
    }

    /*
     * =========================================
     * SHOW ERROR
     * =========================================
     */

    setDownloadError(
      "Download failed. Please try again."
    );

    refreshQuota();
  } finally {
    /*
     * =========================================
     * RELEASE DOWNLOAD LOCK
     * =========================================
     */

    endDownloadLock(
      user.email,
      video.id
    );

    setDownloading(false);
  }
};

  const handleNextVideo = () => {
    if (!nextVideo) {
      return;
    }

    setTheaterMode(false);
    router.push(`/watch/${nextVideo.id}`);
  };

  if (!router.isReady || loading) {
    return (
      <main className="min-h-screen bg-white text-black">
        <Header onMenuClick={() => {}} />

        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 size={18} className="animate-spin" />
            Loading video...
          </div>
        </div>
      </main>
    );
  }

  if (!Number.isFinite(videoId)) {
    return (
      <main className="min-h-screen bg-white text-black">
        <Header onMenuClick={() => {}} />

        <div className="flex min-h-screen items-center justify-center px-4 text-center">
          <div>
            <h1 className="text-2xl font-bold">
              Invalid video URL
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              The video ID is not valid.
            </p>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-5 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Go to Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!video) {
    return (
      <main className="min-h-screen bg-white text-black">
        <Header onMenuClick={() => {}} />

        <div className="flex min-h-screen items-center justify-center px-4 text-center">
          <div>
            <h1 className="text-2xl font-bold">
              Video not found
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              This video may have been removed or is not available.
            </p>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-5 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Go to Home
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <Header onMenuClick={() => {}} />

      <div className="mx-auto max-w-[1800px] px-4 pb-10 pt-20 md:px-6 lg:px-8">
        <div
          className={
            theaterMode
              ? "block"
              : "grid gap-8 xl:grid-cols-[minmax(0,1fr)_400px]"
          }
        >
          <section className="min-w-0">
            <CustomVideoPlayer
              video={video}
              nextVideo={nextVideo}
              onNext={handleNextVideo}
              onTheaterChange={setTheaterMode}
            />

            <h1 className="mt-5 text-lg font-bold leading-7 md:text-2xl">
              {video.title}
            </h1>

            <div className="mt-4 flex flex-col gap-4 border-b pb-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src={video.avatar}
                  alt={video.channel}
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />

                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="truncate font-semibold">
                      {video.channel}
                    </p>
                    <CheckCircle2
                      size={15}
                      className="shrink-0 text-gray-600"
                    />
                  </div>

                  <p className="text-xs text-gray-500">
                    {subscriberCount.toLocaleString("en-IN")} subscribers
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={subscriptionLoading || !video.channelId}
                  className={`ml-1 shrink-0 rounded-full px-5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    subscribed
                      ? "bg-gray-200 text-black hover:bg-gray-300"
                      : "bg-black text-white hover:bg-gray-800"
                  }`}
                >
                  {subscriptionLoading
                    ? "Please wait..."
                    : subscribed
                      ? "Subscribed"
                      : "Subscribe"}
                </button>
              </div>

              {subscriptionError && (
                <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  {subscriptionError}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleLike}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                    liked
                      ? "bg-black text-white"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  <ThumbsUp
                    size={18}
                    className={liked ? "fill-white" : ""}
                  />
                  {liked ? "Liked" : "Like"}
                </button>

                <button
                  type="button"
                  onClick={handleDislike}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                    disliked
                      ? "bg-black text-white"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  <ThumbsDown
                    size={18}
                    className={disliked ? "fill-white" : ""}
                  />
                  {disliked ? "Disliked" : "Dislike"}
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
                >
                  <Share2 size={18} />
                  {shared ? "Copied!" : "Share"}
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {downloading ? (
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <Download size={18} />
                  )}
                  {downloading ? "Downloading..." : "Download"}
                </button>

                <button
                  type="button"
                  aria-label="More options"
                  className="rounded-full bg-gray-100 p-2 hover:bg-gray-200"
                >
                  <MoreHorizontal size={20} />
                </button>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">
                  Download quota
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {plan} plan • {remainingQuota} of {DOWNLOAD_LIMITS[plan]} downloads remaining today
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push("/subscriptions")}
                className="w-fit rounded-full bg-white px-4 py-2 text-xs font-semibold ring-1 ring-gray-300 hover:bg-gray-100"
              >
                Manage plan
              </button>
            </div>

            {downloadMessage && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                <CheckCircle2
                  size={18}
                  className="mt-0.5 shrink-0"
                />
                <p>{downloadMessage}</p>
              </div>
            )}

            {downloadError && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0"
                />
                <p>{downloadError}</p>
              </div>
            )}

            <div className="mt-4 rounded-xl bg-gray-100 p-4">
              <p className="font-semibold">
                {video.views} • {video.time}
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-700">
                {video.description ||
                  `${video.title} is available on the YouTube Clone. Explore more videos from ${video.channel}.`}
              </p>

              {video.category && (
                <p className="mt-2 text-xs text-gray-500">
                  Category: {video.category}
                </p>
              )}
            </div>

              {video.backendId && (
            <CommentSection videoId={video.backendId} />
               )}
          </section>

          {!theaterMode && (
            <aside>
              <h2 className="mb-4 text-lg font-bold">
                Recommended videos
              </h2>

              <div className="space-y-4">
                {recommendedVideos.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => router.push(`/watch?id=${item.id}`)}
                    className="flex w-full gap-3 text-left"
                  >
                    <div className="relative w-40 shrink-0 overflow-hidden rounded-lg">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        loading="lazy"
                        className="aspect-video h-full w-full object-cover"
                      />

                      <span className="absolute bottom-1 right-1 rounded bg-black px-1 py-0.5 text-[11px] text-white">
                        {item.duration}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-sm font-semibold">
                        {item.title}
                      </h3>

                      <p className="mt-1 truncate text-xs text-gray-500">
                        {item.channel}
                      </p>

                      <p className="text-xs text-gray-500">
                        {item.views} • {item.time}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </aside>
          )}
        </div>
      </div>
    </main>
  );
}


import {
  useEffect,
  useState,
} from "react";

import {
  Moon,
  Sun,
  Monitor,
} from "lucide-react";

import {
  getThemeMode,
  setThemeMode,
  initializeTheme,
  resolveTheme,
  type ThemeMode,
} from "@/lib/themeStorage";

type ResolvedTheme =
  | "light"
  | "dark";

function applyResolvedTheme(
  theme: ResolvedTheme
) {
  if (
    typeof document ===
    "undefined"
  ) {
    return;
  }

  document.documentElement.classList.toggle(
    "dark",
    theme === "dark"
  );

  document.documentElement.dataset.theme =
    theme;

  document.documentElement.style.colorScheme =
    theme;
}

export default function ThemeToggle() {
  const [mode, setMode] =
    useState<ThemeMode>(
      "auto"
    );

  const [
    currentTheme,
    setCurrentTheme,
  ] = useState<ResolvedTheme>(
    "light"
  );

  const [
    mounted,
    setMounted,
  ] = useState(false);

  const syncTheme =
    () => {
      if (
        typeof window ===
        "undefined"
      ) {
        return;
      }

      const savedMode =
        getThemeMode();

      const resolved =
        resolveTheme(
          savedMode
        );

      setMode(
        savedMode
      );

      setCurrentTheme(
        resolved
      );

      applyResolvedTheme(
        resolved
      );
    };

  useEffect(() => {
    setMounted(true);

    /*
     * Initialize the saved theme.
     *
     * In "auto" mode the themeStorage
     * logic decides whether the current
     * time should use light or dark.
     */
    initializeTheme();

    syncTheme();

    const handleThemeChange =
      () => {
        syncTheme();
      };

    const handleStorage =
      (
        event: StorageEvent
      ) => {
        /*
         * Keep all tabs/components
         * synchronized when the saved
         * preference changes.
         */
        if (
          event.key ===
          "youtube_theme_mode" ||
          event.key ===
          "youtube_theme_preference" ||
          event.key ===
          "theme"
        ) {
          syncTheme();
        }
      };

    window.addEventListener(
      "youtube-theme-change",
      handleThemeChange
    );

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "youtube-theme-change",
        handleThemeChange
      );

      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, []);

  useEffect(() => {
    if (
      !mounted ||
      mode !== "auto"
    ) {
      return;
    }

    /*
     * Check once every minute because the
     * automatic theme can change when the
     * IST time crosses the configured window.
     */
    const intervalId =
      window.setInterval(
        () => {
          initializeTheme();
          syncTheme();
        },
        60 * 1000
      );

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, [
    mounted,
    mode,
  ]);

  const changeTheme =
    (
      nextMode: ThemeMode
    ) => {
      setThemeMode(
        nextMode
      );

      const resolved =
        resolveTheme(
          nextMode
        );

      setMode(
        nextMode
      );

      setCurrentTheme(
        resolved
      );

      applyResolvedTheme(
        resolved
      );

      /*
       * Tell Header, Login and any other
       * mounted theme component that the
       * preference changed.
       */
      window.dispatchEvent(
        new CustomEvent(
          "youtube-theme-change",
          {
            detail: {
              mode:
                nextMode,
              theme:
                resolved,
            },
          }
        )
      );
    };

  /*
   * Avoid rendering theme state before
   * the client has mounted.
   *
   * This prevents hydration mismatch.
   */
  if (
    !mounted
  ) {
    return (
      <div
        className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 p-1"
        aria-label="Theme selection"
      >
        <div className="h-9 w-9 rounded-full" />
        <div className="h-9 w-9 rounded-full" />
        <div className="h-9 w-9 rounded-full" />
      </div>
    );
  }

  const isLight =
    mode ===
    "light";

  const isAuto =
    mode ===
    "auto";

  const isDark =
    mode ===
    "dark";

  return (
    <div
      className="flex items-center gap-1 rounded-full border border-gray-200 bg-gray-100 p-1"
      aria-label="Theme selection"
    >
      {/* Light */}
      <button
        type="button"
        onClick={() =>
          changeTheme(
            "light"
          )
        }
        aria-label="Use light theme"
        title="Light theme"
        aria-pressed={
          isLight
        }
        className={`flex items-center justify-center rounded-full p-2 transition ${
          isLight
            ? "bg-white text-black shadow-sm"
            : "text-gray-600 hover:bg-gray-200"
        }`}
      >
        <Sun
          size={17}
          strokeWidth={
            isLight
              ? 2.2
              : 1.9
          }
        />
      </button>

      {/* Automatic */}
      <button
        type="button"
        onClick={() =>
          changeTheme(
            "auto"
          )
        }
        aria-label="Use automatic theme"
        title={`Automatic theme — currently ${currentTheme}`}
        aria-pressed={
          isAuto
        }
        className={`flex items-center justify-center rounded-full p-2 transition ${
          isAuto
            ? "bg-white text-black shadow-sm"
            : "text-gray-600 hover:bg-gray-200"
        }`}
      >
        <Monitor
          size={17}
          strokeWidth={
            isAuto
              ? 2.2
              : 1.9
          }
        />
      </button>

      {/* Dark */}
      <button
        type="button"
        onClick={() =>
          changeTheme(
            "dark"
          )
        }
        aria-label="Use dark theme"
        title="Dark theme"
        aria-pressed={
          isDark
        }
        className={`flex items-center justify-center rounded-full p-2 transition ${
          isDark
            ? "bg-white text-black shadow-sm"
            : "text-gray-600 hover:bg-gray-200"
        }`}
      >
        <Moon
          size={17}
          strokeWidth={
            isDark
              ? 2.2
              : 1.9
          }
        />
      </button>
    </div>
  );
}
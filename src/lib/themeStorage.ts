export type ThemeMode =
  | "light"
  | "dark"
  | "auto";

export type ResolvedTheme =
  | "light"
  | "dark";

const THEME_KEY =
  "youtube_theme_mode";

const LIGHT_START_HOUR = 6;
const DARK_START_HOUR = 18;

/* =========================================
   GET SAVED THEME MODE
========================================= */

export function getThemeMode(): ThemeMode {
  if (
    typeof window ===
    "undefined"
  ) {
    return "auto";
  }

  try {
    const stored =
      localStorage.getItem(
        THEME_KEY
      );

    if (
      stored === "light" ||
      stored === "dark" ||
      stored === "auto"
    ) {
      return stored;
    }
  } catch (error) {
    console.error(
      "Failed to read theme mode:",
      error
    );
  }

  return "auto";
}

/* =========================================
   SAVE THEME MODE
========================================= */

export function setThemeMode(
  mode: ThemeMode
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    localStorage.setItem(
      THEME_KEY,
      mode
    );
  } catch (error) {
    console.error(
      "Failed to save theme mode:",
      error
    );
  }

  applyTheme(mode);
}

/* =========================================
   GET AUTO THEME
========================================= */

export function getAutoTheme(): ResolvedTheme {
  const hour =
    new Date().getHours();

  if (
    hour >= LIGHT_START_HOUR &&
    hour < DARK_START_HOUR
  ) {
    return "light";
  }

  return "dark";
}

/* =========================================
   RESOLVE CURRENT THEME
========================================= */

export function resolveTheme(
  mode: ThemeMode
): ResolvedTheme {
  if (
    mode === "light"
  ) {
    return "light";
  }

  if (
    mode === "dark"
  ) {
    return "dark";
  }

  return getAutoTheme();
}

/* =========================================
   APPLY THEME TO DOCUMENT
========================================= */

export function applyTheme(
  mode: ThemeMode
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const theme =
    resolveTheme(mode);

  const html =
    document.documentElement;

  html.classList.remove(
    "theme-light",
    "theme-dark"
  );

  html.classList.add(
    theme === "dark"
      ? "theme-dark"
      : "theme-light"
  );

  html.setAttribute(
    "data-theme",
    theme
  );

  html.style.colorScheme =
    theme;

  /*
   * Useful for components that
   * need to react to a theme change.
   */
  window.dispatchEvent(
    new CustomEvent(
      "youtube-theme-updated",
      {
        detail: {
          mode,
          theme,
        },
      }
    )
  );
}

/* =========================================
   INITIALIZE THEME
========================================= */

export function initializeTheme() {
  if (
    typeof window ===
    "undefined"
  ) {
    return "light";
  }

  const mode =
    getThemeMode();

  const theme =
    resolveTheme(mode);

  applyTheme(mode);

  return theme;
}

/* =========================================
   GET CURRENT RESOLVED THEME
========================================= */

export function getCurrentTheme(): ResolvedTheme {
  if (
    typeof window ===
    "undefined"
  ) {
    return "light";
  }

  const mode =
    getThemeMode();

  return resolveTheme(mode);
}

/* =========================================
   TOGGLE LIGHT / DARK
========================================= */

export function toggleTheme():
  | "light"
  | "dark" {
  const current =
    getCurrentTheme();

  const next =
    current === "light"
      ? "dark"
      : "light";

  setThemeMode(next);

  return next;
}

/* =========================================
   RESET TO AUTO
========================================= */

export function resetToAutoTheme() {
  setThemeMode("auto");

  return getAutoTheme();
}

/* =========================================
   REFRESH AUTO THEME
========================================= */

export function refreshAutoTheme() {
  if (
    typeof window ===
    "undefined"
  ) {
    return "light";
  }

  const mode =
    getThemeMode();

  if (
    mode !== "auto"
  ) {
    return resolveTheme(
      mode
    );
  }

  applyTheme("auto");

  return getAutoTheme();
}

/* =========================================
   AUTO THEME WATCHER
========================================= */

export function startAutoThemeWatcher() {
  if (
    typeof window ===
    "undefined"
  ) {
    return () => {};
  }

  const updateTheme =
    () => {
      const mode =
        getThemeMode();

      if (
        mode === "auto"
      ) {
        applyTheme(
          "auto"
        );
      }
    };

  updateTheme();

  const intervalId =
    window.setInterval(
      updateTheme,
      60 * 1000
    );

  return () => {
    window.clearInterval(
      intervalId
    );
  };
}
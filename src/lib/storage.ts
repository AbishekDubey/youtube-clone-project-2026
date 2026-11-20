const HISTORY_KEY = "youtube_history";
const WATCH_LATER_KEY = "youtube_watch_later";
const LIKED_KEY = "youtube_liked";

function getIds(key: string): number[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const data = localStorage.getItem(key);

    if (!data) {
      return [];
    }

    const parsed = JSON.parse(data);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveIds(key: string, ids: number[]) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(key, JSON.stringify(ids));
}

/* =========================
   HISTORY
========================= */

export function getHistory(): number[] {
  return getIds(HISTORY_KEY);
}

export function addToHistory(id: number) {
  const history = getHistory().filter((item) => item !== id);

  history.unshift(id);

  saveIds(HISTORY_KEY, history.slice(0, 50));
}

export function clearHistory() {
  saveIds(HISTORY_KEY, []);
}

/* =========================
   WATCH LATER
========================= */

export function getWatchLater(): number[] {
  return getIds(WATCH_LATER_KEY);
}

export function toggleWatchLater(id: number): boolean {
  const items = getWatchLater();

  if (items.includes(id)) {
    saveIds(
      WATCH_LATER_KEY,
      items.filter((item) => item !== id)
    );

    return false;
  }

  saveIds(WATCH_LATER_KEY, [id, ...items]);

  return true;
}

/* =========================
   LIKED VIDEOS
========================= */

export function getLikedVideos(): number[] {
  return getIds(LIKED_KEY);
}

export function toggleLikedVideo(id: number): boolean {
  const items = getLikedVideos();

  if (items.includes(id)) {
    saveIds(
      LIKED_KEY,
      items.filter((item) => item !== id)
    );

    return false;
  }

  saveIds(LIKED_KEY, [id, ...items]);

  return true;
}
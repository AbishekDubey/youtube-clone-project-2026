
export type UserPlaylist = {
  id: string;
  name: string;
  description: string;
  videoIds: number[];
  createdAt: string;
  updatedAt: string;
};

const PLAYLISTS_KEY = "youtube_user_playlists";

function readPlaylists(): UserPlaylist[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(PLAYLISTS_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is UserPlaylist =>
        item !== null &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.description === "string" &&
        Array.isArray(item.videoIds) &&
        typeof item.createdAt === "string" &&
        typeof item.updatedAt === "string"
    );
  } catch (error) {
    console.error("Unable to read playlists:", error);
    return [];
  }
}

function writePlaylists(playlists: UserPlaylist[]): boolean {
  if (typeof window === "undefined") return false;

  try {
    localStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
    window.dispatchEvent(new Event("youtube-playlists-updated"));
    return true;
  } catch (error) {
    console.error("Unable to save playlists:", error);
    return false;
  }
}

export function getPlaylists(): UserPlaylist[] {
  return readPlaylists().sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() -
      new Date(a.updatedAt).getTime()
  );
}

export function getPlaylistById(
  id: string
): UserPlaylist | undefined {
  return readPlaylists().find((playlist) => playlist.id === id);
}

export function createPlaylist(
  name: string,
  description = ""
): UserPlaylist {
  const cleanName = name.trim();

  if (!cleanName) {
    throw new Error("Playlist name is required.");
  }

  if (cleanName.length > 100) {
    throw new Error("Playlist name must be 100 characters or fewer.");
  }

  const playlists = readPlaylists();
  const now = new Date().toISOString();

  const playlist: UserPlaylist = {
    id: `playlist_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    name: cleanName,
    description: description.trim().slice(0, 500),
    videoIds: [],
    createdAt: now,
    updatedAt: now,
  };

  if (!writePlaylists([playlist, ...playlists])) {
    throw new Error("Could not save playlist. Check browser storage.");
  }

  return playlist;
}

export function updatePlaylist(
  id: string,
  updates: { name?: string; description?: string }
): UserPlaylist | undefined {
  const playlists = readPlaylists();
  const existing = playlists.find((playlist) => playlist.id === id);

  if (!existing) return undefined;

  const name = updates.name?.trim() ?? existing.name;
  const description = updates.description?.trim() ?? existing.description;

  if (!name) throw new Error("Playlist name is required.");
  if (name.length > 100) throw new Error("Playlist name is too long.");

  const updated: UserPlaylist = {
    ...existing,
    name,
    description: description.slice(0, 500),
    updatedAt: new Date().toISOString(),
  };

  const next = playlists.map((playlist) =>
    playlist.id === id ? updated : playlist
  );

  if (!writePlaylists(next)) {
    throw new Error("Could not update playlist.");
  }

  return updated;
}

export function addVideoToPlaylist(
  playlistId: string,
  videoId: number
): boolean {
  const playlists = readPlaylists();
  const playlist = playlists.find((item) => item.id === playlistId);

  if (!playlist) return false;
  if (playlist.videoIds.includes(videoId)) return true;

  const updated = playlists.map((item) =>
    item.id === playlistId
      ? {
          ...item,
          videoIds: [...item.videoIds, videoId],
          updatedAt: new Date().toISOString(),
        }
      : item
  );

  return writePlaylists(updated);
}

export function removeVideoFromPlaylist(
  playlistId: string,
  videoId: number
): boolean {
  const playlists = readPlaylists();
  const playlist = playlists.find((item) => item.id === playlistId);

  if (!playlist) return false;

  const updated = playlists.map((item) =>
    item.id === playlistId
      ? {
          ...item,
          videoIds: item.videoIds.filter((id) => id !== videoId),
          updatedAt: new Date().toISOString(),
        }
      : item
  );

  return writePlaylists(updated);
}

export function deletePlaylist(playlistId: string): boolean {
  const playlists = readPlaylists();
  const updated = playlists.filter((item) => item.id !== playlistId);

  if (updated.length === playlists.length) return false;

  return writePlaylists(updated);
}

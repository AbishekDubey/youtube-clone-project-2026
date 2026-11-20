export type ChannelProfile = {
  name: string;
  username: string;
  description: string;
  avatar: string;
  banner: string;
};

const DB_NAME = "youtube_channel_database";
const STORE_NAME = "channel_profile";
const DB_VERSION = 1;

const DEFAULT_PROFILE: ChannelProfile = {
  name: "Abishek Dubey",
  username: "@abishekdubey",
  description:
    "Welcome to my channel. I share web development, React, Next.js, JavaScript, AI and technology content.",
  avatar: "",
  banner: "",
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(
        new Error("IndexedDB is only available in the browser.")
      );
      return;
    }

    const request = indexedDB.open(
      DB_NAME,
      DB_VERSION
    );

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
        });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(
        request.error ||
          new Error("Unable to open channel database.")
      );
    };
  });
}

export async function getChannelProfile(): Promise<ChannelProfile> {
  if (typeof window === "undefined") {
    return DEFAULT_PROFILE;
  }

  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        STORE_NAME,
        "readonly"
      );

      const store =
        transaction.objectStore(STORE_NAME);

      const request = store.get("profile");

      request.onsuccess = () => {
        db.close();

        if (!request.result) {
          resolve(DEFAULT_PROFILE);
          return;
        }

        resolve({
          ...DEFAULT_PROFILE,
          ...request.result.data,
        });
      };

      request.onerror = () => {
        db.close();

        reject(
          request.error ||
            new Error(
              "Unable to read channel profile."
            )
        );
      };
    });
  } catch (error) {
    console.error(
      "Failed to load channel profile:",
      error
    );

    return DEFAULT_PROFILE;
  }
}

export async function saveChannelProfile(
  profile: ChannelProfile
): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readwrite"
    );

    const store =
      transaction.objectStore(STORE_NAME);

    store.put({
      id: "profile",
      data: profile,
    });

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();

      reject(
        transaction.error ||
          new Error(
            "Unable to save channel profile."
          )
      );
    };
  });
}

export async function resetChannelProfile(): Promise<void> {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(
      STORE_NAME,
      "readwrite"
    );

    const store =
      transaction.objectStore(STORE_NAME);

    store.delete("profile");

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();

      reject(
        transaction.error ||
          new Error(
            "Unable to reset channel profile."
          )
      );
    };
  });
}
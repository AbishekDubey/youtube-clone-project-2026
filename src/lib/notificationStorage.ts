export type NotificationItem = {
  id: number;
  title: string;
  message: string;
  time: string;
  read: boolean;
};

const NOTIFICATION_KEY = "youtube_notifications";

function getStoredNotifications(): NotificationItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const data = localStorage.getItem(
      NOTIFICATION_KEY
    );

    if (!data) {
      return [];
    }

    const parsed = JSON.parse(data);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function saveNotifications(
  notifications: NotificationItem[]
) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(
    NOTIFICATION_KEY,
    JSON.stringify(notifications)
  );

  window.dispatchEvent(
    new Event("youtube-notifications-updated")
  );
}

export function getNotifications() {
  return getStoredNotifications();
}

export function addNotification(
  title: string,
  message: string
) {
  const notifications =
    getStoredNotifications();

  const newNotification: NotificationItem = {
    id: Date.now(),
    title,
    message,
    time: "Just now",
    read: false,
  };

  saveNotifications([
    newNotification,
    ...notifications,
  ].slice(0, 50));
}

export function markNotificationAsRead(
  id: number
) {
  const notifications =
    getStoredNotifications();

  saveNotifications(
    notifications.map((item) =>
      item.id === id
        ? { ...item, read: true }
        : item
    )
  );
}

export function markAllNotificationsAsRead() {
  const notifications =
    getStoredNotifications();

  saveNotifications(
    notifications.map((item) => ({
      ...item,
      read: true,
    }))
  );
}

export function clearNotifications() {
  saveNotifications([]);
}
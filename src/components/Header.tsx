import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/router";
import type { KeyboardEvent } from "react";

import {
  Bell,
  Menu,
  Mic,
  Search,
  UserCircle,
  Video,
  X,
  Settings,
  LogOut,
  User,
  MessageSquare,
  Radio,
  ShieldCheck,
} from "lucide-react";

import ThemeToggle from "@/components/ThemeToggle";

import {
  getCurrentUser,
  logoutUser,
  type User as AuthUser,
} from "@/lib/auth";

import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationItem,
} from "@/lib/notificationStorage";

type HeaderProps = {
  onMenuClick: () => void;
};

export default function Header({
  onMenuClick,
}: HeaderProps) {
  const router =
    useRouter();

  const [search, setSearch] =
    useState("");

  const [mobileSearch, setMobileSearch] =
    useState(false);

  const [profileOpen, setProfileOpen] =
    useState(false);

  const [notificationOpen, setNotificationOpen] =
    useState(false);

  const [createOpen, setCreateOpen] =
    useState(false);

  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);

  const [themeMounted, setThemeMounted] =
    useState(false);

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  useEffect(() => {
    setUser(
      getCurrentUser()
    );
  }, []);

  useEffect(() => {
    const loadNotifications =
      () => {
        setNotifications(
          getNotifications()
        );
      };

    loadNotifications();

    window.addEventListener(
      "youtube-notifications-updated",
      loadNotifications
    );

    return () => {
      window.removeEventListener(
        "youtube-notifications-updated",
        loadNotifications
      );
    };
  }, []);

  const closeMenus = () => {
    setProfileOpen(false);
    setNotificationOpen(false);
    setCreateOpen(false);
  };

  const handleSearch = () => {
    const query =
      search.trim();

    if (!query) {
      return;
    }

    router.push(
      `/search?q=${encodeURIComponent(
        query
      )}`
    );

    setSearch("");
    setMobileSearch(false);
    closeMenus();
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement>
  ) => {
    if (
      event.key ===
      "Enter"
    ) {
      handleSearch();
    }
  };

  const handleHome = () => {
    router.push("/");

    setMobileSearch(false);
    closeMenus();
  };

  const handleChannel = () => {
    router.push(
      "/channel"
    );

    closeMenus();
  };

  const handleSettings = () => {
    router.push(
      "/settings"
    );

    closeMenus();
  };

  const handleDevices = () => {
    router.push(
      "/devices"
    );

    closeMenus();
  };

  const handleSecurity = () => {
    router.push(
      "/security"
    );

    closeMenus();
  };

  const handleFeedback = () => {
    router.push(
      "/feedback"
    );

    closeMenus();
  };

  const handleLogin = () => {
    router.push(
      "/login"
    );

    closeMenus();
  };

  const handleSignup = () => {
    router.push(
      "/signup"
    );

    closeMenus();
  };

  const handleLogout = () => {
    logoutUser();

    setUser(null);

    closeMenus();

    router.push("/");
  };

  const handleUpload = () => {
    setCreateOpen(false);

    router.push(
      "/upload"
    );
  };

  const unreadCount =
    notifications.filter(
      (notification) =>
        !notification.read
    ).length;

  return (
    <header className="fixed left-0 right-0 top-0 z-50 h-16 border-b border-gray-200 bg-white text-black">
      <div className="flex h-full items-center justify-between px-2 sm:px-4">
        {/* LEFT */}
        <div className="flex min-w-0 items-center gap-1 sm:gap-2 md:gap-4">
          <button
            type="button"
            aria-label="Menu"
            onClick={
              onMenuClick
            }
            className="shrink-0 rounded-full p-2 transition hover:bg-gray-100"
          >
            <Menu
              size={24}
              strokeWidth={2}
            />
          </button>

          <button
            type="button"
            onClick={
              handleHome
            }
            aria-label="YouTube Home"
            className="flex shrink-0 items-center gap-1"
          >
            <div className="flex h-7 w-10 items-center justify-center rounded-lg bg-red-600">
              <span className="text-sm font-bold text-white">
                ▶
              </span>
            </div>

            <span className="hidden text-xl font-bold tracking-tight sm:inline">
              YouTube
            </span>

            <span className="text-lg font-bold tracking-tight sm:hidden">
              YT
            </span>
          </button>
        </div>

        {/* DESKTOP SEARCH */}
        <div className="hidden flex-1 justify-center px-3 sm:flex md:px-6 lg:px-10">
          <div className="flex w-full max-w-2xl items-center">
            <input
              type="text"
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
              onKeyDown={
                handleKeyDown
              }
              placeholder="Search"
              aria-label="Search"
              className="h-10 min-w-0 flex-1 rounded-l-full border border-gray-300 bg-white px-4 text-sm text-black outline-none placeholder:text-gray-500 focus:border-blue-500 sm:px-5"
            />

            <button
              type="button"
              onClick={
                handleSearch
              }
              aria-label="Search"
              className="flex h-10 w-14 shrink-0 items-center justify-center rounded-r-full border border-l-0 border-gray-300 bg-gray-50 transition hover:bg-gray-100"
            >
              <Search
                size={20}
              />
            </button>

            <button
              type="button"
              aria-label="Voice search"
              className="ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 transition hover:bg-gray-200"
            >
              <Mic
                size={20}
              />
            </button>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {/* Mobile Search */}
          <button
            type="button"
            onClick={() => {
              setMobileSearch(
                true
              );

              closeMenus();
            }}
            aria-label="Open search"
            className="rounded-full p-2 transition hover:bg-gray-100 sm:hidden"
          >
            <Search
              size={22}
            />
          </button>

          {/* Theme */}
          {themeMounted && (
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
          )}

          {/* Create */}
          <div className="relative hidden md:block">
            <button
              type="button"
              aria-label="Create"
              onClick={() => {
                setCreateOpen(
                  (
                    previous
                  ) =>
                    !previous
                );

                setProfileOpen(
                  false
                );

                setNotificationOpen(
                  false
                );
              }}
              className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium transition hover:bg-gray-200"
            >
              <Video
                size={20}
              />
              Create
            </button>

            {createOpen && (
              <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-2 shadow-xl">
                <button
                  type="button"
                  onClick={
                    handleUpload
                  }
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-100"
                >
                  <Video
                    size={20}
                  />
                  Upload video
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCreateOpen(
                      false
                    );

                    alert(
                      "Go Live feature coming soon."
                    );
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-100"
                >
                  <Radio
                    size={20}
                  />
                  Go live
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCreateOpen(
                      false
                    );

                    alert(
                      "Create Post feature coming soon."
                    );
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-100"
                >
                  <MessageSquare
                    size={20}
                  />
                  Create post
                </button>
              </div>
            )}
          </div>

          {/* Mobile Theme */}
          {themeMounted && (
            <div className="sm:hidden">
              <ThemeToggle />
            </div>
          )}

          {/* Notifications */}
          <div className="relative">
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => {
                setNotificationOpen(
                  (
                    previous
                  ) =>
                    !previous
                );

                setProfileOpen(
                  false
                );

                setCreateOpen(
                  false
                );
              }}
              className="relative rounded-full p-2 transition hover:bg-gray-100"
            >
              <Bell
                size={22}
              />

              {unreadCount >
                0 && (
                <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-600" />
              )}
            </button>

            {notificationOpen && (
              <div className="absolute right-0 top-12 w-[calc(100vw-24px)] max-w-80 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold">
                      Notifications
                    </h3>

                    {unreadCount >
                      0 && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                        {
                          unreadCount
                        }
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setNotificationOpen(
                        false
                      )
                    }
                    aria-label="Close notifications"
                    className="rounded-full p-1 hover:bg-gray-100"
                  >
                    <X
                      size={18}
                    />
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.length >
                  0 ? (
                    notifications.map(
                      (
                        notification
                      ) => (
                        <button
                          key={
                            notification.id
                          }
                          type="button"
                          onClick={() => {
                            markNotificationAsRead(
                              notification.id
                            );

                            setNotifications(
                              getNotifications()
                            );
                          }}
                          className={`flex w-full gap-3 px-4 py-4 text-left ${
                            notification.read
                              ? "hover:bg-gray-100"
                              : "bg-blue-50 hover:bg-blue-100"
                          }`}
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100">
                            <Bell
                              size={18}
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-semibold">
                              {
                                notification.title
                              }
                            </p>

                            <p className="mt-1 text-xs leading-4 text-gray-500">
                              {
                                notification.message
                              }
                            </p>

                            <p className="mt-1 text-xs text-gray-400">
                              {
                                notification.time
                              }
                            </p>
                          </div>
                        </button>
                      )
                    )
                  ) : (
                    <div className="px-6 py-12 text-center">
                      <Bell
                        size={36}
                        className="mx-auto text-gray-300"
                      />

                      <p className="mt-4 text-sm font-medium">
                        No notifications
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        You're all caught up.
                      </p>
                    </div>
                  )}
                </div>

                {unreadCount >
                  0 && (
                  <button
                    type="button"
                    onClick={() => {
                      markAllNotificationsAsRead();

                      setNotifications(
                        getNotifications()
                      );
                    }}
                    className="w-full border-t border-gray-200 py-3 text-sm font-medium text-blue-600 hover:bg-gray-50"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative">
            <button
              type="button"
              aria-label="Profile"
              onClick={() => {
                setProfileOpen(
                  (
                    previous
                  ) =>
                    !previous
                );

                setNotificationOpen(
                  false
                );

                setCreateOpen(
                  false
                );
              }}
              className="rounded-full p-1 transition hover:bg-gray-100"
            >
              <UserCircle
                size={30}
              />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-12 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white py-2 shadow-xl">
                {user ? (
                  <>
                    <div className="border-b border-gray-200 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <UserCircle
                          size={42}
                          className="shrink-0"
                        />

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {
                              user.name
                            }
                          </p>

                          <p className="truncate text-xs text-gray-500">
                            {
                              user.email
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={
                        handleChannel
                      }
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-100"
                    >
                      <User
                        size={19}
                      />
                      Your channel
                    </button>

                    <button
                      type="button"
                      onClick={
                        handleSettings
                      }
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-100"
                    >
                      <Settings
                        size={19}
                      />
                      Settings
                    </button>

                    <button
                      type="button"
                      onClick={
                        handleDevices
                      }
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-100"
                    >
                      <ShieldCheck
                        size={19}
                      />
                      Your devices
                    </button>

                    <button
                      type="button"
                      onClick={
                        handleSecurity
                      }
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-100"
                    >
                      <ShieldCheck
                        size={19}
                      />
                      Account security
                    </button>

                    <button
                      type="button"
                      onClick={
                        handleFeedback
                      }
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-100"
                    >
                      <MessageSquare
                        size={19}
                      />
                      Send feedback
                    </button>

                    <div className="my-1 border-t border-gray-200" />

                    <button
                      type="button"
                      onClick={
                        handleLogout
                      }
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-100"
                    >
                      <LogOut
                        size={19}
                      />
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <div className="border-b border-gray-200 px-4 py-4">
                      <p className="text-sm font-semibold">
                        Welcome to YouTube Clone
                      </p>

                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        Sign in to like videos, subscribe and upload
                        content.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={
                        handleLogin
                      }
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-blue-600 hover:bg-blue-50"
                    >
                      <User
                        size={19}
                      />
                      Sign in
                    </button>

                    <button
                      type="button"
                      onClick={
                        handleSignup
                      }
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-gray-100"
                    >
                      <UserCircle
                        size={19}
                      />
                      Create account
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search */}
      {mobileSearch && (
        <div className="absolute inset-0 flex h-16 items-center gap-2 bg-white px-2 sm:hidden">
          <button
            type="button"
            onClick={() =>
              setMobileSearch(
                false
              )
            }
            aria-label="Close search"
            className="shrink-0 rounded-full p-2 hover:bg-gray-100"
          >
            <X
              size={22}
            />
          </button>

          <input
            autoFocus
            type="text"
            value={search}
            onChange={(
              event
            ) =>
              setSearch(
                event.target
                  .value
              )
            }
            onKeyDown={
              handleKeyDown
            }
            placeholder="Search"
            aria-label="Search"
            className="h-10 min-w-0 flex-1 rounded-full border border-gray-300 bg-white px-4 text-sm text-black outline-none placeholder:text-gray-500 focus:border-blue-500"
          />

          <button
            type="button"
            onClick={
              handleSearch
            }
            aria-label="Search"
            className="shrink-0 rounded-full bg-gray-100 p-2 hover:bg-gray-200"
          >
            <Search
              size={20}
            />
          </button>
        </div>
      )}
    </header>
  );
}
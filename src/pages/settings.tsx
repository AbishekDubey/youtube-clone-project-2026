import { useState } from "react";
import {
  Settings as SettingsIcon,
  Bell,
  PlayCircle,
  ShieldCheck,
  User,
  Palette,
  ChevronRight,
} from "lucide-react";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

export default function SettingsPage() {
  const [autoplay, setAutoplay] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [restrictedMode, setRestrictedMode] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <main
      className={`min-h-screen transition-colors ${
        darkMode
          ? "bg-gray-950 text-white"
          : "bg-white text-black"
      }`}
    >
      <Header onMenuClick={() => {}} />

      <Sidebar
        isOpen={true}
        onClose={() => {}}
      />

      <MobileNav />

      <section className="pt-16 lg:ml-64">
        <div className="mx-auto max-w-4xl px-4 pb-20 pt-6 sm:px-6 lg:pb-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <SettingsIcon size={28} />

              <h1 className="text-2xl font-bold md:text-3xl">
                Settings
              </h1>
            </div>

            <p
              className={`mt-2 text-sm ${
                darkMode
                  ? "text-gray-400"
                  : "text-gray-500"
              }`}
            >
              Manage your YouTube Clone preferences
            </p>
          </div>

          {/* Account */}
          <section className="mb-6 overflow-hidden rounded-xl border border-gray-200">
            <div className="border-b border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <User size={22} />

                <div>
                  <h2 className="font-semibold">
                    Account
                  </h2>

                  <p className="text-sm text-gray-500">
                    Manage your account information
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-gray-50"
            >
              <div>
                <p className="text-sm font-medium">
                  Profile
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Abishek Dubey
                </p>
              </div>

              <ChevronRight size={19} />
            </button>

            <button
              type="button"
              className="flex w-full items-center justify-between border-t border-gray-200 px-5 py-4 text-left transition hover:bg-gray-50"
            >
              <div>
                <p className="text-sm font-medium">
                  Email
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Your account email
                </p>
              </div>

              <ChevronRight size={19} />
            </button>
          </section>

          {/* Appearance */}
          <section className="mb-6 overflow-hidden rounded-xl border border-gray-200">
            <div className="border-b border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <Palette size={22} />

                <div>
                  <h2 className="font-semibold">
                    Appearance
                  </h2>

                  <p className="text-sm text-gray-500">
                    Customize how the website looks
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium">
                  Dark mode
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Switch between light and dark appearance
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDarkMode((prev) => !prev)}
                className={`relative h-6 w-11 rounded-full transition ${
                  darkMode
                    ? "bg-black"
                    : "bg-gray-300"
                }`}
                aria-label="Toggle dark mode"
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                    darkMode
                      ? "left-6"
                      : "left-1"
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Playback */}
          <section className="mb-6 overflow-hidden rounded-xl border border-gray-200">
            <div className="border-b border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <PlayCircle size={22} />

                <div>
                  <h2 className="font-semibold">
                    Playback
                  </h2>

                  <p className="text-sm text-gray-500">
                    Control how videos play
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium">
                  Autoplay
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Automatically play the next video
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAutoplay((prev) => !prev)}
                className={`relative h-6 w-11 rounded-full transition ${
                  autoplay
                    ? "bg-black"
                    : "bg-gray-300"
                }`}
                aria-label="Toggle autoplay"
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                    autoplay
                      ? "left-6"
                      : "left-1"
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Notifications */}
          <section className="mb-6 overflow-hidden rounded-xl border border-gray-200">
            <div className="border-b border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <Bell size={22} />

                <div>
                  <h2 className="font-semibold">
                    Notifications
                  </h2>

                  <p className="text-sm text-gray-500">
                    Choose what notifications you receive
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium">
                  Notifications
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Receive notifications about new activity
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setNotifications((prev) => !prev)
                }
                className={`relative h-6 w-11 rounded-full transition ${
                  notifications
                    ? "bg-black"
                    : "bg-gray-300"
                }`}
                aria-label="Toggle notifications"
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                    notifications
                      ? "left-6"
                      : "left-1"
                  }`}
                />
              </button>
            </div>
          </section>

          {/* Privacy */}
          <section className="mb-6 overflow-hidden rounded-xl border border-gray-200">
            <div className="border-b border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <ShieldCheck size={22} />

                <div>
                  <h2 className="font-semibold">
                    Privacy
                  </h2>

                  <p className="text-sm text-gray-500">
                    Manage your privacy preferences
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-sm font-medium">
                  Restricted Mode
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Help hide potentially inappropriate content
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setRestrictedMode((prev) => !prev)
                }
                className={`relative h-6 w-11 rounded-full transition ${
                  restrictedMode
                    ? "bg-black"
                    : "bg-gray-300"
                }`}
                aria-label="Toggle restricted mode"
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                    restrictedMode
                      ? "left-6"
                      : "left-1"
                  }`}
                />
              </button>
            </div>
          </section>

          {/* About */}
          <section
            className={`rounded-xl border p-5 ${
              darkMode
                ? "border-gray-800"
                : "border-gray-200"
            }`}
          >
            <h2 className="font-semibold">
              YouTube Clone
            </h2>

            <p
              className={`mt-2 text-sm ${
                darkMode
                  ? "text-gray-400"
                  : "text-gray-500"
              }`}
            >
              Version 1.0.0
            </p>

            <p
              className={`mt-4 text-xs leading-5 ${
                darkMode
                  ? "text-gray-500"
                  : "text-gray-400"
              }`}
            >
              This is a frontend YouTube clone project built
              with Next.js, TypeScript and Tailwind CSS.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
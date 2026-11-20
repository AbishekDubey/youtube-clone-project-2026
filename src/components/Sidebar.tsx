import {
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/router";
import type { LucideIcon } from "lucide-react";

import {
  Home,
  PlaySquare,
  Bell,
  History,
  ListVideo,
  Video,
  Clock3,
  ThumbsUp,
  Download,
  Crown,
  ShieldCheck,
  Flame,
  Music2,
  Film,
  Radio,
  Gamepad2,
  Trophy,
  Settings,
  Flag,
  HelpCircle,
  MessageSquare,
} from "lucide-react";

type MenuItem = {
  label: string;
  icon: LucideIcon;
  href: string;
};

type SidebarProps = {
  isOpen?: boolean;
  onClose?: () => void;
};

const mainMenu: MenuItem[] = [
  {
    label: "Home",
    icon: Home,
    href: "/",
  },
  {
    label: "Shorts",
    icon: PlaySquare,
    href: "/shorts",
  },
  {
    label: "Subscriptions",
    icon: Bell,
    href: "/subscriptions",
  },
];

const youMenu: MenuItem[] = [
  {
    label: "History",
    icon: History,
    href: "/history",
  },
  {
    label: "Playlists",
    icon: ListVideo,
    href: "/playlists",
  },
  {
    label: "Your videos",
    icon: Video,
    href: "/your-videos",
  },
  {
    label: "Watch later",
    icon: Clock3,
    href: "/watch-later",
  },
  {
    label: "Liked videos",
    icon: ThumbsUp,
    href: "/liked-videos",
  },
  {
    label: "Downloads",
    icon: Download,
    href: "/downloads",
  },
  {
    label: "Membership",
    icon: Crown,
    href: "/membership",
  },
  {
    label: "Your devices",
    icon: ShieldCheck,
    href: "/devices",
  },
  {
    label: "Video call",
    icon: Video,
    href: "/call",
  },
];

const exploreMenu: MenuItem[] = [
  {
    label: "Trending",
    icon: Flame,
    href: "/explore/trending",
  },
  {
    label: "Music",
    icon: Music2,
    href: "/explore/music",
  },
  {
    label: "Movies & TV",
    icon: Film,
    href: "/explore/movies-tv",
  },
  {
    label: "Live",
    icon: Radio,
    href: "/explore/live",
  },
  {
    label: "Gaming",
    icon: Gamepad2,
    href: "/explore/gaming",
  },
  {
    label: "Sports",
    icon: Trophy,
    href: "/explore/sports",
  },
];

const settingsMenu: MenuItem[] = [
  {
    label: "Settings",
    icon: Settings,
    href: "/settings",
  },
  {
    label: "Account security",
    icon: ShieldCheck,
    href: "/security",
  },
  {
    label: "Report history",
    icon: Flag,
    href: "/report-history",
  },
  {
    label: "Help",
    icon: HelpCircle,
    href: "/help",
  },
  {
    label: "Send feedback",
    icon: MessageSquare,
    href: "/feedback",
  },
];

function MenuItemList({
  items,
  onClose,
  hydrated,
}: {
  items: MenuItem[];
  onClose: () => void;
  hydrated: boolean;
}) {
  const router = useRouter();

  const handleNavigate = (
    href: string
  ) => {
    onClose();

    void router.push(
      href
    );
  };

  return (
    <div className="space-y-1">
      {items.map(
        ({
          label,
          icon: Icon,
          href,
        }) => {
          const isExploreRoute =
            href.startsWith(
              "/explore/"
            );

          const currentCategory =
            typeof router.query
              .category === "string"
              ? router.query
                  .category
              : "";

          const active =
            hydrated &&
            (
              router.pathname ===
                href ||
              (
                isExploreRoute &&
                router.pathname ===
                  "/explore/[category]" &&
                currentCategory ===
                  href.split(
                    "/"
                  )[2]
              )
            );

          return (
            <button
              key={href}
              type="button"
              onClick={() =>
                handleNavigate(
                  href
                )
              }
              className={`flex w-full items-center gap-5 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                active
                  ? "bg-gray-100 text-black"
                  : "text-gray-800 hover:bg-gray-100"
              }`}
            >
              <Icon
                size={21}
                strokeWidth={
                  active
                    ? 2.2
                    : 1.9
                }
              />

              <span>
                {label}
              </span>
            </button>
          );
        }
      )}
    </div>
  );
}

export default function Sidebar({
  isOpen = true,
  onClose = () => {},
}: SidebarProps) {
  const [
    hydrated,
    setHydrated,
  ] = useState(false);

  useEffect(() => {
    setHydrated(
      true
    );
  }, []);

  return (
    <>
      {/* Mobile / Tablet Overlay */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-16 z-50 h-[calc(100vh-64px)] w-64 overflow-y-auto bg-white px-3 shadow-lg transition-transform duration-300 lg:shadow-none ${
          isOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {/* Main */}
        <div className="border-b border-gray-200 py-3">
          <MenuItemList
            items={
              mainMenu
            }
            onClose={
              onClose
            }
            hydrated={
              hydrated
            }
          />
        </div>

        {/* You */}
        <div className="border-b border-gray-200 py-3">
          <h2 className="px-4 pb-2 text-base font-semibold">
            You
          </h2>

          <MenuItemList
            items={
              youMenu
            }
            onClose={
              onClose
            }
            hydrated={
              hydrated
            }
          />
        </div>

        {/* Explore */}
        <div className="border-b border-gray-200 py-3">
          <h2 className="px-4 pb-2 text-base font-semibold">
            Explore
          </h2>

          <MenuItemList
            items={
              exploreMenu
            }
            onClose={
              onClose
            }
            hydrated={
              hydrated
            }
          />
        </div>

        {/* Settings */}
        <div className="py-3">
          <MenuItemList
            items={
              settingsMenu
            }
            onClose={
              onClose
            }
            hydrated={
              hydrated
            }
          />
        </div>

        {/* Footer */}
        <div className="px-4 pb-8 pt-2 text-xs leading-5 text-gray-500">
          <p>
            About · Press · Copyright
          </p>

          <p>
            Contact us · Creators · Advertise
          </p>

          <p>
            Terms · Privacy · Policy & Safety
          </p>

          <p className="mt-4">
            © 2026 YouTube Clone
          </p>
        </div>
      </aside>
    </>
  );
}
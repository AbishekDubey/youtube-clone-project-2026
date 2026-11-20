import {
  Home,
  PlaySquare,
  Bell,
  UserCircle,
} from "lucide-react";
import { useRouter } from "next/router";

export default function MobileNav() {
  const router = useRouter();

  const items = [
    {
      label: "Home",
      icon: Home,
      path: "/",
    },
    {
      label: "Shorts",
      icon: PlaySquare,
      path: "/shorts",
    },
    {
        label: "Subscriptions",
        icon: Bell,
        path: "/subscriptions",
    },
    {
      label: "You",
      icon: UserCircle,
      path: "/",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-gray-200 bg-white lg:hidden">
      {items.map(({ label, icon: Icon, path }) => {
        const active = router.pathname === path;

        return (
          <button
            key={label}
            type="button"
            onClick={() => router.push(path)}
            className={`flex flex-col items-center gap-1 ${
              active
                ? "text-black"
                : "text-gray-500"
            }`}
          >
            <Icon
              size={21}
              strokeWidth={active ? 2.3 : 1.8}
            />

            <span className="text-[10px]">
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
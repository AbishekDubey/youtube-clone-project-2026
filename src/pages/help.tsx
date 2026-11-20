import {
  HelpCircle,
  Search,
  BookOpen,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <Header onMenuClick={() => {}} />

      <Sidebar
        isOpen={true}
        onClose={() => {}}
      />

      <MobileNav />

      <section className="pt-16 lg:ml-64">
        <div className="mx-auto max-w-5xl px-4 pb-20 pt-6 sm:px-6 lg:pb-8">
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <HelpCircle size={28} />

              <h1 className="text-2xl font-bold md:text-3xl">
                Help
              </h1>
            </div>

            <p className="mt-2 text-sm text-gray-500">
              Find answers and learn how to use YouTube Clone
            </p>
          </div>

          <div className="mb-8 flex items-center rounded-full border border-gray-300 px-4 py-3">
            <Search size={20} className="text-gray-500" />

            <input
              type="text"
              placeholder="Search help"
              className="ml-3 w-full bg-transparent text-sm outline-none"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 p-5 hover:shadow-md">
              <BookOpen size={24} />

              <h2 className="mt-4 text-lg font-semibold">
                Getting started
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Learn about navigation, video playback,
                search and other basic features.
              </p>

              <button
                type="button"
                className="mt-4 text-sm font-semibold text-blue-600"
              >
                Learn more
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 p-5 hover:shadow-md">
              <MessageCircle size={24} />

              <h2 className="mt-4 text-lg font-semibold">
                Account and profile
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Manage your profile, subscriptions,
                settings and account preferences.
              </p>

              <button
                type="button"
                className="mt-4 text-sm font-semibold text-blue-600"
              >
                Learn more
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 p-5 hover:shadow-md">
              <ShieldCheck size={24} />

              <h2 className="mt-4 text-lg font-semibold">
                Privacy and safety
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Learn about privacy controls, restricted
                mode and content safety.
              </p>

              <button
                type="button"
                className="mt-4 text-sm font-semibold text-blue-600"
              >
                Learn more
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 p-5 hover:shadow-md">
              <HelpCircle size={24} />

              <h2 className="mt-4 text-lg font-semibold">
                Common questions
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Find solutions for common issues with the
                website.
              </p>

              <button
                type="button"
                className="mt-4 text-sm font-semibold text-blue-600"
              >
                View questions
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
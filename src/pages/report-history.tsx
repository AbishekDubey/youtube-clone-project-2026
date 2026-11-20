import { useState } from "react";
import {
  Flag,
  CheckCircle2,
} from "lucide-react";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

type Report = {
  id: number;
  content: string;
  reason: string;
  date: string;
  status: "Under review" | "Resolved";
};

export default function ReportHistoryPage() {
  const [reports] = useState<Report[]>([
    {
      id: 1,
      content: "Example video",
      reason: "Inappropriate content",
      date: "September 8, 2026",
      status: "Under review",
    },
    {
      id: 2,
      content: "Example channel",
      reason: "Spam",
      date: "September 5, 2026",
      status: "Resolved",
    },
  ]);

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
              <Flag size={28} />

              <h1 className="text-2xl font-bold md:text-3xl">
                Report History
              </h1>
            </div>

            <p className="mt-2 text-sm text-gray-500">
              View your submitted reports and their status
            </p>
          </div>

          {reports.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <div className="hidden grid-cols-[1.4fr_1.5fr_1fr_1fr] gap-4 border-b border-gray-200 bg-gray-50 px-5 py-4 text-sm font-semibold md:grid">
                <span>Content</span>
                <span>Reason</span>
                <span>Date</span>
                <span>Status</span>
              </div>

              {reports.map((report) => (
                <div
                  key={report.id}
                  className="grid gap-3 border-b border-gray-200 px-5 py-4 last:border-b-0 md:grid-cols-[1.4fr_1.5fr_1fr_1fr] md:items-center md:gap-4"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {report.content}
                    </p>

                    <p className="mt-1 text-xs text-gray-500 md:hidden">
                      {report.reason}
                    </p>
                  </div>

                  <p className="hidden text-sm text-gray-600 md:block">
                    {report.reason}
                  </p>

                  <p className="text-xs text-gray-500 md:text-sm">
                    {report.date}
                  </p>

                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      size={16}
                      className={
                        report.status === "Resolved"
                          ? "text-green-600"
                          : "text-yellow-600"
                      }
                    />

                    <span className="text-sm">
                      {report.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[350px] items-center justify-center text-center">
              <div>
                <Flag
                  size={48}
                  className="mx-auto text-gray-400"
                />

                <h2 className="mt-4 text-xl font-semibold">
                  No reports
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Your submitted reports will appear here.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
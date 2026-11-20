import { useState } from "react";
import {
  MessageSquare,
  Send,
  CheckCircle2,
} from "lucide-react";

import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = () => {
    if (!feedback.trim()) return;

    setSent(true);
    setFeedback("");
  };

  return (
    <main className="min-h-screen bg-white text-black">
      <Header onMenuClick={() => {}} />

      <Sidebar
        isOpen={true}
        onClose={() => {}}
      />

      <MobileNav />

      <section className="pt-16 lg:ml-64">
        <div className="mx-auto max-w-3xl px-4 pb-20 pt-6 sm:px-6 lg:pb-8">
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <MessageSquare size={28} />

              <h1 className="text-2xl font-bold md:text-3xl">
                Send Feedback
              </h1>
            </div>

            <p className="mt-2 text-sm text-gray-500">
              Help us improve the YouTube Clone experience
            </p>
          </div>

          {sent ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
              <CheckCircle2
                size={48}
                className="mx-auto text-green-600"
              />

              <h2 className="mt-4 text-xl font-semibold">
                Thanks for your feedback!
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                Your feedback has been submitted successfully.
              </p>

              <button
                type="button"
                onClick={() => setSent(false)}
                className="mt-5 rounded-full bg-black px-5 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Send another
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 p-5 sm:p-6">
              <label
                htmlFor="feedback"
                className="text-sm font-semibold"
              >
                Your feedback
              </label>

              <textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Tell us what you think..."
                rows={7}
                className="mt-3 w-full resize-none rounded-xl border border-gray-300 p-4 text-sm outline-none focus:border-blue-500"
              />

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!feedback.trim()}
                  className="flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  <Send size={17} />
                  Send feedback
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
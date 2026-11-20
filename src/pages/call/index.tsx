import { useState } from "react";
import { useRouter } from "next/router";
import { Video, Users, Link2, ArrowRight, ShieldCheck, Mic, Camera, MonitorUp, Loader2 } from "lucide-react";
import { prepareCallMedia, clearPreparedCallMedia } from "@/lib/callMedia";

const ROOM_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

function generateRoomId() {
  let roomId = "";
  for (let index = 0; index < 10; index += 1) {
    roomId += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
  }
  return roomId;
}

function extractRoomId(value: string) {
  const input = value.trim();

  if (!input) {
    return "";
  }

  // Plain room ID:
  // 14bw3g016n
  if (/^[a-zA-Z0-9_-]+$/.test(input)) {
    return input;
  }

  // Full meeting URL:
  // http://localhost:3000/call/14bw3g016n?host=1
  try {
    const url = new URL(input);
    const segments = url.pathname
      .split("/")
      .filter(Boolean);

    const callIndex = segments.findIndex(
      (segment) => segment.toLowerCase() === "call"
    );

    if (callIndex >= 0 && segments[callIndex + 1]) {
      return decodeURIComponent(segments[callIndex + 1])
        .replace(/[^a-zA-Z0-9_-]/g, "");
    }
  } catch {
    // Fall through to regex extraction.
  }

  // Handles pasted paths such as:
  // /call/14bw3g016n?host=1
  const match = input.match(/\/call\/([^/?#]+)/i);

  if (match?.[1]) {
    return decodeURIComponent(match[1])
      .replace(/[^a-zA-Z0-9_-]/g, "");
  }

  return "";
}


function getMediaErrorMessage(error: unknown, action: "start" | "join") {
  if (error instanceof DOMException) {
    switch (error.name) {
      case "NotAllowedError": return "Camera and microphone permission was denied. Please allow access in the browser and try again.";
      case "NotFoundError": return "No camera or microphone was found on this device.";
      case "NotReadableError": return "Camera or microphone is already being used by another application.";
      case "OverconstrainedError": return "The selected camera or microphone settings are not available.";
      case "SecurityError": return "The browser blocked camera or microphone access for security reasons.";
      default: return `Unable to ${action === "start" ? "start" : "join"} the meeting. Please check your camera and microphone.`;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return `Unable to ${action === "start" ? "start" : "join"} the meeting. Please try again.`;
}

export default function CallHomePage() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  const createMeeting = async () => {
    if (starting) return;
    setError("");
    setStarting(true);

    try {
      const stream = await prepareCallMedia();
      if (!stream) throw new Error("Camera and microphone could not be initialized.");

      const newRoomId = generateRoomId();

      // Mark this browser tab as the host for this specific room.
      // sessionStorage is tab-scoped, so a participant opening the same
      // link in another tab/browser will not become the host.
      sessionStorage.setItem(
        `youtube_call_host:${newRoomId}`,
        "1"
      );

      const navigated = await router.push(`/call/${newRoomId}?host=1`);
      if (!navigated) throw new Error("Unable to open the meeting room.");
    } catch (error) {
      console.error("Create meeting error:", error);
      clearPreparedCallMedia();
      setError(getMediaErrorMessage(error, "start"));
      setStarting(false);
    }
  };

  const joinMeeting = async () => {
    if (starting) return;
    setError("");

    const cleanRoomId = extractRoomId(roomId);

    if (!cleanRoomId) {
      setError(
        "Please enter a valid meeting ID or paste the complete meeting link."
      );
      return;
    }

    if (cleanRoomId.length < 4) {
      setError(
        "Meeting ID must contain at least 4 characters."
      );
      return;
    }

    // Show exactly what will be used as the room ID.
    setRoomId(cleanRoomId);
    setStarting(true);

    try {
      const stream = await prepareCallMedia();

      if (!stream) {
        throw new Error(
          "Camera and microphone could not be initialized."
        );
      }

      // Participant routes ONLY to the room ID.
      // Never append the full URL to /call/.
      const navigated = await router.push(
        `/call/${encodeURIComponent(cleanRoomId)}`
      );

      if (!navigated) {
        throw new Error(
          "Unable to open the meeting room."
        );
      }
    } catch (error) {
      console.error("Join meeting error:", error);
      clearPreparedCallMedia();
      setError(getMediaErrorMessage(error, "join"));
      setStarting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 text-black">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => void router.push("/")} className="flex items-center gap-2">
            <div className="flex h-8 w-11 items-center justify-center rounded-lg bg-red-600"><span className="font-bold text-white">▶</span></div>
            <span className="text-xl font-bold">YouTube Clone</span>
          </button>
          <button type="button" onClick={() => void router.push("/")} className="rounded-full px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-black">Home</button>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-64px)] max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid w-full gap-8 lg:grid-cols-2">
          <div className="flex flex-col justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white"><Video size={28} /></div>
            <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">Video calling</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-gray-500 sm:text-base">Create a meeting room or join an existing room with a unique meeting link.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <FeatureCard icon={<Video size={19} />} title="HD video" description="Camera and microphone controls" />
              <FeatureCard icon={<Users size={19} />} title="Group calls" description="Multiple participants" />
              <FeatureCard icon={<MonitorUp size={19} />} title="Screen sharing" description="Present your screen in the call" />
              <FeatureCard icon={<ShieldCheck size={19} />} title="Room security" description="Unique room IDs and host controls" />
            </div>
          </div>

          <div className="flex items-center">
            <div className="w-full rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100"><Video size={21} /></div>
                  <div><h2 className="font-bold">Start a new meeting</h2><p className="text-xs text-gray-500">Camera and microphone will start before entering the room.</p></div>
                </div>
                <button type="button" onClick={createMeeting} disabled={starting} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-black text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60">
                  {starting ? <><Loader2 size={18} className="animate-spin" />Opening camera...</> : <><Video size={18} />Create meeting<ArrowRight size={17} /></>}
                </button>
              </div>

              <div className="my-7 flex items-center gap-3"><div className="h-px flex-1 bg-gray-200" /><span className="text-xs font-medium text-gray-400">OR</span><div className="h-px flex-1 bg-gray-200" /></div>

              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100"><Link2 size={21} /></div>
                  <div><h2 className="font-bold">Join a meeting</h2><p className="text-xs text-gray-500">Enter a meeting ID or paste the complete meeting link.</p></div>
                </div>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <input type="text" value={roomId} onChange={(event) => setRoomId(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void joinMeeting(); }} placeholder="Meeting ID or meeting link" aria-label="Meeting ID" disabled={starting} className="h-12 min-w-0 flex-1 rounded-xl border border-gray-300 px-4 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100" />
                  <button type="button" onClick={joinMeeting} disabled={starting} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-gray-100 px-5 text-sm font-semibold hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60">Join<ArrowRight size={17} /></button>
                </div>
              </div>

              {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">{error}</div>}

              <div className="mt-6 rounded-2xl bg-gray-50 p-4">
                <p className="text-xs font-semibold">Before joining</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <Permission icon={<Mic size={16} />} text="Microphone" />
                  <Permission icon={<Camera size={16} />} text="Camera" />
                  <Permission icon={<MonitorUp size={16} />} text="Screen share" />
                </div>
                <p className="mt-3 text-[11px] leading-5 text-gray-500">Paste either the room ID or the complete meeting link. The app will extract only the room ID before opening the meeting.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return <div className="rounded-2xl border border-gray-200 bg-white p-4"><div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">{icon}</div><div><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 text-xs text-gray-500">{description}</p></div></div></div>;
}

function Permission({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs text-gray-600">{icon}{text}</div>;
}

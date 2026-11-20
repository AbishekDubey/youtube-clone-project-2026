let preparedCallStream: MediaStream | undefined;

const GLOBAL_STREAM_KEY = "__youtubeClonePreparedCallStream";

declare global {
  interface Window {
    __youtubeClonePreparedCallStream?: MediaStream;
  }
}

function getGlobalStream(): MediaStream | undefined {
  if (typeof window === "undefined") return undefined;
  return window[GLOBAL_STREAM_KEY];
}

function setGlobalStream(stream: MediaStream | undefined) {
  if (typeof window === "undefined") return;
  window[GLOBAL_STREAM_KEY] = stream;
}

function hasLiveTracks(stream: MediaStream | undefined) {
  if (!stream) return false;
  const audioLive = stream.getAudioTracks().some((track) => track.readyState === "live");
  const videoLive = stream.getVideoTracks().some((track) => track.readyState === "live");
  return audioLive && videoLive;
}

function stopStream(stream: MediaStream | undefined) {
  if (!stream) return;
  stream.getTracks().forEach((track) => {
    try { track.stop(); } catch {}
  });
}

function currentPreparedStream() {
  return preparedCallStream ?? getGlobalStream();
}

export async function prepareCallMedia(): Promise<MediaStream> {
  if (typeof window === "undefined") {
    throw new Error("Camera and microphone are only available in the browser.");
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera and microphone are not supported by this browser.");
  }

  const existing = currentPreparedStream();

  if (hasLiveTracks(existing)) {
    preparedCallStream = existing;
    setGlobalStream(existing);
    return existing!;
  }

  if (existing) stopStream(existing);

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30, max: 30 },
    },
  });

  const audioLive = stream.getAudioTracks().some((track) => track.readyState === "live");
  const videoLive = stream.getVideoTracks().some((track) => track.readyState === "live");

  if (!audioLive || !videoLive) {
    stopStream(stream);
    throw new Error("Camera and microphone could not be initialized.");
  }

  stream.getAudioTracks().forEach((track) => { track.enabled = true; });
  stream.getVideoTracks().forEach((track) => { track.enabled = true; });

  preparedCallStream = stream;
  setGlobalStream(stream);

  return stream;
}

export function takePreparedCallMedia(): MediaStream | undefined {
  const stream = currentPreparedStream();

  preparedCallStream = undefined;
  setGlobalStream(undefined);

  if (!hasLiveTracks(stream)) {
    stopStream(stream);
    return undefined;
  }

  stream!.getAudioTracks().forEach((track) => { track.enabled = true; });
  stream!.getVideoTracks().forEach((track) => { track.enabled = true; });

  return stream;
}

export function hasPreparedCallMedia() {
  return hasLiveTracks(currentPreparedStream());
}

export function clearPreparedCallMedia() {
  stopStream(currentPreparedStream());
  preparedCallStream = undefined;
  setGlobalStream(undefined);
}

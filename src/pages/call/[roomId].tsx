import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useRouter } from "next/router";

import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  PhoneOff,
  Users,
  MessageSquare,
  Send,
  Copy,
  Check,
  Hand,
  Settings,
  ShieldCheck,
  X,
  UserPlus,
  Lock,
  Unlock,
  UserMinus,
  Crown,
  RefreshCw,
  Camera,
  Maximize2,
  Wifi,
  WifiOff,
} from "lucide-react";

import { getCurrentUser } from "@/lib/auth";

import {
  prepareCallMedia,
  takePreparedCallMedia,
} from "@/lib/callMedia";

type PeerInstance = import("peerjs").Peer;
type MediaConnection =
  import("peerjs").MediaConnection;
type DataConnection =
  import("peerjs").DataConnection;

type ConnectionQuality =
  | "excellent"
  | "good"
  | "fair"
  | "poor"
  | "unknown";

type ParticipantData = {
  id: string;
  name: string;
  peerId: string;
  muted: boolean;
  cameraOff: boolean;
  raisedHand: boolean;
  host: boolean;
  coHost: boolean;
  speaking: boolean;
  quality: ConnectionQuality;
};

type Participant =
  ParticipantData & {
    stream?: MediaStream;
  };

type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  time: string;
  fileName?: string;
  fileUrl?: string;
};

type RoomMessage =
  | {
      type: "hello";
      participant: ParticipantData;
    }
  | {
      type: "roster";
      participants: ParticipantData[];
      locked: boolean;
      allowChat: boolean;
      allowScreenShare: boolean;
    }
  | {
      type: "state";
      participant: ParticipantData;
    }
  | {
      type: "chat";
      message: ChatMessage;
    }
  | {
      type: "leave";
      peerId: string;
    }
  | {
      type: "remove";
      peerId: string;
    }
  | {
      type: "mute";
      peerId: string;
    }
  | {
      type: "promote";
      peerId: string;
    }
  | {
      type: "lock";
      locked: boolean;
    }
  | {
      type: "permissions";
      allowChat: boolean;
      allowScreenShare: boolean;
    }
  | {
      type: "meeting-ended";
    }
  | {
      type: "reaction";
      peerId: string;
      emoji: string;
    }
  | {
      type: "join-denied";
      reason: string;
    };

const MAX_PARTICIPANTS = 8;
const MAX_FILE_SIZE = 1024 * 1024;

const EMOJIS = [
  "👍",
  "❤️",
  "😂",
  "👏",
  "🔥",
  "🎉",
];

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

function getHostSessionKey(roomId: string) {
  return `youtube_call_host:${roomId}`;
}

function isHostTab(roomId: string) {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    sessionStorage.getItem(
      getHostSessionKey(roomId)
    ) === "1"
  );
}

function formatDuration(
  totalSeconds: number
) {
  const hours = Math.floor(
    totalSeconds / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const seconds = Math.floor(
    totalSeconds % 60
  );

  if (hours > 0) {
    return `${String(hours).padStart(
      2,
      "0"
    )}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  }

  return `${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

function qualityLabel(
  quality: ConnectionQuality
) {
  switch (quality) {
    case "excellent":
      return "Excellent";
    case "good":
      return "Good";
    case "fair":
      return "Fair";
    case "poor":
      return "Poor";
    default:
      return "Checking...";
  }
}

function qualityClass(
  quality: ConnectionQuality
) {
  switch (quality) {
    case "excellent":
      return "text-green-400";
    case "good":
      return "text-green-300";
    case "fair":
      return "text-yellow-300";
    case "poor":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
}

function serializeParticipant(
  participant: Participant
): ParticipantData {
  return {
    id: participant.id,
    name: participant.name,
    peerId: participant.peerId,
    muted: participant.muted,
    cameraOff:
      participant.cameraOff,
    raisedHand:
      participant.raisedHand,
    host: participant.host,
    coHost: participant.coHost,
    speaking:
      participant.speaking,
    quality:
      participant.quality,
  };
}

export default function CallRoomPage() {
  const router = useRouter();

  const roomId =
    typeof router.query.roomId ===
    "string"
      ? router.query.roomId
      : "";

  const [userName, setUserName] =
    useState("Guest");
   
    const userNameRef =
  useRef("Guest");

  const [
    localStream,
    setLocalStream,
  ] = useState<
    MediaStream | undefined
  >();

  const [peerId, setPeerId] =
    useState("");

  const [
    participants,
    setParticipants,
  ] = useState<Participant[]>([]);

  const [
    micEnabled,
    setMicEnabled,
  ] = useState(true);

  const [
    cameraEnabled,
    setCameraEnabled,
  ] = useState(true);

  const [
    screenSharing,
    setScreenSharing,
  ] = useState(false);

  const [
    raisedHand,
    setRaisedHand,
  ] = useState(false);

  const [isHost, setIsHost] =
    useState(false);

  const [isCoHost, setIsCoHost] =
    useState(false);

  const [
    meetingLocked,
    setMeetingLocked,
  ] = useState(false);

  const [allowChat, setAllowChat] =
    useState(true);

  const [
    allowScreenShare,
    setAllowScreenShare,
  ] = useState(true);

  const [chatOpen, setChatOpen] =
    useState(false);

  const [
    participantsOpen,
    setParticipantsOpen,
  ] = useState(false);

  const [
    settingsOpen,
    setSettingsOpen,
  ] = useState(false);

  const [
    chatMessage,
    setChatMessage,
  ] = useState("");

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [copied, setCopied] =
    useState(false);

  const [status, setStatus] =
    useState("Connecting...");

  const [error, setError] =
    useState("");

  const [
    callSeconds,
    setCallSeconds,
  ] = useState(0);

  const [
    ownQuality,
    setOwnQuality,
  ] =
    useState<ConnectionQuality>(
      "unknown"
    );

  const [
    reactions,
    setReactions,
  ] = useState<
    {
      id: string;
      emoji: string;
      name: string;
    }[]
  >([]);

  const [
    fullscreenPeer,
    setFullscreenPeer,
  ] = useState<string | null>(
    null
  );

  const [reconnecting, setReconnecting] =
    useState(false);

  const peerRef =
    useRef<PeerInstance | null>(
      null
    );

  const peerIdRef =
    useRef("");

  const callStartedAtRef =
    useRef<number | null>(null);

  const localStreamRef =
    useRef<
      MediaStream | undefined
    >(undefined);

  const localVideoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  const participantsRef =
    useRef<Participant[]>([]);

  const connectionsRef =
    useRef<
      Map<string, DataConnection>
    >(new Map());

  const mediaConnectionsRef =
    useRef<
      Map<string, MediaConnection>
    >(new Map());

  const reconnectTimerRef =
    useRef<number | null>(null);

  const durationTimerRef =
    useRef<number | null>(null);

  const statsTimerRef =
    useRef<number | null>(null);

  const intentionalLeaveRef =
    useRef(false);

  const startedRef =
    useRef(false);

  const mountedRef =
    useRef(true);

  const isHostRef =
    useRef(false);

  const isCoHostRef =
    useRef(false);

  const micRef = useRef(true);
  const cameraRef = useRef(true);
  const raisedHandRef =
    useRef(false);

  const meetingLockedRef =
    useRef(false);

  const allowChatRef =
    useRef(true);

  const allowScreenShareRef =
    useRef(true);

  const qualityRef =
    useRef<ConnectionQuality>(
      "unknown"
    );

  const handlerRef =
    useRef<
      ((
        message: RoomMessage,
        senderPeerId: string
      ) => void) | null
    >(null);

  const participantIdRef =
    useRef(
      createId("participant")
    );

  const showError =
    useCallback(
      (message: string) => {
        if (
          !mountedRef.current
        ) {
          return;
        }

        setError(message);

        window.setTimeout(
          () => {
            if (
              mountedRef.current
            ) {
              setError("");
            }
          },
          5000
        );
      },
      []
    );

  const getLocalParticipant =
    useCallback(
      (): ParticipantData => {
        const existing =
          participantsRef.current.find(
            (participant) =>
              participant.peerId ===
              peerIdRef.current
          );

        return {
          id:
            existing?.id ||
            participantIdRef.current,
          name:
            userName ||
            "Guest",
          peerId:
            peerIdRef.current,
          muted:
            !micRef.current,
          cameraOff:
            !cameraRef.current,
          raisedHand:
            raisedHandRef.current,
          host:
            isHostRef.current,
          coHost:
            isCoHostRef.current,
          speaking:
            existing?.speaking ||
            false,
          quality:
            qualityRef.current,
        };
      },
      [userName]
    );

  const sendToAll =
    useCallback(
      (message: RoomMessage) => {
        if (
          intentionalLeaveRef.current
        ) {
          return;
        }

        connectionsRef.current.forEach(
          (connection) => {
            if (
              connection.open
            ) {
              try {
                connection.send(
                  message
                );
              } catch (
                sendError
              ) {
                console.error(
                  "Send error:",
                  sendError
                );
              }
            }
          }
        );
      },
      []
    );

  const sendToPeer =
    useCallback(
      (
        targetPeerId: string,
        message: RoomMessage
      ) => {
        if (
          intentionalLeaveRef.current
        ) {
          return;
        }

        const connection =
          connectionsRef.current.get(
            targetPeerId
          );

        if (
          !connection?.open
        ) {
          return;
        }

        try {
          connection.send(
            message
          );
        } catch (
          sendError
        ) {
          console.error(
            "Peer send error:",
            sendError
          );
        }
      },
      []
    );

  const removeParticipant =
    useCallback(
      (targetPeerId: string) => {
        try {
          mediaConnectionsRef.current
            .get(targetPeerId)
            ?.close();
        } catch {}

        try {
          connectionsRef.current
            .get(targetPeerId)
            ?.close();
        } catch {}

        mediaConnectionsRef.current.delete(
          targetPeerId
        );

        connectionsRef.current.delete(
          targetPeerId
        );

        setParticipants(
          (previous) =>
            previous.filter(
              (participant) =>
                participant.peerId !==
                targetPeerId
            )
        );
      },
      []
    );

  const updateParticipant =
    useCallback(
      (
        targetPeerId: string,
        changes: Partial<Participant>
      ) => {
        setParticipants(
          (previous) =>
            previous.map(
              (participant) =>
                participant.peerId ===
                targetPeerId
                  ? {
                      ...participant,
                      ...changes,
                    }
                  : participant
            )
        );
      },
      []
    );

  const addParticipant =
    useCallback(
      (
        data: ParticipantData,
        stream?: MediaStream
      ) => {
        setParticipants(
          (previous) => {
            const exists =
              previous.some(
                (participant) =>
                  participant.peerId ===
                  data.peerId
              );

            if (exists) {
              return previous.map(
                (participant) =>
                  participant.peerId ===
                  data.peerId
                    ? {
                        ...participant,
                        ...data,
                        stream:
                          stream ||
                          participant.stream,
                      }
                    : participant
              );
            }

            return [
              ...previous,
              {
                ...data,
                stream,
              },
            ];
          }
        );
      },
      []
    );

  const cleanup =
    useCallback(
      (redirect: boolean) => {
        /*
         * IMPORTANT:
         * This is set BEFORE peer.destroy().
         * Therefore disconnected handlers know
         * that this is intentional cleanup.
         */
        intentionalLeaveRef.current =
          true;

        if (
          reconnectTimerRef.current
        ) {
          clearTimeout(
            reconnectTimerRef.current
          );

          reconnectTimerRef.current =
            null;
        }

        if (
          durationTimerRef.current
        ) {
          clearInterval(
            durationTimerRef.current
          );

          durationTimerRef.current =
            null;
        }

        if (
          statsTimerRef.current
        ) {
          clearInterval(
            statsTimerRef.current
          );

          statsTimerRef.current =
            null;
        }

        const currentPeerId =
          peerIdRef.current;

        if (
          isHostRef.current &&
          roomId &&
          currentPeerId
        ) {
          void fetch(
            "/api/call/room",
            {
              method: "DELETE",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                roomId,
                peerId: currentPeerId,
              }),
            }
          ).catch(() => undefined);
        }

        if (currentPeerId) {
          connectionsRef.current.forEach(
            (connection) => {
              if (
                connection.open
              ) {
                try {
                  connection.send({
                    type: "leave",
                    peerId:
                      currentPeerId,
                  } satisfies RoomMessage);
                } catch {}
              }
            }
          );
        }

        mediaConnectionsRef.current.forEach(
          (connection) => {
            try {
              connection.close();
            } catch {}
          }
        );

        connectionsRef.current.forEach(
          (connection) => {
            try {
              connection.close();
            } catch {}
          }
        );

        mediaConnectionsRef.current.clear();
        connectionsRef.current.clear();

        const peer =
          peerRef.current;

        /*
         * Remove the peer from the ref BEFORE
         * destroying it. This prevents any delayed
         * callback from treating it as active.
         */
        peerRef.current = null;

        if (
          peer &&
          !peer.destroyed
        ) {
          try {
            peer.destroy();
          } catch (
            destroyError
          ) {
            console.error(
              "Peer destroy error:",
              destroyError
            );
          }
        }

        localStreamRef.current
          ?.getTracks()
          .forEach(
            (track) => {
              try {
                track.stop();
              } catch {}
            }
          );

        localStreamRef.current =
          undefined;

        if (
          redirect &&
          mountedRef.current
        ) {
          void router.push(
            "/call"
          );
        }
      },
      [router, roomId]
    );

  const broadcastState =
    useCallback(() => {
      if (
        !peerIdRef.current ||
        intentionalLeaveRef.current
      ) {
        return;
      }

      const local =
        getLocalParticipant();

      setParticipants(
        (previous) =>
          previous.map(
            (participant) =>
              participant.peerId ===
              peerIdRef.current
                ? {
                    ...participant,
                    ...local,
                  }
                : participant
          )
      );

      sendToAll({
        type: "state",
        participant: local,
      });
    }, [
      getLocalParticipant,
      sendToAll,
    ]);

  const setupIncomingCall =
    useCallback(
      (call: MediaConnection) => {
        if (
          intentionalLeaveRef.current
        ) {
          try {
            call.close();
          } catch {}

          return;
        }

        const stream =
          localStreamRef.current;

        if (!stream) {
          try {
            call.close();
          } catch {}

          return;
        }

        const metadata =
          call.metadata as
            | {
                participant?: ParticipantData;
              }
            | undefined;

        try {
          call.answer(
            stream
          );

          mediaConnectionsRef.current.set(
            call.peer,
            call
          );

          call.on(
            "stream",
            (
              remoteStream
            ) => {
              const participant =
                metadata?.participant || {
                  id: createId(
                    "remote"
                  ),
                  name:
                    "Participant",
                  peerId:
                    call.peer,
                  muted:
                    false,
                  cameraOff:
                    false,
                  raisedHand:
                    false,
                  host:
                    false,
                  coHost:
                    false,
                  speaking:
                    false,
                  quality:
                    "unknown",
                };

              addParticipant(
                participant,
                remoteStream
              );
            }
          );

          call.on(
            "close",
            () => {
              removeParticipant(
                call.peer
              );
            }
          );

          call.on(
            "error",
            (
              callError
            ) => {
              console.error(
                "Incoming media error:",
                callError
              );

              removeParticipant(
                call.peer
              );
            }
          );
        } catch (
          callError
        ) {
          console.error(
            "Incoming call error:",
            callError
          );
        }
      },
      [
        addParticipant,
        removeParticipant,
      ]
    );

  const setupDataConnection =
    useCallback(
      (
        connection: DataConnection
      ) => {
        connectionsRef.current.set(
          connection.peer,
          connection
        );

        connection.on(
          "open",
          () => {
            if (
              intentionalLeaveRef.current
            ) {
              return;
            }

            try {
              connection.send({
                type: "hello",
                participant:
                  getLocalParticipant(),
              } satisfies RoomMessage);
            } catch (
              helloError
            ) {
              console.error(
                "Hello error:",
                helloError
              );
            }
          }
        );

        connection.on(
          "data",
          (data) => {
            handlerRef.current?.(
              data as RoomMessage,
              connection.peer
            );
          }
        );

        connection.on(
          "close",
          () => {
            connectionsRef.current.delete(
              connection.peer
            );

            if (
              !intentionalLeaveRef.current
            ) {
              removeParticipant(
                connection.peer
              );
            }
          }
        );

        connection.on(
          "error",
          (connectionError) => {
            if (
              !intentionalLeaveRef.current
            ) {
              console.error(
                "Data connection error:",
                connectionError
              );
            }
          }
        );
      },
      [
        getLocalParticipant,
        removeParticipant,
      ]
    );

  const connectToParticipant =
    useCallback(
      (
        target: ParticipantData
      ) => {
        if (
          intentionalLeaveRef.current
        ) {
          return;
        }

        const peer =
          peerRef.current;

        const stream =
          localStreamRef.current;

        const currentPeerId =
          peerIdRef.current;

        if (
          !peer ||
          peer.destroyed ||
          !stream ||
          !currentPeerId
        ) {
          return;
        }

        if (
          !target.peerId ||
          target.peerId ===
            currentPeerId
        ) {
          return;
        }

        /*
         * Only one side creates the media call.
         * This prevents duplicate calls.
         */
        if (
          currentPeerId >
          target.peerId
        ) {
          return;
        }

        if (
          mediaConnectionsRef.current.has(
            target.peerId
          )
        ) {
          return;
        }

        try {
          const call =
            peer.call(
              target.peerId,
              stream,
              {
                metadata: {
                  participant:
                    getLocalParticipant(),
                },
              }
            );

          if (!call) {
            return;
          }

          mediaConnectionsRef.current.set(
            target.peerId,
            call
          );

          call.on(
            "stream",
            (
              remoteStream
            ) => {
              addParticipant(
                target,
                remoteStream
              );

              setStatus(
                "Connected"
              );
            }
          );

          call.on(
            "close",
            () => {
              removeParticipant(
                target.peerId
              );
            }
          );

          call.on(
            "error",
            (
              callError
            ) => {
              console.error(
                "Outgoing call error:",
                callError
              );

              removeParticipant(
                target.peerId
              );
            }
          );
        } catch (
          mediaError
        ) {
          console.error(
            "Media connection error:",
            mediaError
          );
        }
      },
      [
        addParticipant,
        getLocalParticipant,
        removeParticipant,
      ]
    );

  const sendRoster =
    useCallback(() => {
      if (
        !isHostRef.current ||
        intentionalLeaveRef.current
      ) {
        return;
      }

      const roster =
        participantsRef.current.map(
          (participant) =>
            serializeParticipant(
              participant
            )
        );

      sendToAll({
        type: "roster",
        participants:
          roster,
        locked:
          meetingLockedRef.current,
        allowChat:
          allowChatRef.current,
        allowScreenShare:
          allowScreenShareRef.current,
      });
    }, [
      sendToAll,
    ]);

  const handleRoomMessage =
    useCallback(
      (
        message: RoomMessage,
        senderPeerId: string
      ) => {
        if (
          intentionalLeaveRef.current
        ) {
          return;
        }

        switch (
          message.type
        ) {
          case "hello": {
            if (
              !isHostRef.current
            ) {
              return;
            }

            const known =
              participantsRef.current.some(
                (participant) =>
                  participant.peerId ===
                  message.participant.peerId
              );

            if (known) {
              return;
            }

            if (
              meetingLockedRef.current
            ) {
              sendToPeer(
                senderPeerId,
                {
                  type: "join-denied",
                  reason:
                    "The host has locked this meeting.",
                }
              );

              return;
            }

            if (
              participantsRef.current.length >=
              MAX_PARTICIPANTS
            ) {
              sendToPeer(
                senderPeerId,
                {
                  type: "join-denied",
                  reason:
                    `This meeting allows up to ${MAX_PARTICIPANTS} participants.`,
                }
              );

              return;
            }

            addParticipant(
              message.participant
            );

            window.setTimeout(
              () => {
                const roster =
                  participantsRef.current.map(
                    (
                      participant
                    ) =>
                      serializeParticipant(
                        participant
                      )
                  );

                sendToPeer(
                  message.participant
                    .peerId,
                  {
                    type:
                      "roster",
                    participants:
                      [
                        ...roster,
                        message.participant,
                      ],
                    locked:
                      meetingLockedRef.current,
                    allowChat:
                      allowChatRef.current,
                    allowScreenShare:
                      allowScreenShareRef.current,
                  }
                );

                connectToParticipant(
                  message.participant
                );
              },
              100
            );

            break;
          }

          case "roster": {
            setMeetingLocked(
              message.locked
            );

            setAllowChat(
              message.allowChat
            );

            setAllowScreenShare(
              message.allowScreenShare
            );

            meetingLockedRef.current =
              message.locked;

            allowChatRef.current =
              message.allowChat;

            allowScreenShareRef.current =
              message.allowScreenShare;

            message.participants.forEach(
              (
                participant
              ) => {
                if (
                  participant.peerId ===
                  peerIdRef.current
                ) {
                  setIsHost(
                    participant.host
                  );

                  setIsCoHost(
                    participant.coHost
                  );

                  isHostRef.current =
                    participant.host;

                  isCoHostRef.current =
                    participant.coHost;

                  return;
                }

                addParticipant(
                  participant
                );

                window.setTimeout(
                  () => {
                    connectToParticipant(
                      participant
                    );
                  },
                  150
                );
              }
            );

            setStatus(
              "Connected"
            );

            break;
          }

          case "state": {
            if (
              message.participant.peerId ===
              peerIdRef.current
            ) {
              return;
            }

            updateParticipant(
              message.participant.peerId,
              {
                name:
                  message.participant
                    .name,
                muted:
                  message.participant
                    .muted,
                cameraOff:
                  message.participant
                    .cameraOff,
                raisedHand:
                  message.participant
                    .raisedHand,
                host:
                  message.participant
                    .host,
                coHost:
                  message.participant
                    .coHost,
                speaking:
                  message.participant
                    .speaking,
                quality:
                  message.participant
                    .quality,
              }
            );

            break;
          }

          case "chat": {
            setMessages(
              (previous) => {
                if (
                  previous.some(
                    (item) =>
                      item.id ===
                      message.message.id
                  )
                ) {
                  return previous;
                }

                return [
                  ...previous,
                  message.message,
                ];
              }
            );

            setChatOpen(
              true
            );

            /*
             * Host relays participant chat
             * to all connected peers.
             */
            if (
              isHostRef.current &&
              senderPeerId !==
                peerIdRef.current
            ) {
              sendToAll(
                message
              );
            }

            break;
          }

          case "leave": {
            removeParticipant(
              message.peerId
            );

            if (
              isHostRef.current
            ) {
              window.setTimeout(
                sendRoster,
                100
              );
            }

            break;
          }

          case "remove": {
            if (
              message.peerId ===
              peerIdRef.current
            ) {
              setStatus(
                "Removed from meeting"
              );

              cleanup(
                false
              );

              window.setTimeout(
                () => {
                  void router.push(
                    "/call"
                  );
                },
                500
              );
            }

            break;
          }

          case "mute": {
            if (
              message.peerId ===
              peerIdRef.current
            ) {
              localStreamRef.current
                ?.getAudioTracks()
                .forEach(
                  (track) => {
                    track.enabled =
                      false;
                  }
                );

              micRef.current =
                false;

              setMicEnabled(
                false
              );

              window.setTimeout(
                broadcastState,
                0
              );
            }

            break;
          }

          case "promote": {
            if (
              message.peerId ===
              peerIdRef.current
            ) {
              isCoHostRef.current =
                true;

              setIsCoHost(
                true
              );

              setParticipants(
                (previous) =>
                  previous.map(
                    (participant) =>
                      participant.peerId ===
                      peerIdRef.current
                        ? {
                            ...participant,
                            coHost:
                              true,
                          }
                        : participant
                  )
              );

              window.setTimeout(
                broadcastState,
                0
              );
            }

            break;
          }

          case "lock": {
            meetingLockedRef.current =
              message.locked;

            setMeetingLocked(
              message.locked
            );

            break;
          }

          case "permissions": {
            allowChatRef.current =
              message.allowChat;

            allowScreenShareRef.current =
              message.allowScreenShare;

            setAllowChat(
              message.allowChat
            );

            setAllowScreenShare(
              message.allowScreenShare
            );

            if (
              !message.allowChat
            ) {
              setChatOpen(
                false
              );
            }

            break;
          }

          case "reaction": {
            const source =
              participantsRef.current.find(
                (participant) =>
                  participant.peerId ===
                  message.peerId
              );

            const item = {
              id: createId(
                "reaction"
              ),
              emoji:
                message.emoji,
              name:
                source?.name ||
                "Participant",
            };

            setReactions(
              (previous) => [
                ...previous,
                item,
              ]
            );

            window.setTimeout(
              () => {
                setReactions(
                  (previous) =>
                    previous.filter(
                      (reaction) =>
                        reaction.id !==
                        item.id
                    )
                );
              },
              2500
            );

            if (
              isHostRef.current
            ) {
              sendToAll(
                message
              );
            }

            break;
          }

          case "meeting-ended": {
            setStatus(
              "Meeting ended"
            );

            cleanup(
              false
            );

            window.setTimeout(
              () => {
                void router.push(
                  "/call"
                );
              },
              700
            );

            break;
          }

          case "join-denied": {
            showError(
              message.reason
            );

            setStatus(
              "Unable to join"
            );

            cleanup(
              false
            );

            window.setTimeout(
              () => {
                void router.push(
                  "/call"
                );
              },
              1200
            );

            break;
          }

          default:
            break;
        }
      },
      [
        addParticipant,
        broadcastState,
        cleanup,
        connectToParticipant,
        removeParticipant,
        router,
        sendRoster,
        sendToAll,
        sendToPeer,
        showError,
        updateParticipant,
      ]
    );

  /*
   * This ref is the key to avoiding the
   * previous "broadcastState before initialization"
   * dependency problem.
   */
  useEffect(() => {
    handlerRef.current =
      handleRoomMessage;
  }, [
    handleRoomMessage,
  ]);

  const connectToHost =
    useCallback(
      (
        hostPeerId: string
      ) => {
        if (
          intentionalLeaveRef.current ||
          !hostPeerId
        ) {
          return;
        }

        const peer =
          peerRef.current;

        if (
          !peer ||
          peer.destroyed ||
          peer.id === hostPeerId
        ) {
          return;
        }

        const existing =
          connectionsRef.current.get(
            hostPeerId
          );

        if (
          existing?.open
        ) {
          return;
        }

        try {
          const connection =
            peer.connect(
              hostPeerId,
              {
                reliable: true,
              }
            );

          setupDataConnection(
            connection
          );

          connection.on(
            "open",
            () => {
              if (
                !intentionalLeaveRef.current
              ) {
                setStatus(
                  "Connected"
                );
              }
            }
          );

          const retry =
            () => {
              if (
                intentionalLeaveRef.current ||
                peer.destroyed
              ) {
                return;
              }

              if (
                connectionsRef.current.get(
                  hostPeerId
                )?.open
              ) {
                return;
              }

              if (
                reconnectTimerRef.current
              ) {
                clearTimeout(
                  reconnectTimerRef.current
                );
              }

              reconnectTimerRef.current =
                window.setTimeout(
                  () => {
                    reconnectTimerRef.current =
                      null;
                    connectToHost(
                      hostPeerId
                    );
                  },
                  1500
                );
            };

          connection.on(
            "error",
            (connectionError) => {
              if (
                !intentionalLeaveRef.current
              ) {
                console.error(
                  "Host connection error:",
                  connectionError
                );
                setStatus(
                  "Waiting for host..."
                );
                retry();
              }
            }
          );

          connection.on(
            "close",
            () => {
              if (
                !intentionalLeaveRef.current
              ) {
                setStatus(
                  "Reconnecting..."
                );
                retry();
              }
            }
          );
        } catch (
          connectionError
        ) {
          if (
            !intentionalLeaveRef.current
          ) {
            console.error(
              "Host connect error:",
              connectionError
            );
          }
        }
      },
      [
        setupDataConnection,
      ]
    );

  const measureQuality =
    useCallback(
      async () => {
        if (
          intentionalLeaveRef.current
        ) {
          return;
        }

        if (
          mediaConnectionsRef.current.size ===
          0
        ) {
          qualityRef.current =
            "excellent";

          setOwnQuality(
            "excellent"
          );

          return;
        }

        let bestQuality:
          | "excellent"
          | "good"
          | "fair"
          | "poor" =
          "excellent";

        for (const [
          remotePeerId,
          connection,
        ] of mediaConnectionsRef.current) {
          const pc =
            (
              connection as unknown as {
                peerConnection?: RTCPeerConnection;
              }
            )
              .peerConnection;

          if (!pc) {
            continue;
          }

          try {
            const stats =
              await pc.getStats();

            let rtt = 0;
            let received = 0;
            let lost = 0;

            stats.forEach(
              (stat) => {
                if (
                  stat.type ===
                    "candidate-pair" &&
                  stat.state ===
                    "succeeded"
                ) {
                  rtt =
                    stat.currentRoundTripTime ||
                    rtt;
                }

                if (
                  stat.type ===
                  "inbound-rtp"
                ) {
                  received +=
                    stat.packetsReceived ||
                    0;

                  lost +=
                    stat.packetsLost ||
                    0;
                }
              }
            );

            const total =
              received + lost;

            const loss =
              total > 0
                ? lost / total
                : 0;

            let quality:
              ConnectionQuality =
              "excellent";

            if (
              rtt > 0.5 ||
              loss > 0.08
            ) {
              quality =
                "poor";
            } else if (
              rtt > 0.2 ||
              loss > 0.04
            ) {
              quality =
                "fair";
            } else if (
              rtt > 0.1 ||
              loss > 0.015
            ) {
              quality =
                "good";
            }

            updateParticipant(
              remotePeerId,
              {
                quality,
              }
            );

            if (
              quality ===
                "poor" ||
              bestQuality ===
                "poor"
            ) {
              bestQuality =
                "poor";
            } else if (
              quality ===
                "fair" ||
              bestQuality ===
                "fair"
            ) {
              bestQuality =
                "fair";
            } else if (
              quality ===
                "good" ||
              bestQuality ===
                "good"
            ) {
              bestQuality =
                "good";
            }
          } catch (
            statsError
          ) {
            console.error(
              "Stats error:",
              statsError
            );
          }
        }

        qualityRef.current =
          bestQuality;

        setOwnQuality(
          bestQuality
        );
      },
      [
        updateParticipant,
      ]
    );

  const startPeer =
    useCallback(
      async () => {
        if (
          !roomId ||
          !userName ||
          startedRef.current
        ) {
          return;
        }

        startedRef.current =
          true;

        intentionalLeaveRef.current =
          false;

        try {
          setStatus(
            "Requesting camera and microphone..."
          );

          if (
            !navigator.mediaDevices?.getUserMedia
          ) {
            throw new Error(
              "Camera and microphone are not supported."
            );
          }

          let stream =
            takePreparedCallMedia();

          if (
            !stream ||
            !stream.getTracks().some(
              (track) =>
                track.readyState ===
                "live"
            )
          ) {
            stream =
              await prepareCallMedia();
          }

          if (!stream) {
            throw new Error(
              "Camera and microphone could not be initialized."
            );
          }

          if (
            intentionalLeaveRef.current
          ) {
            stream
              .getTracks()
              .forEach(
                (track) =>
                  track.stop()
              );

            return;
          }

          localStreamRef.current =
            stream;

          stream
            .getAudioTracks()
            .forEach(
              (track) => {
                track.enabled =
                  true;
              }
            );

          stream
            .getVideoTracks()
            .forEach(
              (track) => {
                track.enabled =
                  true;
              }
            );

          micRef.current =
            true;
          cameraRef.current =
            true;

          setMicEnabled(
            true
          );
          setCameraEnabled(
            true
          );

          setLocalStream(
            stream
          );

          const peerModule =
            await import(
              "peerjs"
            );

          const Peer =
            peerModule.default;

          const becameHost =
            isHostTab(roomId);

          /*
           * Use one deterministic PeerJS ID for the host.
           *
           * This removes the previous URL/API discovery problem:
           * every participant can derive the exact host ID from
           * the room ID without needing another API or query param.
           */
          const hostPeerId =
            `youtube-clone-host-${roomId}`;

          let peer:
            | PeerInstance
            | null =
            null;

          const newPeer =
            becameHost
              ? new Peer(
                  hostPeerId
                )
              : new Peer();

          await new Promise<void>(
            (resolve, reject) => {
              const timeout =
                window.setTimeout(
                  () => {
                    reject(
                      new Error(
                        becameHost
                          ? "Host connection timeout."
                          : "Peer connection timeout."
                      )
                    );
                  },
                  10000
                );

              newPeer.once(
                "open",
                () => {
                  window.clearTimeout(
                    timeout
                  );
                  resolve();
                }
              );

              newPeer.once(
                "error",
                (peerError) => {
                  window.clearTimeout(
                    timeout
                  );
                  reject(
                    peerError
                  );
                }
              );
            }
          );

          peer =
            newPeer;

          /*
           * Store the live PeerJS instance BEFORE any
           * participant connection attempt.
           * connectToHost() reads peerRef.current.
           */
          peerRef.current =
            peer;

          peerIdRef.current =
            peer.id;

          setPeerId(
            peer.id
          );

          peer.on(
            "connection",
            (
              connection
            ) => {
              if (
                intentionalLeaveRef.current
              ) {
                try {
                  connection.close();
                } catch {}

                return;
              }

              setupDataConnection(
                connection
              );
            }
          );

          peer.on(
            "call",
            (
              call
            ) => {
              setupIncomingCall(
                call
              );
            }
          );

          /*
           * FIXED RECONNECT HANDLER
           *
           * It exits if:
           * - user intentionally left
           * - peer was destroyed
           * - ref no longer points to this peer
           */
          peer.on(
            "disconnected",
            () => {
              if (
                intentionalLeaveRef.current ||
                peer.destroyed ||
                peerRef.current !==
                  peer
              ) {
                return;
              }

              setReconnecting(
                true
              );

              setStatus(
                "Reconnecting..."
              );

              if (
                reconnectTimerRef.current
              ) {
                clearTimeout(
                  reconnectTimerRef.current
                );
              }

              reconnectTimerRef.current =
                window.setTimeout(
                  () => {
                    reconnectTimerRef.current =
                      null;

                    if (
                      intentionalLeaveRef.current ||
                      peer.destroyed ||
                      peerRef.current !==
                        peer
                    ) {
                      return;
                    }

                    try {
                      peer.reconnect();

                      setReconnecting(
                        false
                      );

                      setStatus(
                        becameHost
                          ? "Hosting meeting"
                          : "Connected"
                      );
                    } catch (
                      reconnectError
                    ) {
                      if (
                        !intentionalLeaveRef.current
                      ) {
                        console.error(
                          "Reconnect error:",
                          reconnectError
                        );

                        setReconnecting(
                          false
                        );

                        setStatus(
                          "Connection lost"
                        );
                      }
                    }
                  },
                  1200
                );
            }
          );

          peer.on(
            "error",
            (
              peerError
            ) => {
              if (
                intentionalLeaveRef.current
              ) {
                return;
              }

              console.error(
                "PeerJS error:",
                peerError
              );

              showError(
                peerError.message ||
                  (
                    becameHost
                      ? "This meeting ID is already in use. Please create a new meeting."
                      : "Connection error."
                  )
              );
            }
          );

          if (
            becameHost
          ) {
            setStatus(
              "Hosting meeting"
            );
          } else {
            /*
             * Participants derive the host PeerJS ID directly
             * from the room ID. No URL query parameter, API
             * registration, or host-ID handoff is required.
             */
            setStatus(
              "Connecting to host..."
            );

            window.setTimeout(
              () => {
                connectToHost(
                  hostPeerId
                );
              },
              300
            );
          }

          callStartedAtRef.current =
            Date.now();

          if (
            durationTimerRef.current
          ) {
            clearInterval(
              durationTimerRef.current
            );
          }

          durationTimerRef.current =
            window.setInterval(
              () => {
                if (
                  callStartedAtRef.current
                ) {
                  setCallSeconds(
                    Math.floor(
                      (
                        Date.now() -
                        callStartedAtRef.current
                      ) /
                        1000
                    )
                  );
                }
              },
              1000
            );

          if (
            statsTimerRef.current
          ) {
            clearInterval(
              statsTimerRef.current
            );
          }

          statsTimerRef.current =
            window.setInterval(
              () => {
                void measureQuality();
              },
              5000
            );


        
        } catch (
          startError
        ) {
          console.error(
            "Call initialization error:",
            startError
          );

          startedRef.current =
            false;

          localStreamRef.current
            ?.getTracks()
            .forEach(
              (track) =>
                track.stop()
            );

          localStreamRef.current =
            undefined;

          setLocalStream(
            undefined
          );

          setStatus(
            "Unable to join"
          );

          showError(
            "Camera or microphone permission was denied, or the meeting could not be started."
          );
        }
      },
      [
        connectToHost,
        measureQuality,
        roomId,
        setupDataConnection,
        setupIncomingCall,
        showError,
        userName,
      ]
    );

  const toggleMicrophone =
    () => {
      const track =
        localStreamRef.current?.getAudioTracks()[0];

      if (!track) {
        showError(
          "Microphone is not available."
        );

        return;
      }

      track.enabled =
        !track.enabled;

      micRef.current =
        track.enabled;

      setMicEnabled(
        track.enabled
      );

      window.setTimeout(
        broadcastState,
        0
      );
    };

  const restartLocalMedia =
    async () => {
      try {
        if (
          !navigator.mediaDevices?.getUserMedia
        ) {
          throw new Error(
            "Camera and microphone are not supported by this browser."
          );
        }

        const freshStream =
          await navigator.mediaDevices.getUserMedia({
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

        const newVideoTrack =
          freshStream.getVideoTracks()[0];

        const newAudioTrack =
          freshStream.getAudioTracks()[0];

        if (!newVideoTrack || !newAudioTrack) {
          freshStream.getTracks().forEach((track) => track.stop());
          throw new Error(
            "Camera or microphone track was not created."
          );
        }

        const oldStream =
          localStreamRef.current;

        const oldVideoTrack =
          oldStream?.getVideoTracks()[0];

        const oldAudioTrack =
          oldStream?.getAudioTracks()[0];

        mediaConnectionsRef.current.forEach(
          (connection) => {
            const pc =
              (
                connection as unknown as {
                  peerConnection?: RTCPeerConnection;
                }
              ).peerConnection;

            if (!pc) {
              return;
            }

            const videoSender =
              pc.getSenders().find(
                (sender) =>
                  sender.track?.kind === "video"
              );

            const audioSender =
              pc.getSenders().find(
                (sender) =>
                  sender.track?.kind === "audio"
              );

            if (videoSender) {
              void videoSender.replaceTrack(
                newVideoTrack
              );
            }

            if (audioSender) {
              void audioSender.replaceTrack(
                newAudioTrack
              );
            }
          }
        );

        const replacement =
          new MediaStream([
            newVideoTrack,
            newAudioTrack,
          ]);

        newVideoTrack.enabled = true;
        newAudioTrack.enabled = true;

        localStreamRef.current =
          replacement;

        setLocalStream(
          replacement
        );

        cameraRef.current = true;
        micRef.current = true;

        setCameraEnabled(true);
        setMicEnabled(true);

        oldVideoTrack?.stop();
        oldAudioTrack?.stop();

        freshStream.getTracks().forEach((track) => {
          if (
            track !== newVideoTrack &&
            track !== newAudioTrack
          ) {
            track.stop();
          }
        });

        window.setTimeout(
          broadcastState,
          0
        );
      } catch (
        mediaError
      ) {
        console.error(
          "Restart local media error:",
          mediaError
        );

        showError(
          "Unable to start camera and microphone. Please check browser permissions."
        );
      }
    };

  const restartCamera = restartLocalMedia;

  const toggleCamera =
    async () => {
      const track =
        localStreamRef.current?.getVideoTracks()[0];

      if (!track) {
        await restartCamera();
        return;
      }

      if (
        track.readyState ===
        "ended"
      ) {
        await restartCamera();
        return;
      }

      track.enabled =
        !track.enabled;

      cameraRef.current =
        track.enabled;

      setCameraEnabled(
        track.enabled
      );

      window.setTimeout(
        broadcastState,
        0
      );
    };

  const toggleRaiseHand =
    () => {
      raisedHandRef.current =
        !raisedHandRef.current;

      setRaisedHand(
        raisedHandRef.current
      );

      window.setTimeout(
        broadcastState,
        0
      );
    };

  const switchCamera =
    async () => {
      try {
        const devices =
          await navigator.mediaDevices.enumerateDevices();

        const cameras =
          devices.filter(
            (device) =>
              device.kind ===
              "videoinput"
          );

        if (
          cameras.length < 2
        ) {
          showError(
            "Only one camera is available."
          );

          return;
        }

        const currentTrack =
          localStreamRef.current?.getVideoTracks()[0];

        const currentDeviceId =
          currentTrack?.getSettings()
            .deviceId;

        const currentIndex =
          cameras.findIndex(
            (camera) =>
              camera.deviceId ===
              currentDeviceId
          );

        const nextCamera =
          cameras[
            (
              currentIndex +
              1
            ) %
              cameras.length
          ];

        if (!nextCamera) {
          return;
        }

        const newStream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: {
                deviceId: {
                  exact:
                    nextCamera.deviceId,
                },
              },
              audio: false,
            }
          );

        const newTrack =
          newStream.getVideoTracks()[0];

        if (!newTrack) {
          return;
        }

        mediaConnectionsRef.current.forEach(
          (
            connection
          ) => {
            const pc =
              (
                connection as unknown as {
                  peerConnection?: RTCPeerConnection;
                }
              )
                .peerConnection;

            const sender =
              pc
                ?.getSenders()
                .find(
                  (item) =>
                    item.track?.kind ===
                    "video"
                );

            if (
              sender
            ) {
              void sender.replaceTrack(
                newTrack
              );
            }
          }
        );

        const replacement =
          new MediaStream();

        replacement.addTrack(
          newTrack
        );

        localStreamRef.current
          ?.getAudioTracks()
          .forEach(
            (track) =>
              replacement.addTrack(
                track
              )
          );

        currentTrack?.stop();

        localStreamRef.current =
          replacement;

        setLocalStream(
          replacement
        );

        setCameraEnabled(
          true
        );

        cameraRef.current =
          true;

        broadcastState();
      } catch (
        cameraError
      ) {
        console.error(
          "Switch camera error:",
          cameraError
        );

        showError(
          "Unable to switch camera."
        );
      }
    };

  const toggleScreenShare =
    async () => {
      if (
        !allowScreenShareRef.current &&
        !isHostRef.current &&
        !isCoHostRef.current
      ) {
        showError(
          "Screen sharing is disabled by the host."
        );

        return;
      }

      if (
        screenSharing
      ) {
        try {
          const cameraStream =
            await navigator.mediaDevices.getUserMedia(
              {
                video: true,
                audio: false,
              }
            );

          const cameraTrack =
            cameraStream.getVideoTracks()[0];

          if (!cameraTrack) {
            return;
          }

          mediaConnectionsRef.current.forEach(
            (
              connection
            ) => {
              const pc =
                (
                  connection as unknown as {
                    peerConnection?: RTCPeerConnection;
                  }
                )
                  .peerConnection;

              const sender =
                pc
                  ?.getSenders()
                  .find(
                    (item) =>
                      item.track?.kind ===
                      "video"
                  );

              if (
                sender
              ) {
                void sender.replaceTrack(
                  cameraTrack
                );
              }
            }
          );

          const replacement =
            new MediaStream();

          replacement.addTrack(
            cameraTrack
          );

          localStreamRef.current
            ?.getAudioTracks()
            .forEach(
              (track) =>
                replacement.addTrack(
                  track
                )
            );

          localStreamRef.current
            ?.getVideoTracks()
            .forEach(
              (track) =>
                track.stop()
            );

          localStreamRef.current =
            replacement;

          setLocalStream(
            replacement
          );

          setScreenSharing(
            false
          );

          setCameraEnabled(
            true
          );

          cameraRef.current =
            true;

          broadcastState();
        } catch (
          restoreError
        ) {
          console.error(
            "Restore camera error:",
            restoreError
          );
        }

        return;
      }

      try {
        if (
          !navigator.mediaDevices
            ?.getDisplayMedia
        ) {
          showError(
            "Screen sharing is not supported."
          );

          return;
        }

        const displayStream =
          await navigator.mediaDevices.getDisplayMedia(
            {
              video: true,
              audio: false,
            }
          );

        const displayTrack =
          displayStream.getVideoTracks()[0];

        if (!displayTrack) {
          return;
        }

        displayTrack.onended =
          () => {
            if (
              mountedRef.current
            ) {
              setScreenSharing(
                false
              );

              setCameraEnabled(
                true
              );
            }
          };

        mediaConnectionsRef.current.forEach(
          (
            connection
          ) => {
            const pc =
              (
                connection as unknown as {
                  peerConnection?: RTCPeerConnection;
                }
              )
                .peerConnection;

            const sender =
              pc
                ?.getSenders()
                .find(
                  (item) =>
                    item.track?.kind ===
                    "video"
                );

            if (
              sender
            ) {
              void sender.replaceTrack(
                displayTrack
              );
            }
          }
        );

        const replacement =
          new MediaStream();

        replacement.addTrack(
          displayTrack
        );

        localStreamRef.current
          ?.getAudioTracks()
          .forEach(
            (track) =>
              replacement.addTrack(
                track
              )
          );

        localStreamRef.current
          ?.getVideoTracks()
          .forEach(
            (track) =>
              track.stop()
          );

        localStreamRef.current =
          replacement;

        setLocalStream(
          replacement
        );

        setScreenSharing(
          true
        );

        setCameraEnabled(
          false
        );

        cameraRef.current =
          false;

        broadcastState();
      } catch (
        screenError
      ) {
        console.error(
          "Screen share error:",
          screenError
        );

        showError(
          "Screen sharing was cancelled."
        );
      }
    };

  const sendChat =
    () => {
      if (
        !allowChatRef.current &&
        !isHostRef.current &&
        !isCoHostRef.current
      ) {
        showError(
          "Chat is disabled by the host."
        );

        return;
      }

      const text =
        chatMessage.trim();

      if (!text) {
        return;
      }

      const message: ChatMessage =
        {
          id: createId(
            "message"
          ),
          senderId:
            peerIdRef.current,
          senderName:
            userName,
          text,
          time:
            new Date().toLocaleTimeString(
              [],
              {
                hour: "2-digit",
                minute:
                  "2-digit",
              }
            ),
        };

      setMessages(
        (previous) => [
          ...previous,
          message,
        ]
      );

      sendToAll({
        type: "chat",
        message,
      });

      setChatMessage("");
    };

  const sendFile =
    (file: File) => {
      if (
        !allowChatRef.current &&
        !isHostRef.current &&
        !isCoHostRef.current
      ) {
        showError(
          "File sharing is disabled by the host."
        );

        return;
      }

      if (
        file.size >
        MAX_FILE_SIZE
      ) {
        showError(
          "File must be smaller than 1 MB."
        );

        return;
      }

      const reader =
        new FileReader();

      reader.onload =
        () => {
          const fileUrl =
            typeof reader.result ===
            "string"
              ? reader.result
              : "";

          const message: ChatMessage =
            {
              id: createId(
                "file"
              ),
              senderId:
                peerIdRef.current,
              senderName:
                userName,
              text:
                `Shared file: ${file.name}`,
              time:
                new Date().toLocaleTimeString(
                  [],
                  {
                    hour:
                      "2-digit",
                    minute:
                      "2-digit",
                  }
                ),
              fileName:
                file.name,
              fileUrl,
            };

          setMessages(
            (previous) => [
              ...previous,
              message,
            ]
          );

          sendToAll({
            type: "chat",
            message,
          });
        };

      reader.onerror =
        () => {
          showError(
            "Unable to read this file."
          );
        };

      reader.readAsDataURL(
        file
      );
    };

  const sendReaction =
    (emoji: string) => {
      const reaction = {
        id: createId(
          "reaction"
        ),
        emoji,
        name: userName,
      };

      setReactions(
        (previous) => [
          ...previous,
          reaction,
        ]
      );

      sendToAll({
        type: "reaction",
        peerId:
          peerIdRef.current,
        emoji,
      });

      window.setTimeout(
        () => {
          setReactions(
            (previous) =>
              previous.filter(
                (item) =>
                  item.id !==
                  reaction.id
              )
          );
        },
        2500
      );
    };

  const copyRoomLink =
    async () => {
      try {
        const meetingLink =
          `${window.location.origin}/call/${roomId}`;

        await navigator.clipboard.writeText(
          meetingLink
        );

        setCopied(
          true
        );

        window.setTimeout(
          () => {
            setCopied(
              false
            );
          },
          2000
        );
      } catch {
        showError(
          "Unable to copy meeting link."
        );
      }
    };

  const lockMeeting =
    () => {
      if (
        !isHostRef.current &&
        !isCoHostRef.current
      ) {
        return;
      }

      const next =
        !meetingLockedRef.current;

      meetingLockedRef.current =
        next;

      setMeetingLocked(
        next
      );

      sendToAll({
        type: "lock",
        locked: next,
      });
    };

  const toggleChatPermission =
    () => {
      if (
        !isHostRef.current &&
        !isCoHostRef.current
      ) {
        return;
      }

      const next =
        !allowChatRef.current;

      allowChatRef.current =
        next;

      setAllowChat(
        next
      );

      sendToAll({
        type: "permissions",
        allowChat:
          next,
        allowScreenShare:
          allowScreenShareRef.current,
      });

      if (!next) {
        setChatOpen(
          false
        );
      }
    };

  const toggleScreenSharePermission =
    () => {
      if (
        !isHostRef.current &&
        !isCoHostRef.current
      ) {
        return;
      }

      const next =
        !allowScreenShareRef.current;

      allowScreenShareRef.current =
        next;

      setAllowScreenShare(
        next
      );

      sendToAll({
        type: "permissions",
        allowChat:
          allowChatRef.current,
        allowScreenShare:
          next,
      });
    };

  const muteParticipant =
    (
      participant: Participant
    ) => {
      if (
        !isHostRef.current &&
        !isCoHostRef.current
      ) {
        return;
      }

      sendToPeer(
        participant.peerId,
        {
          type: "mute",
          peerId:
            participant.peerId,
        }
      );
    };

  const removeParticipantFromMeeting =
    (
      participant: Participant
    ) => {
      if (
        !isHostRef.current &&
        !isCoHostRef.current
      ) {
        return;
      }

      sendToPeer(
        participant.peerId,
        {
          type: "remove",
          peerId:
            participant.peerId,
        }
      );

      removeParticipant(
        participant.peerId
      );

      window.setTimeout(
        sendRoster,
        100
      );
    };

  const promoteParticipant =
    (
      participant: Participant
    ) => {
      if (
        !isHostRef.current
      ) {
        return;
      }

      sendToPeer(
        participant.peerId,
        {
          type: "promote",
          peerId:
            participant.peerId,
        }
      );

      updateParticipant(
        participant.peerId,
        {
          coHost: true,
        }
      );

      window.setTimeout(
        sendRoster,
        100
      );
    };

  const endMeeting =
    () => {
      if (
        isHostRef.current
      ) {
        sendToAll({
          type: "meeting-ended",
        });
      }

      cleanup(
        true
      );
    };

  useEffect(() => {
    mountedRef.current =
      true;

    return () => {
      mountedRef.current =
        false;

      cleanup(
        false
      );
    };
  }, [
    cleanup,
  ]);

  useEffect(() => {
    participantsRef.current =
      participants;
  }, [
    participants,
  ]);

  useEffect(() => {
    userNameRef.current =
      userName;

    micRef.current =
      micEnabled;

    cameraRef.current =
      cameraEnabled;

    raisedHandRef.current =
      raisedHand;

    isHostRef.current =
      isHost;

    isCoHostRef.current =
      isCoHost;

    meetingLockedRef.current =
      meetingLocked;

    allowChatRef.current =
      allowChat;

    allowScreenShareRef.current =
      allowScreenShare;
  }, [
    userName,
    micEnabled,
    cameraEnabled,
    raisedHand,
    isHost,
    isCoHost,
    meetingLocked,
    allowChat,
    allowScreenShare,
  ]);

  useEffect(() => {
    if (
      !router.isReady
    ) {
      return;
    }

    const user =
      getCurrentUser();

    if (!user) {
      void router.replace(
        `/login?returnUrl=${encodeURIComponent(
          router.asPath
        )}`
      );

      return;
    }

    setUserName(
      user.name ||
        "Guest"
    );

    userNameRef.current =
      user.name ||
      "Guest";
  }, [
    router.isReady,
    router,
  ]);

  useEffect(() => {
    if (
      !router.isReady ||
      !roomId ||
      !userName ||
      startedRef.current
    ) {
      return;
    }

    void startPeer();
  }, [
    router.isReady,
    roomId,
    userName,
    startPeer,
  ]);

  useEffect(() => {
    if (
      localVideoRef.current &&
      localStream
    ) {
      localVideoRef.current.srcObject =
        localStream;
    }
  }, [
    localStream,
  ]);

  useEffect(() => {
    const handleBeforeUnload =
      () => {
        intentionalLeaveRef.current =
          true;

        if (
          reconnectTimerRef.current
        ) {
          clearTimeout(
            reconnectTimerRef.current
          );
        }

        const peer =
          peerRef.current;

        peerRef.current =
          null;

        try {
          if (
            peer &&
            !peer.destroyed
          ) {
            peer.destroy();
          }
        } catch {}

        localStreamRef.current
          ?.getTracks()
          .forEach(
            (track) =>
              track.stop()
          );
      };

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload
      );
    };
  }, []);

  useEffect(() => {
    return () => {
      if (
        durationTimerRef.current
      ) {
        clearInterval(
          durationTimerRef.current
        );
      }

      if (
        statsTimerRef.current
      ) {
        clearInterval(
          statsTimerRef.current
        );
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyboard =
      (
        event: KeyboardEvent
      ) => {
        const target =
          event.target as HTMLElement;

        if (
          target.tagName ===
            "INPUT" ||
          target.tagName ===
            "TEXTAREA"
        ) {
          return;
        }

        const key =
          event.key.toLowerCase();

        if (
          key === "m"
        ) {
          toggleMicrophone();
        }

        if (
          key === "v"
        ) {
          toggleCamera();
        }

        if (
          key === "h"
        ) {
          toggleRaiseHand();
        }

        if (
          key === "c" &&
          allowChatRef.current
        ) {
          setChatOpen(
            (previous) =>
              !previous
          );
        }
      };

    window.addEventListener(
      "keydown",
      handleKeyboard
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyboard
      );
    };
  });

  const remoteParticipants =
    participants.filter(
      (participant) =>
        participant.peerId !==
        peerId
    );

  const selectedParticipant =
    participants.find(
      (participant) =>
        participant.peerId ===
        fullscreenPeer
    );

  if (
    !router.isReady
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0f0f0f] text-white">
        <RefreshCw
          size={28}
          className="animate-spin"
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-white">
      {/* Header */}
      <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-[#181818] px-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={
              endMeeting
            }
            className="flex shrink-0 items-center gap-2"
          >
            <div className="flex h-8 w-11 items-center justify-center rounded-lg bg-red-600 font-bold">
              ▶
            </div>

            <span className="hidden font-bold sm:inline">
              YouTube Clone
            </span>
          </button>

          <div className="hidden h-6 w-px bg-white/10 sm:block" />

          <div className="min-w-0">
            <p className="text-sm font-semibold">
              Video call
            </p>

            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <span>
                {status}
              </span>

              <span>
                •
              </span>

              <span>
                {formatDuration(
                  callSeconds
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <div className="hidden items-center gap-1 md:flex">
            {ownQuality ===
            "poor" ? (
              <WifiOff
                size={15}
                className={qualityClass(
                  ownQuality
                )}
              />
            ) : (
              <Wifi
                size={15}
                className={qualityClass(
                  ownQuality
                )}
              />
            )}

            <span
              className={`text-xs ${qualityClass(
                ownQuality
              )}`}
            >
              {qualityLabel(
                ownQuality
              )}
            </span>
          </div>

          {reconnecting && (
            <RefreshCw
              size={15}
              className="animate-spin text-yellow-300"
            />
          )}

          {meetingLocked && (
            <span className="hidden rounded-full bg-yellow-500/10 px-3 py-1.5 text-[11px] text-yellow-300 sm:inline">
              Locked
            </span>
          )}

          <button
            type="button"
            onClick={
              copyRoomLink
            }
            className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs hover:bg-white/15"
          >
            {copied ? (
              <Check
                size={15}
              />
            ) : (
              <Copy
                size={15}
              />
            )}

            <span className="hidden sm:inline">
              {copied
                ? "Copied"
                : "Invite"}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setParticipantsOpen(
                (previous) =>
                  !previous
              )
            }
            className="rounded-full p-2 hover:bg-white/10"
            title="Participants"
          >
            <Users
              size={20}
            />
          </button>

          {allowChat && (
            <button
              type="button"
              onClick={() =>
                setChatOpen(
                  (previous) =>
                    !previous
                )
              }
              className="rounded-full p-2 hover:bg-white/10"
              title="Chat"
            >
              <MessageSquare
                size={20}
              />
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <section className="min-h-screen px-3 pb-28 pt-20 sm:px-5">
        {error && (
          <div className="mx-auto mb-4 flex max-w-6xl items-center gap-3 rounded-xl border border-red-500/30 bg-red-950 px-4 py-3 text-sm text-red-200">
            <ShieldCheck
              size={18}
            />

            <span className="flex-1">
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              className="rounded-full p-1 hover:bg-white/10"
            >
              <X
                size={15}
              />
            </button>
          </div>
        )}

        {selectedParticipant?.stream ? (
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl bg-black">
            <video
              autoPlay
              playsInline
              ref={(element) => {
                if (
                  element &&
                  selectedParticipant.stream
                ) {
                  element.srcObject =
                    selectedParticipant.stream;
                }
              }}
              className="h-[calc(100vh-190px)] w-full object-contain"
            />

            <div className="absolute left-4 top-4 rounded-full bg-black/70 px-3 py-2 text-xs">
              {
                selectedParticipant.name
              }
            </div>

            <button
              type="button"
              onClick={() =>
                setFullscreenPeer(
                  null
                )
              }
              className="absolute right-4 top-4 rounded-full bg-black/70 p-2 hover:bg-black"
            >
              <Maximize2
                size={18}
              />
            </button>
          </div>
        ) : (
          <div
            className={`mx-auto grid max-w-7xl gap-3 ${
              participants.length <=
              1
                ? "grid-cols-1"
                : participants.length <=
                  4
                ? "sm:grid-cols-2"
                : "sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            <LocalVideoTile
              name={userName}
              stream={localStream}
              cameraOff={!cameraEnabled}
              muted={!micEnabled}
              onVideoFailure={restartLocalMedia}
              speaking={
                participants.find(
                  (participant) =>
                    participant.peerId === peerId
                )?.speaking || false
              }
              host={isHost}
              coHost={isCoHost}
              quality={ownQuality}
              raisedHand={raisedHand}
            />

            {remoteParticipants.map(
              (
                participant
              ) => (
                <VideoTile
                  key={
                    participant.peerId
                  }
                  name={
                    participant.name
                  }
                  stream={
                    participant.stream
                  }
                  cameraOff={
                    participant.cameraOff
                  }
                  muted={
                    participant.muted
                  }
                  speaking={
                    participant.speaking
                  }
                  host={
                    participant.host
                  }
                  coHost={
                    participant.coHost
                  }
                  quality={
                    participant.quality
                  }
                  raisedHand={
                    participant.raisedHand
                  }
                  onFullscreen={() =>
                    setFullscreenPeer(
                      participant.peerId
                    )
                  }
                />
              )
            )}
          </div>
        )}

        {participants.length <=
          1 && (
          <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
            <UserPlus
              size={34}
              className="mx-auto text-gray-500"
            />

            <p className="mt-3 text-sm font-semibold">
              Waiting for participants
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Share the meeting link to invite participants.
            </p>

            <button
              type="button"
              onClick={
                copyRoomLink
              }
              className="mt-4 rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-black hover:bg-gray-200"
            >
              {copied
                ? "Link copied"
                : "Copy meeting link"}
            </button>
          </div>
        )}

        <div className="pointer-events-none fixed bottom-24 left-1/2 z-40 -translate-x-1/2">
          <div className="flex flex-col gap-2">
            {reactions.map(
              (
                reaction
              ) => (
                <div
                  key={
                    reaction.id
                  }
                  className="rounded-full bg-black/75 px-4 py-2 text-2xl shadow-xl"
                >
                  {
                    reaction.emoji
                  }

                  <span className="ml-2 text-xs">
                    {
                      reaction.name
                    }
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* Participants Panel */}
      {participantsOpen && (
        <aside className="fixed bottom-0 right-0 top-16 z-50 flex w-full flex-col border-l border-white/10 bg-[#181818] shadow-2xl sm:w-96">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
            <div>
              <p className="font-semibold">
                Participants
              </p>

              <p className="text-xs text-gray-500">
                {participants.length}/
                {
                  MAX_PARTICIPANTS
                }
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setParticipantsOpen(
                  false
                )
              }
              className="rounded-full p-2 hover:bg-white/10"
            >
              <X
                size={18}
              />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-2">
              {participants.map(
                (
                  participant
                ) => (
                  <div
                    key={
                      participant.peerId
                    }
                    className="rounded-xl bg-white/5 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 text-sm font-bold">
                        {participant.name
                          .slice(
                            0,
                            1
                          )
                          .toUpperCase()}

                        {participant.speaking && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#181818] bg-green-400" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold">
                            {
                              participant.name
                            }
                          </p>

                          {participant.host && (
                            <span className="text-[9px] text-yellow-300">
                              HOST
                            </span>
                          )}

                          {participant.coHost && (
                            <span className="text-[9px] text-blue-300">
                              CO-HOST
                            </span>
                          )}

                          {participant.peerId ===
                            peerId && (
                            <span className="text-[9px] text-green-300">
                              YOU
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex items-center gap-3 text-gray-400">
                          {participant.muted ? (
                            <MicOff
                              size={14}
                              className="text-red-400"
                            />
                          ) : (
                            <Mic
                              size={14}
                            />
                          )}

                          {participant.cameraOff ? (
                            <VideoOff
                              size={14}
                              className="text-red-400"
                            />
                          ) : (
                            <Video
                              size={14}
                            />
                          )}

                          <span
                            className={`text-[10px] ${qualityClass(
                              participant.quality
                            )}`}
                          >
                            {qualityLabel(
                              participant.quality
                            )}
                          </span>

                          {participant.raisedHand && (
                            <Hand
                              size={14}
                              className="text-yellow-300"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {(isHost ||
                      isCoHost) &&
                      participant.peerId !==
                        peerId &&
                      !participant.host && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              muteParticipant(
                                participant
                              )
                            }
                            className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] hover:bg-white/15"
                          >
                            <MicOff
                              size={12}
                              className="mr-1 inline"
                            />
                            Mute
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              removeParticipantFromMeeting(
                                participant
                              )
                            }
                            className="rounded-full bg-red-500/10 px-3 py-1.5 text-[11px] text-red-300 hover:bg-red-500/20"
                          >
                            <UserMinus
                              size={12}
                              className="mr-1 inline"
                            />
                            Remove
                          </button>

                          {isHost &&
                            !participant.coHost && (
                              <button
                                type="button"
                                onClick={() =>
                                  promoteParticipant(
                                    participant
                                  )
                                }
                                className="rounded-full bg-yellow-500/10 px-3 py-1.5 text-[11px] text-yellow-300 hover:bg-yellow-500/20"
                              >
                                <Crown
                                  size={12}
                                  className="mr-1 inline"
                                />
                                Co-host
                              </button>
                            )}
                        </div>
                      )}
                  </div>
                )
              )}
            </div>
          </div>
        </aside>
      )}

      {/* Chat Panel */}
      {chatOpen &&
        allowChat && (
          <aside className="fixed bottom-0 right-0 top-16 z-50 flex w-full flex-col border-l border-white/10 bg-[#181818] shadow-2xl sm:w-96">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <div>
                <p className="font-semibold">
                  In-call chat
                </p>

                <p className="text-xs text-gray-500">
                  Messages and small files
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setChatOpen(
                    false
                  )
                }
                className="rounded-full p-2 hover:bg-white/10"
              >
                <X
                  size={18}
                />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {messages.length ===
              0 ? (
                <div className="flex h-full items-center justify-center text-center text-gray-500">
                  <div>
                    <MessageSquare
                      size={34}
                      className="mx-auto"
                    />

                    <p className="mt-3 text-sm">
                      No messages yet
                    </p>

                    <p className="mt-1 text-xs">
                      Start a conversation.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map(
                    (
                      message
                    ) => (
                      <div
                        key={
                          message.id
                        }
                        className="rounded-xl bg-white/5 p-3"
                      >
                        <div className="flex justify-between gap-2">
                          <p className="text-xs font-semibold">
                            {
                              message.senderName
                            }
                          </p>

                          <p className="text-[10px] text-gray-500">
                            {
                              message.time
                            }
                          </p>
                        </div>

                        <p className="mt-1 break-words text-sm text-gray-200">
                          {
                            message.text
                          }
                        </p>

                        {message.fileUrl &&
                          message.fileName && (
                            <a
                              href={
                                message.fileUrl
                              }
                              download={
                                message.fileName
                              }
                              className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-black"
                            >
                              <PaperclipIcon />
                              Download file
                            </a>
                          )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-white/10 p-3">
              <div className="mb-3 flex gap-1 overflow-x-auto">
                {EMOJIS.map(
                  (
                    emoji
                  ) => (
                    <button
                      key={
                        emoji
                      }
                      type="button"
                      onClick={() =>
                        sendReaction(
                          emoji
                        )
                      }
                      className="rounded-full px-2 py-1.5 hover:bg-white/10"
                    >
                      {emoji}
                    </button>
                  )
                )}
              </div>

              <div className="flex gap-2">
                <label className="rounded-full p-2 text-gray-400 hover:bg-white/10">
                  <PaperclipIcon />

                  <input
                    type="file"
                    className="hidden"
                    onChange={(
                      event
                    ) => {
                      const file =
                        event.target.files?.[0];

                      if (
                        file
                      ) {
                        sendFile(
                          file
                        );
                      }

                      event.target.value =
                        "";
                    }}
                  />
                </label>

                <input
                  value={
                    chatMessage
                  }
                  onChange={(
                    event
                  ) =>
                    setChatMessage(
                      event.target.value
                    )
                  }
                  onKeyDown={(
                    event
                  ) => {
                    if (
                      event.key ===
                      "Enter"
                    ) {
                      sendChat();
                    }
                  }}
                  placeholder="Type a message..."
                  className="min-w-0 flex-1 rounded-full bg-white/5 px-4 text-sm outline-none placeholder:text-gray-500"
                />

                <button
                  type="button"
                  onClick={
                    sendChat
                  }
                  className="rounded-full bg-white p-2 text-black hover:bg-gray-200"
                >
                  <Send
                    size={17}
                  />
                </button>
              </div>
            </div>
          </aside>
        )}

      {/* Bottom Controls */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#181818]/95 px-2 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-center gap-1 sm:gap-2">
          <Control
            active={
              micEnabled
            }
            title={
              micEnabled
                ? "Mute"
                : "Unmute"
            }
            onClick={
              toggleMicrophone
            }
            icon={
              micEnabled ? (
                <Mic
                  size={19}
                />
              ) : (
                <MicOff
                  size={19}
                />
              )
            }
          />

          <Control
            active={
              cameraEnabled
            }
            title={
              cameraEnabled
                ? "Camera off"
                : "Camera on"
            }
            onClick={
              toggleCamera
            }
            icon={
              cameraEnabled ? (
                <Video
                  size={19}
                />
              ) : (
                <VideoOff
                  size={19}
                />
              )
            }
          />

          <button
            type="button"
            onClick={
              switchCamera
            }
            title="Switch camera"
            className="hidden rounded-full bg-white/10 p-3 hover:bg-white/15 sm:block"
          >
            <Camera
              size={19}
            />
          </button>

          <button
            type="button"
            onClick={
              toggleScreenShare
            }
            title="Screen share"
            className={`rounded-full p-3 ${
              screenSharing
                ? "bg-blue-600"
                : "bg-white/10"
            }`}
          >
            <MonitorUp
              size={19}
            />
          </button>

          <button
            type="button"
            onClick={
              toggleRaiseHand
            }
            title="Raise hand"
            className={`rounded-full p-3 ${
              raisedHand
                ? "bg-yellow-500 text-black"
                : "bg-white/10"
            }`}
          >
            <Hand
              size={19}
            />
          </button>

          {allowChat && (
            <button
              type="button"
              onClick={() =>
                setChatOpen(
                  (previous) =>
                    !previous
                )
              }
              title="Chat"
              className="rounded-full bg-white/10 p-3 hover:bg-white/15"
            >
              <MessageSquare
                size={19}
              />
            </button>
          )}

          <button
            type="button"
            onClick={() =>
              setParticipantsOpen(
                (previous) =>
                  !previous
              )
            }
            title="Participants"
            className="rounded-full bg-white/10 p-3 hover:bg-white/15"
          >
            <Users
              size={19}
            />
          </button>

          <button
            type="button"
            onClick={() =>
              setSettingsOpen(
                (previous) =>
                  !previous
              )
            }
            title="Settings"
            className="rounded-full bg-white/10 p-3 hover:bg-white/15"
          >
            <Settings
              size={19}
            />
          </button>

          {(isHost ||
            isCoHost) && (
            <button
              type="button"
              onClick={
                lockMeeting
              }
              title={
                meetingLocked
                  ? "Unlock meeting"
                  : "Lock meeting"
              }
              className="hidden rounded-full bg-white/10 p-3 hover:bg-white/15 sm:block"
            >
              {meetingLocked ? (
                <Unlock
                  size={19}
                />
              ) : (
                <Lock
                  size={19}
                />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={
              endMeeting
            }
            title={
              isHost
                ? "End meeting"
                : "Leave meeting"
            }
            className="ml-1 rounded-full bg-red-600 p-3 hover:bg-red-700 sm:ml-3"
          >
            <PhoneOff
              size={19}
            />
          </button>
        </div>

        {/* Settings */}
        {settingsOpen && (
          <div className="absolute bottom-20 left-1/2 w-[calc(100%-24px)] max-w-sm -translate-x-1/2 rounded-2xl border border-white/10 bg-[#202020] p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">
                  Meeting settings
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {isHost
                    ? "Host controls"
                    : "Call controls"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSettingsOpen(
                    false
                  )
                }
                className="rounded-full p-2 hover:bg-white/10"
              >
                <X
                  size={17}
                />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <div className="rounded-xl bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">
                      Connection quality
                    </p>

                    <p
                      className={`mt-1 text-xs ${qualityClass(
                        ownQuality
                      )}`}
                    >
                      {qualityLabel(
                        ownQuality
                      )}
                    </p>
                  </div>

                  {ownQuality ===
                  "poor" ? (
                    <WifiOff
                      size={18}
                      className="text-red-400"
                    />
                  ) : (
                    <Wifi
                      size={18}
                      className="text-green-400"
                    />
                  )}
                </div>
              </div>

              {(isHost ||
                isCoHost) && (
                <>
                  <button
                    type="button"
                    onClick={
                      lockMeeting
                    }
                    className="flex w-full items-center justify-between rounded-xl bg-white/5 p-3 text-sm hover:bg-white/10"
                  >
                    <span>
                      {meetingLocked
                        ? "Unlock meeting"
                        : "Lock meeting"}
                    </span>

                    {meetingLocked ? (
                      <Lock
                        size={17}
                      />
                    ) : (
                      <Unlock
                        size={17}
                      />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={
                      toggleChatPermission
                    }
                    className="flex w-full items-center justify-between rounded-xl bg-white/5 p-3 text-sm hover:bg-white/10"
                  >
                    <span>
                      {allowChat
                        ? "Disable chat"
                        : "Enable chat"}
                    </span>

                    <MessageSquare
                      size={17}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={
                      toggleScreenSharePermission
                    }
                    className="flex w-full items-center justify-between rounded-xl bg-white/5 p-3 text-sm hover:bg-white/10"
                  >
                    <span>
                      {allowScreenShare
                        ? "Disable screen sharing"
                        : "Enable screen sharing"}
                    </span>

                    <MonitorUp
                      size={17}
                    />
                  </button>
                </>
              )}

              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-xs font-semibold">
                  Keyboard shortcuts
                </p>

                <p className="mt-2 text-xs text-gray-500">
                  M — microphone
                </p>

                <p className="text-xs text-gray-500">
                  V — camera
                </p>

                <p className="text-xs text-gray-500">
                  H — raise hand
                </p>

                <p className="text-xs text-gray-500">
                  C — chat
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Control({
  active,
  title,
  onClick,
  icon,
}: {
  active: boolean;
  title: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded-full p-3 transition hover:bg-white/15 ${
        active
          ? "bg-white/10"
          : "bg-red-600/20 text-red-300"
      }`}
    >
      {icon}
    </button>
  );
}

function LocalVideoTile({
  name,
  stream,
  cameraOff,
  muted,
  onVideoFailure,
  speaking,
  host,
  coHost,
  quality,
  raisedHand,
}: {
  name: string;
  stream?: MediaStream;
  cameraOff: boolean;
  muted: boolean;
  onVideoFailure?: () => void | Promise<void>;
  speaking: boolean;
  host: boolean;
  coHost: boolean;
  quality: ConnectionQuality;
  raisedHand: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const attach = () => {
      if (!stream || cameraOff) {
        video.pause();
        video.srcObject = null;
        return;
      }

      const videoTrack = stream.getVideoTracks().find(
        (track) => track.readyState === "live"
      );

      if (!videoTrack) {
        video.srcObject = null;
        return;
      }

      videoTrack.enabled = true;
      video.srcObject = stream;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;

      void video.play().catch(() => {});
    };

    attach();

    let recoveryInProgress = false;
    let lastRecoveryAt = 0;

    const retryTimer = window.setInterval(() => {
      if (!stream || cameraOff) {
        return;
      }

      if (video.videoWidth > 0 && !video.paused) {
        return;
      }

      attach();

      const now = Date.now();

      if (
        video.videoWidth === 0 &&
        onVideoFailure &&
        !recoveryInProgress &&
        now - lastRecoveryAt > 2500
      ) {
        recoveryInProgress = true;
        lastRecoveryAt = now;

        Promise.resolve(
          onVideoFailure()
        ).finally(() => {
          recoveryInProgress = false;
        });
      }
    }, 500);

    return () => {
      window.clearInterval(retryTimer);
    };
  }, [stream, cameraOff, onVideoFailure]);

  return (
    <div
      className={`relative aspect-video overflow-hidden rounded-2xl bg-black ring-2 ${
        speaking ? "ring-green-400" : "ring-transparent"
      }`}
    >
      {stream && !cameraOff ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          controls={false}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-700 text-xl font-bold">
              {name.slice(0, 1).toUpperCase()}
            </div>
            <p className="mt-3 text-sm">
              {cameraOff ? "Camera off" : "Connecting..."}
            </p>
          </div>
        </div>
      )}

      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/65 px-3 py-1.5 text-xs">
        <span>You</span>
        {host && <span className="text-yellow-300">HOST</span>}
        {coHost && <span className="text-blue-300">CO-HOST</span>}
        {speaking && <span className="h-2 w-2 rounded-full bg-green-400" />}
      </div>

      <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/65 px-2.5 py-1.5">
        {muted ? (
          <MicOff size={14} className="text-red-400" />
        ) : (
          <Mic size={14} />
        )}
        <span className={`text-[10px] ${qualityClass(quality)}`}>
          {qualityLabel(quality)}
        </span>
      </div>

      {raisedHand && (
        <div className="absolute right-3 top-3 rounded-full bg-yellow-400 p-2 text-black">
          <Hand size={15} />
        </div>
      )}
    </div>
  );
}

function VideoTile({
  local = false,
  name,
  stream,
  cameraOff,
  muted,
  speaking,
  host,
  coHost,
  quality,
  raisedHand,
  onFullscreen,
}: {
  local?: boolean;
  name: string;
  stream?: MediaStream;
  cameraOff: boolean;
  muted: boolean;
  speaking: boolean;
  host: boolean;
  coHost: boolean;
  quality: ConnectionQuality;
  raisedHand: boolean;
  onFullscreen: () => void;
}) {
  const videoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  useEffect(() => {
    const video =
      videoRef.current;

    if (!video) {
      return;
    }

    if (!stream || cameraOff) {
      video.pause();
      video.srcObject = null;
      return;
    }

    const tracks =
      stream.getVideoTracks();

    if (tracks.length === 0) {
      video.srcObject = null;
      return;
    }

    const liveVideoTrack =
      tracks.find(
        (track) =>
          track.readyState ===
          "live"
      );

    if (
      !liveVideoTrack
    ) {
      video.srcObject = null;
      return;
    }

    liveVideoTrack.enabled =
      true;

    video.srcObject =
      stream;
    video.autoplay = true;
    video.playsInline = true;
    video.muted = local;

    const playVideo =
      async () => {
        try {
          await video.play();
        } catch (
          playbackError
        ) {
          console.warn(
            "Video playback could not start automatically:",
            playbackError
          );
        }
      };

    const handleLoadedMetadata =
      () => {
        void playVideo();
      };

    const handleCanPlay =
      () => {
        void playVideo();
      };

    video.addEventListener(
      "loadedmetadata",
      handleLoadedMetadata
    );

    video.addEventListener(
      "canplay",
      handleCanPlay
    );

    void playVideo();

    return () => {
      video.removeEventListener(
        "loadedmetadata",
        handleLoadedMetadata
      );

      video.removeEventListener(
        "canplay",
        handleCanPlay
      );
    };
  }, [
    local,
    stream,
    cameraOff,
  ]);

  return (
    <div
      className={`relative aspect-video overflow-hidden rounded-2xl bg-black ring-2 ${
        speaking
          ? "ring-green-400"
          : "ring-transparent"
      }`}
    >
      {stream &&
      !cameraOff &&
      stream
        .getVideoTracks()
        .some(
          (track) =>
            track.readyState ===
            "live"
        ) ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={local}
          controls={false}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center">
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold ${
                speaking
                  ? "bg-green-500 text-black"
                  : "bg-gray-700"
              }`}
            >
              {name
                .slice(0, 1)
                .toUpperCase()}
            </div>

            <p className="mt-3 text-sm">
              {cameraOff
                ? "Camera off"
                : "Camera unavailable"}
            </p>
          </div>
        </div>
      )}

      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/65 px-3 py-1.5 text-xs">
        <span>
          {local
            ? "You"
            : name}
        </span>

        {host && (
          <span className="text-yellow-300">
            HOST
          </span>
        )}

        {coHost && (
          <span className="text-blue-300">
            CO-HOST
          </span>
        )}

        {speaking && (
          <span className="h-2 w-2 rounded-full bg-green-400" />
        )}
      </div>

      <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/65 px-2.5 py-1.5">
        {muted ? (
          <MicOff
            size={14}
            className="text-red-400"
          />
        ) : (
          <Mic
            size={14}
          />
        )}

        <span
          className={`text-[10px] ${qualityClass(
            quality
          )}`}
        >
          {qualityLabel(
            quality
          )}
        </span>
      </div>

      {raisedHand && (
        <div className="absolute right-3 top-3 rounded-full bg-yellow-400 p-2 text-black">
          <Hand
            size={15}
          />
        </div>
      )}

      {!local && (
        <button
          type="button"
          onClick={
            onFullscreen
          }
          title="Fullscreen"
          className="absolute bottom-3 right-3 rounded-full bg-black/65 p-2 hover:bg-black"
        >
          <Maximize2
            size={15}
          />
        </button>
      )}
    </div>
  );
}

function PaperclipIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}
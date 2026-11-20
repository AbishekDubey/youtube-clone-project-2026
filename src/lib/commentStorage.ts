import { getCurrentUser } from "@/lib/auth";

export type CommentReportReason =
  | "spam"
  | "harassment"
  | "offensive";

export type CommentUser = {
  username: string;
  displayName: string;
  avatar: string;
  location: string;
  email?: string;
};

export type VideoComment = {
  id: string;
  videoId: number;
  user: CommentUser;
  text: string;
  language: string;
  createdAt: string;
  updatedAt: string;
  edited: boolean;
  likes: number;
  dislikes: number;

  likedByCurrentUser: boolean;
  dislikedByCurrentUser: boolean;

  likedBy: string[];
  dislikedBy: string[];

  parentId: string | null;
  replyCount: number;

  reported: boolean;
  reportReasons: CommentReportReason[];
};

export type CommentReport = {
  id: string;
  commentId: string;
  reason: CommentReportReason;
  reportedAt: string;
  reportedBy: string;
};

export type ModerationRecord = {
  id: string;
  commentId: string;
  action:
    | "approved"
    | "blocked"
    | "reported"
    | "deleted"
    | "edited";
  reason: string;
  createdAt: string;
};

const COMMENT_KEY = "youtube_comments";
const REPORT_KEY = "youtube_comment_reports";
const MODERATION_KEY =
  "youtube_comment_moderation";

const EDIT_TIME_LIMIT =
  15 * 60 * 1000;

function getCurrentActorId() {
  if (typeof window === "undefined") {
    return "guest";
  }

  const user = getCurrentUser();

  if (!user) {
    return "guest";
  }

  return (
    user.email ||
    user.name ||
    "guest"
  ).toLowerCase();
}

function readStorage<T>(
  key: string,
  fallback: T
): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const data =
      localStorage.getItem(key);

    if (!data) {
      return fallback;
    }

    const parsed = JSON.parse(data);

    return parsed as T;
  } catch (error) {
    console.error(
      `Failed to read ${key}:`,
      error
    );

    return fallback;
  }
}

function writeStorage<T>(
  key: string,
  value: T
) {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    localStorage.setItem(
      key,
      JSON.stringify(value)
    );

    return true;
  } catch (error) {
    console.error(
      `Failed to save ${key}:`,
      error
    );

    return false;
  }
}

function normalizeComment(
  comment: VideoComment
): VideoComment {
  const likedBy = Array.isArray(
    comment.likedBy
  )
    ? comment.likedBy
    : [];

  const dislikedBy = Array.isArray(
    comment.dislikedBy
  )
    ? comment.dislikedBy
    : [];

  const currentActor =
    getCurrentActorId();

  return {
    ...comment,

    user: {
      username:
        comment.user?.username ||
        "user",
      displayName:
        comment.user?.displayName ||
        "Guest User",
      avatar:
        comment.user?.avatar ||
        "",
      location:
        comment.user?.location ||
        "India",
      email:
        comment.user?.email ||
        "",
    },

    text:
      typeof comment.text ===
      "string"
        ? comment.text
        : "",

    language:
      comment.language ||
      "English",

    createdAt:
      comment.createdAt ||
      new Date().toISOString(),

    updatedAt:
      comment.updatedAt ||
      comment.createdAt ||
      new Date().toISOString(),

    edited:
      Boolean(comment.edited),

    likes:
      typeof comment.likes ===
      "number"
        ? Math.max(
            0,
            comment.likes
          )
        : 0,

    dislikes:
      typeof comment.dislikes ===
      "number"
        ? Math.max(
            0,
            comment.dislikes
          )
        : 0,

    likedByCurrentUser:
      likedBy.includes(
        currentActor
      ),

    dislikedByCurrentUser:
      dislikedBy.includes(
        currentActor
      ),

    likedBy,

    dislikedBy,

    parentId:
      typeof comment.parentId ===
      "string"
        ? comment.parentId
        : null,

    replyCount:
      typeof comment.replyCount ===
      "number"
        ? Math.max(
            0,
            comment.replyCount
          )
        : 0,

    reported:
      Boolean(comment.reported),

    reportReasons:
      Array.isArray(
        comment.reportReasons
      )
        ? comment.reportReasons
        : [],
  };
}

function getStoredComments(): VideoComment[] {
  const comments =
    readStorage<
      VideoComment[]
    >(COMMENT_KEY, []);

  return comments
    .filter(Boolean)
    .map(normalizeComment);
}

function saveAllComments(
  comments: VideoComment[]
) {
  return writeStorage(
    COMMENT_KEY,
    comments
  );
}

export function getAllComments(): VideoComment[] {
  return getStoredComments();
}

export function getCommentById(
  commentId: string
): VideoComment | null {
  const comment =
    getStoredComments().find(
      (item) =>
        item.id === commentId
    );

  return comment || null;
}

export function getComments(
  videoId: number
): VideoComment[] {
  return getStoredComments()
    .filter(
      (comment) =>
        Number(comment.videoId) ===
        Number(videoId)
    )
    .sort(
      (a, b) =>
        new Date(
          b.createdAt
        ).getTime() -
        new Date(
          a.createdAt
        ).getTime()
    );
}

export function getReplies(
  commentId: string
): VideoComment[] {
  return getStoredComments()
    .filter(
      (comment) =>
        comment.parentId ===
        commentId
    )
    .sort(
      (a, b) =>
        new Date(
          a.createdAt
        ).getTime() -
        new Date(
          b.createdAt
        ).getTime()
    );
}

export function saveComment(
  comment: VideoComment
) {
  const comments =
    getStoredComments();

  const existing =
    comments.some(
      (item) =>
        item.id === comment.id
    );

  if (existing) {
    return false;
  }

  const normalizedComment =
    normalizeComment(comment);

  saveAllComments([
    normalizedComment,
    ...comments,
  ]);

  /*
   * Update parent's reply count.
   */
  if (
    normalizedComment.parentId
  ) {
    updateReplyCount(
      normalizedComment.parentId
    );
  }

  return true;
}

export function updateReplyCount(
  parentId: string
) {
  const comments =
    getStoredComments();

  const replyCount =
    comments.filter(
      (comment) =>
        comment.parentId ===
        parentId
    ).length;

  const updated =
    comments.map(
      (comment) =>
        comment.id === parentId
          ? {
              ...comment,
              replyCount,
            }
          : comment
    );

  saveAllComments(updated);
}

export function canEditComment(
  comment: VideoComment,
  actorId?: string
) {
  const currentActor =
    (
      actorId ||
      getCurrentActorId()
    ).toLowerCase();

  const commentOwner =
    (
      comment.user.email ||
      comment.user.username
    ).toLowerCase();

  const isOwner =
    currentActor ===
    commentOwner;

  if (!isOwner) {
    return false;
  }

  const createdAt =
    new Date(
      comment.createdAt
    ).getTime();

  const now = Date.now();

  return (
    now - createdAt <=
    EDIT_TIME_LIMIT
  );
}

export function getRemainingEditTime(
  comment: VideoComment
) {
  const createdAt =
    new Date(
      comment.createdAt
    ).getTime();

  const expiresAt =
    createdAt +
    EDIT_TIME_LIMIT;

  return Math.max(
    0,
    expiresAt - Date.now()
  );
}

export function updateComment(
  commentId: string,
  text: string,
  expectedUpdatedAt?: string
) {
  const comments =
    getStoredComments();

  const current =
    comments.find(
      (comment) =>
        comment.id ===
        commentId
    );

  if (!current) {
    return {
      success: false,
      reason:
        "Comment not found.",
    };
  }

  const actor =
    getCurrentActorId();

  const owner =
    (
      current.user.email ||
      current.user.username
    ).toLowerCase();

  if (
    actor !== owner
  ) {
    return {
      success: false,
      reason:
        "You can only edit your own comment.",
    };
  }

  if (
    expectedUpdatedAt &&
    current.updatedAt !==
      expectedUpdatedAt
  ) {
    return {
      success: false,
      reason:
        "This comment was already changed. Please refresh and try again.",
    };
  }

  if (
    !canEditComment(
      current,
      actor
    )
  ) {
    return {
      success: false,
      reason:
        "The edit time limit for this comment has expired.",
    };
  }

  const cleanText =
    text.trim();

  if (!cleanText) {
    return {
      success: false,
      reason:
        "Comment cannot be empty.",
    };
  }

  const updatedAt =
    new Date().toISOString();

  const updatedComments =
    comments.map(
      (comment) =>
        comment.id ===
        commentId
          ? {
              ...comment,
              text: cleanText,
              updatedAt,
              edited: true,
            }
          : comment
    );

  const saved =
    saveAllComments(
      updatedComments
    );

  if (!saved) {
    return {
      success: false,
      reason:
        "Unable to save comment.",
    };
  }

  return {
    success: true,
    reason:
      "Comment updated successfully.",
  };
}

export function deleteComment(
  commentId: string
) {
  const comments =
    getStoredComments();

  const comment =
    comments.find(
      (item) =>
        item.id === commentId
    );

  if (!comment) {
    return {
      success: false,
      reason:
        "Comment not found.",
    };
  }

  const actor =
    getCurrentActorId();

  const owner =
    (
      comment.user.email ||
      comment.user.username
    ).toLowerCase();

  if (
    actor !== owner
  ) {
    return {
      success: false,
      reason:
        "You can only delete your own comment.",
    };
  }

  /*
   * Keep replies alive.
   * If parent is removed,
   * replies become top-level.
   */
  const updatedComments =
    comments
      .filter(
        (item) =>
          item.id !== commentId
      )
      .map((item) =>
        item.parentId ===
        commentId
          ? {
              ...item,
              parentId: null,
            }
          : item
      );

  const saved =
    saveAllComments(
      updatedComments
    );

  if (!saved) {
    return {
      success: false,
      reason:
        "Unable to delete comment.",
    };
  }

  return {
    success: true,
    reason:
      "Comment deleted successfully.",
  };
}

export function updateCommentReaction(
  commentId: string,
  type: "like" | "dislike"
) {
  const comments =
    getStoredComments();

  const actor =
    getCurrentActorId();

  const updated =
    comments.map(
      (comment) => {
        if (
          comment.id !==
          commentId
        ) {
          return comment;
        }

        const likedBy =
          Array.isArray(
            comment.likedBy
          )
            ? [
                ...comment.likedBy,
              ]
            : [];

        const dislikedBy =
          Array.isArray(
            comment.dislikedBy
          )
            ? [
                ...comment.dislikedBy,
              ]
            : [];

        if (
          type === "like"
        ) {
          const alreadyLiked =
            likedBy.includes(
              actor
            );

          const alreadyDisliked =
            dislikedBy.includes(
              actor
            );

          if (alreadyLiked) {
            return {
              ...comment,
              likes: Math.max(
                0,
                comment.likes - 1
              ),
              likedBy:
                likedBy.filter(
                  (id) =>
                    id !== actor
                ),
              likedByCurrentUser:
                false,
            };
          }

          if (
            alreadyDisliked
          ) {
            const nextDislikedBy =
              dislikedBy.filter(
                (id) =>
                  id !== actor
              );

            return {
              ...comment,
              likes:
                comment.likes + 1,
              dislikes:
                Math.max(
                  0,
                  comment.dislikes -
                    1
                ),
              likedBy: [
                ...likedBy,
                actor,
              ],
              dislikedBy:
                nextDislikedBy,
              likedByCurrentUser:
                true,
              dislikedByCurrentUser:
                false,
            };
          }

          return {
            ...comment,
            likes:
              comment.likes + 1,
            likedBy: [
              ...likedBy,
              actor,
            ],
            likedByCurrentUser:
              true,
          };
        }

        const alreadyDisliked =
          dislikedBy.includes(
            actor
          );

        const alreadyLiked =
          likedBy.includes(
            actor
          );

        if (
          alreadyDisliked
        ) {
          return {
            ...comment,
            dislikes:
              Math.max(
                0,
                comment.dislikes -
                  1
              ),
            dislikedBy:
              dislikedBy.filter(
                (id) =>
                  id !== actor
              ),
            dislikedByCurrentUser:
              false,
          };
        }

        if (alreadyLiked) {
          return {
            ...comment,
            likes:
              Math.max(
                0,
                comment.likes - 1
              ),
            dislikes:
              comment.dislikes +
              1,
            likedBy:
              likedBy.filter(
                (id) =>
                  id !== actor
              ),
            dislikedBy: [
              ...dislikedBy,
              actor,
            ],
            likedByCurrentUser:
              false,
            dislikedByCurrentUser:
              true,
          };
        }

        return {
          ...comment,
          dislikes:
            comment.dislikes + 1,
          dislikedBy: [
            ...dislikedBy,
            actor,
          ],
          dislikedByCurrentUser:
            true,
        };
      }
    );

  saveAllComments(
    updated
  );

  const updatedComment =
    updated.find(
      (comment) =>
        comment.id ===
        commentId
    );

  return updatedComment || null;
}

export function addCommentReport(
  report: CommentReport
) {
  const reports =
    readStorage<
      CommentReport[]
    >(
      REPORT_KEY,
      []
    );

  const alreadyReported =
    reports.some(
      (item) =>
        item.commentId ===
          report.commentId &&
        item.reportedBy ===
          report.reportedBy &&
        item.reason ===
          report.reason
    );

  if (
    alreadyReported
  ) {
    return false;
  }

  const comment =
    getCommentById(
      report.commentId
    );

  if (!comment) {
    return false;
  }

  const updatedReport =
    {
      ...report,
      reportedBy:
        report.reportedBy ||
        getCurrentActorId(),
    };

  const saved =
    writeStorage(
      REPORT_KEY,
      [
        updatedReport,
        ...reports,
      ]
    );

  if (!saved) {
    return false;
  }

  /*
   * Mark the comment as reported.
   */
  const comments =
    getStoredComments();

  const updatedComments =
    comments.map(
      (item) =>
        item.id ===
        report.commentId
          ? {
              ...item,
              reported: true,
              reportReasons:
                item.reportReasons.includes(
                  report.reason
                )
                  ? item.reportReasons
                  : [
                      ...item.reportReasons,
                      report.reason,
                    ],
            }
          : item
    );

  saveAllComments(
    updatedComments
  );

  return true;
}

export function getCommentReports(): CommentReport[] {
  return readStorage<
    CommentReport[]
  >(
    REPORT_KEY,
    []
  );
}

export function addModerationRecord(
  record: ModerationRecord
) {
  const records =
    readStorage<
      ModerationRecord[]
    >(
      MODERATION_KEY,
      []
    );

  const saved =
    writeStorage(
      MODERATION_KEY,
      [
        record,
        ...records,
      ]
    );

  return saved;
}

export function getModerationRecords(): ModerationRecord[] {
  return readStorage<
    ModerationRecord[]
  >(
    MODERATION_KEY,
    []
  );
}

export function createCommentId() {
  return `comment_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}

export function getCommentCount(
  videoId: number
) {
  return getComments(
    videoId
  ).length;
}

export function clearAllComments() {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  localStorage.removeItem(
    COMMENT_KEY
  );

  localStorage.removeItem(
    REPORT_KEY
  );

  localStorage.removeItem(
    MODERATION_KEY
  );
}
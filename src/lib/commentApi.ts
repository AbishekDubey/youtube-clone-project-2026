
import { getBackendToken } from "@/lib/backendAuth";

export type BackendCommentUser = {
  _id?: string;
  name?: string;
  email?: string;
  avatar?: string;
  location?: string;
};

export type BackendComment = {
  _id: string;
  videoId: string;
  userId: BackendCommentUser | string;
  username: string;
  displayName: string;
  avatar: string;
  location: string;
  text: string;
  language: string;
  parentId: string | null;
  edited: boolean;
  likes: number;
  dislikes: number;
  likedBy: string[];
  dislikedBy: string[];
  likedByCurrentUser?: boolean;
  dislikedByCurrentUser?: boolean;
  isOwner?: boolean;
  replyCount: number;
  reported: boolean;
  reportReasons: string[];
  deleted?: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type BackendCommentResponse = {
  success: boolean;
  message?: string;
  comment?: BackendComment;
  comments?: BackendComment[];
};

type BackendReportResponse = {
  success: boolean;
  message?: string;
  report?: unknown;
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api/comments`
    : "http://localhost:5000/api/comments";

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getBackendToken();
  const headers = new Headers(options.headers);

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });

  let data: T;

  try {
    data = (await response.json()) as T;
  } catch {
    throw new Error(`Server returned ${response.status}`);
  }

  if (!response.ok) {
    const message =
      (data as { message?: string })?.message ||
      `Request failed (${response.status}).`;

    throw new Error(message);
  }

  return data;
}

export async function fetchComments(
  videoId: string
): Promise<BackendComment[]> {
  const data = await request<BackendCommentResponse>(
    `${API_URL}/video/${encodeURIComponent(videoId)}`
  );

  return data.comments || [];
}

export async function createBackendComment(
  videoId: string,
  text: string,
  language: string,
  parentId: string | null = null
): Promise<BackendComment> {
  const data = await request<BackendCommentResponse>(
    API_URL,
    {
      method: "POST",
      body: JSON.stringify({
        videoId,
        text,
        language,
        parentId,
      }),
    }
  );

  if (!data.comment) {
    throw new Error("Comment was not returned by the server.");
  }

  return data.comment;
}

export async function updateBackendComment(
  commentId: string,
  text: string,
  language?: string
): Promise<BackendComment> {
  const data = await request<BackendCommentResponse>(
    `${API_URL}/${encodeURIComponent(commentId)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        text,
        language,
      }),
    }
  );

  if (!data.comment) {
    throw new Error("Updated comment was not returned.");
  }

  return data.comment;
}

export async function deleteBackendComment(
  commentId: string
): Promise<void> {
  await request<BackendCommentResponse>(
    `${API_URL}/${encodeURIComponent(commentId)}`,
    {
      method: "DELETE",
    }
  );
}

export async function reactToBackendComment(
  commentId: string,
  type: "like" | "dislike"
): Promise<BackendComment> {
  const data = await request<BackendCommentResponse>(
    `${API_URL}/${encodeURIComponent(commentId)}/reaction`,
    {
      method: "PATCH",
      body: JSON.stringify({ type }),
    }
  );

  if (!data.comment) {
    throw new Error("Updated reaction was not returned.");
  }

  return data.comment;
}

export async function reportBackendComment(
  commentId: string,
  reason: "spam" | "harassment" | "offensive",
  details = ""
): Promise<void> {
  await request<BackendReportResponse>(
    `${API_URL}/${encodeURIComponent(commentId)}/report`,
    {
      method: "POST",
      body: JSON.stringify({
        reason,
        details,
      }),
    }
  );
}

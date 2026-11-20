const PROFANITY_WORDS = [
  "fuck",
  "fucking",
  "shit",
  "bitch",
  "asshole",
  "idiot",
  "stupid",
  "bastard",
  "dumbass",
];

const MAX_COMMENT_LENGTH = 1000;

const RATE_LIMIT_KEY =
  "youtube_comment_post_history";

const RATE_LIMIT_WINDOW = 2 * 60 * 1000;

const MAX_POSTS_IN_WINDOW = 5;

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function containsAbusiveWords(
  text: string
) {
  const normalized =
    normalizeText(text);

  return PROFANITY_WORDS.some(
    (word) =>
      normalized.includes(word)
  );
}

export function containsMaliciousLink(
  text: string
) {
  const urlPattern =
    /https?:\/\/|www\.|bit\.ly|tinyurl\.com|t\.co/i;

  return urlPattern.test(text);
}

export function isRepeatedSpecialCharacterSpam(
  text: string
) {
  const compact = text.replace(
    /\s/g,
    ""
  );

  if (!compact) {
    return false;
  }

  const specialCharacters =
    compact.match(
      /[^a-zA-Z0-9\u0900-\u097F]/g
    ) || [];

  const ratio =
    specialCharacters.length /
    compact.length;

  return (
    compact.length >= 8 &&
    ratio >= 0.7
  );
}

export function isExcessiveRepeatedText(
  text: string
) {
  const normalized =
    text.replace(/\s+/g, "");

  if (normalized.length < 8) {
    return false;
  }

  return /(.)\1{6,}/i.test(
    normalized
  );
}

export function validateCommentText(
  text: string
) {
  const value = text.trim();

  if (!value) {
    return {
      valid: false,
      reason:
        "Comment cannot be empty.",
    };
  }

  if (
    value.length >
    MAX_COMMENT_LENGTH
  ) {
    return {
      valid: false,
      reason:
        "Comment is too long. Maximum 1000 characters allowed.",
    };
  }

  if (
    containsAbusiveWords(value)
  ) {
    return {
      valid: false,
      reason:
        "This comment contains abusive or inappropriate language.",
    };
  }

  if (
    containsMaliciousLink(value)
  ) {
    return {
      valid: false,
      reason:
        "Links are not allowed in comments.",
    };
  }

  if (
    isRepeatedSpecialCharacterSpam(
      value
    )
  ) {
    return {
      valid: false,
      reason:
        "Repeated special characters or emoji spam is not allowed.",
    };
  }

  if (
    isExcessiveRepeatedText(value)
  ) {
    return {
      valid: false,
      reason:
        "Repeated characters are not allowed.",
    };
  }

  return {
    valid: true,
    reason: "",
  };
}

export function normalizeForDuplicateCheck(
  text: string
) {
  return normalizeText(text)
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function isDuplicateComment(
  text: string,
  existingTexts: string[]
) {
  const normalized =
    normalizeForDuplicateCheck(
      text
    );

  return existingTexts.some(
    (existing) =>
      normalizeForDuplicateCheck(
        existing
      ) === normalized
  );
}

function getPostHistory(): number[] {
  if (
    typeof window === "undefined"
  ) {
    return [];
  }

  try {
    const data =
      localStorage.getItem(
        RATE_LIMIT_KEY
      );

    if (!data) {
      return [];
    }

    const parsed =
      JSON.parse(data);

    if (
      !Array.isArray(parsed)
    ) {
      return [];
    }

    return parsed.filter(
      (item): item is number =>
        typeof item === "number"
    );
  } catch {
    return [];
  }
}

function savePostHistory(
  timestamps: number[]
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  localStorage.setItem(
    RATE_LIMIT_KEY,
    JSON.stringify(
      timestamps
    )
  );
}

export function checkRateLimit() {
  const now = Date.now();

  const recentPosts =
    getPostHistory().filter(
      (timestamp) =>
        now - timestamp <
        RATE_LIMIT_WINDOW
    );

  savePostHistory(
    recentPosts
  );

  return {
    allowed:
      recentPosts.length <
      MAX_POSTS_IN_WINDOW,
    remaining: Math.max(
      0,
      MAX_POSTS_IN_WINDOW -
        recentPosts.length
    ),
  };
}

export function recordCommentPost() {
  const now = Date.now();

  const recentPosts =
    getPostHistory().filter(
      (timestamp) =>
        now - timestamp <
        RATE_LIMIT_WINDOW
    );

  savePostHistory([
    ...recentPosts,
    now,
  ]);
}

export function requiresCaptcha() {
  const now = Date.now();

  const recentPosts =
    getPostHistory().filter(
      (timestamp) =>
        now - timestamp <
        RATE_LIMIT_WINDOW
    );

  return (
    recentPosts.length >= 3
  );
}
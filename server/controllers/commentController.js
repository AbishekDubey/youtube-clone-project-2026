
const mongoose = require("mongoose");

const Comment = require("../models/Comment");
const CommentReport = require("../models/CommentReport");
const Video = require("../models/Video");

const EDIT_TIME_LIMIT = 15 * 60 * 1000;
const RATE_LIMIT_WINDOW = 2 * 60 * 1000;
const MAX_POSTS_IN_WINDOW = 5;
const MAX_COMMENT_LENGTH = 1000;

const postHistory = new Map();

const isValidObjectId = (id) =>
  mongoose.Types.ObjectId.isValid(id);

const normalizeText = (text) =>
  text.toLowerCase().replace(/\s+/g, " ").trim();

const validateCommentText = (text) => {
  if (typeof text !== "string" || !text.trim()) {
    return "Comment cannot be empty.";
  }

  const value = text.trim();

  if (value.length > MAX_COMMENT_LENGTH) {
    return "Comment cannot exceed 1000 characters.";
  }

  const profanity = [
    "fuck",
    "fucking",
    "shit",
    "bitch",
    "asshole",
    "bastard",
    "dumbass",
  ];

  const normalized = normalizeText(value);

  if (
    profanity.some((word) =>
      new RegExp(`\\b${word}\\b`, "i").test(normalized)
    )
  ) {
    return "This comment contains inappropriate language.";
  }

  if (/(https?:\/\/|www\.)/i.test(value)) {
    return "Links are not allowed in comments.";
  }

  if (/(.)\1{6,}/u.test(value.replace(/\s+/g, ""))) {
    return "Repeated characters are not allowed.";
  }

  const compact = value.replace(/\s/g, "");
  const special = compact.match(/[^\p{L}\p{N}]/gu) || [];

  if (
    compact.length >= 8 &&
    special.length / compact.length >= 0.7
  ) {
    return "Repeated special characters or emoji spam is not allowed.";
  }

  return null;
};

const checkRateLimit = (userId) => {
  const now = Date.now();

  const history = (postHistory.get(userId) || []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW
  );

  if (history.length >= MAX_POSTS_IN_WINDOW) {
    postHistory.set(userId, history);
    return false;
  }

  history.push(now);
  postHistory.set(userId, history);

  return true;
};

const formatComment = (comment, viewerId = null) => {
  const user =
    comment.userId &&
    typeof comment.userId === "object"
      ? comment.userId
      : null;

  const ownerId = user?._id || comment.userId;

  const likedBy = (comment.likedBy || []).map(String);
  const dislikedBy = (comment.dislikedBy || []).map(String);

  const viewer = viewerId ? viewerId.toString() : null;

  return {
    _id: comment._id,
    videoId: comment.videoId,
    userId: ownerId,

    username: user?.name || "YouTube User",
    displayName: user?.name || "YouTube User",
    avatar: user?.avatar || "",
    location: user?.location || "",

    // Ownership is calculated using the authenticated backend user.
    isOwner: Boolean(
      viewer &&
      ownerId &&
      ownerId.toString() === viewer
    ),

    // Return current viewer's reaction state.
    likedByCurrentUser: Boolean(
      viewer && likedBy.includes(viewer)
    ),

    dislikedByCurrentUser: Boolean(
      viewer && dislikedBy.includes(viewer)
    ),

    text: comment.deleted
      ? "[This comment was deleted]"
      : comment.text,

    language: comment.language,
    parentId: comment.parentId,
    edited: comment.edited,

    likes: comment.likes,
    dislikes: comment.dislikes,

    likedBy,
    dislikedBy,

    replyCount: comment.replyCount,
    reported: comment.reported,
    reportReasons: comment.reportReasons || [],

    deleted: comment.deleted,
    deletedAt: comment.deletedAt,

    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
};

const populateComment = async (comment, viewerId = null) => {
  await comment.populate(
    "userId",
    "name email avatar location"
  );

  return formatComment(comment, viewerId);
};

/* =========================================
   GET COMMENTS
========================================= */

const getComments = async (req, res) => {
  try {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid video ID.",
      });
    }

    const videoExists = await Video.exists({
      _id: videoId,
    });

    if (!videoExists) {
      return res.status(404).json({
        success: false,
        message: "Video not found.",
      });
    }

    // Keep deleted parent records so their replies remain accessible.
    const comments = await Comment.find({ videoId })
      .populate("userId", "name email avatar location")
      .sort({ createdAt: 1 });

    const viewerId = req.user?._id || null;

    return res.status(200).json({
      success: true,
      count: comments.filter((item) => !item.deleted).length,
      comments: comments.map((item) =>
        formatComment(item, viewerId)
      ),
    });
  } catch (error) {
    console.error("Get comments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch comments.",
    });
  }
};

/* =========================================
   CREATE COMMENT
========================================= */

const createComment = async (req, res) => {
  try {
    const { videoId, text, language, parentId } = req.body;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!isValidObjectId(videoId)) {
      return res.status(400).json({
        success: false,
        message: "A valid video ID is required.",
      });
    }

    const validationError = validateCommentText(text);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const videoExists = await Video.exists({
      _id: videoId,
    });

    if (!videoExists) {
      return res.status(404).json({
        success: false,
        message: "Video not found.",
      });
    }

    let parentComment = null;

    if (parentId) {
      if (!isValidObjectId(parentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid parent comment ID.",
        });
      }

      parentComment = await Comment.findOne({
        _id: parentId,
        videoId,
        deleted: false,
      });

      if (!parentComment) {
        return res.status(404).json({
          success: false,
          message: "Parent comment not found.",
        });
      }
    }

    const userId = req.user._id.toString();

    if (!checkRateLimit(userId)) {
      return res.status(429).json({
        success: false,
        message: "Too many comments. Please try again later.",
      });
    }

    const cleanText = text.trim();

    const duplicate = await Comment.findOne({
      videoId,
      userId: req.user._id,
      deleted: false,
      text: cleanText,
      createdAt: {
        $gte: new Date(Date.now() - 30000),
      },
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "You have already posted this comment.",
      });
    }

    const comment = await Comment.create({
      videoId,
      userId: req.user._id,
      text: cleanText,
      language:
        typeof language === "string" && language.trim()
          ? language.trim()
          : "English",
      parentId: parentId || null,
    });

    if (parentComment) {
      await Comment.updateOne(
        {
          _id: parentComment._id,
          deleted: false,
        },
        {
          $inc: { replyCount: 1 },
        }
      );
    }

    return res.status(201).json({
      success: true,
      message: "Comment created successfully.",
      comment: await populateComment(comment, req.user._id),
    });
  } catch (error) {
    console.error("Create comment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create comment.",
    });
  }
};

/* =========================================
   UPDATE COMMENT
========================================= */

const updateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text, language } = req.body;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID.",
      });
    }

    const validationError = validateCommentText(text);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const comment = await Comment.findOne({
      _id: id,
      userId: req.user._id,
      deleted: false,
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found or you do not own it.",
      });
    }

    if (
      Date.now() - new Date(comment.createdAt).getTime() >
      EDIT_TIME_LIMIT
    ) {
      return res.status(403).json({
        success: false,
        message: "The 15-minute edit time limit has expired.",
      });
    }

    const updated = await Comment.findOneAndUpdate(
      {
        _id: id,
        userId: req.user._id,
        deleted: false,
        createdAt: {
          $gte: new Date(Date.now() - EDIT_TIME_LIMIT),
        },
        updatedAt: comment.updatedAt,
      },
      {
        $set: {
          text: text.trim(),
          edited: true,
          ...(typeof language === "string" && language.trim()
            ? { language: language.trim() }
            : {}),
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(409).json({
        success: false,
        message:
          "Comment changed or edit time expired. Refresh and try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Comment updated successfully.",
      comment: await populateComment(updated, req.user._id),
    });
  } catch (error) {
    console.error("Update comment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update comment.",
    });
  }
};

/* =========================================
   DELETE COMMENT
========================================= */

const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID.",
      });
    }

    const comment = await Comment.findOne({
      _id: id,
      userId: req.user._id,
      deleted: false,
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found or already deleted.",
      });
    }

    comment.deleted = true;
    comment.deletedAt = new Date();

    await comment.save();

    // Preserve child comments but detach them from the deleted parent.
    const childCount = await Comment.countDocuments({
      parentId: comment._id,
      deleted: false,
    });

    await Comment.updateMany(
      { parentId: comment._id },
      { $set: { parentId: null } }
    );

    if (comment.parentId) {
      await Comment.updateOne(
        {
          _id: comment.parentId,
          replyCount: { $gt: 0 },
        },
        {
          $inc: { replyCount: -1 },
        }
      );
    }

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully.",
      preservedReplies: childCount,
    });
  } catch (error) {
    console.error("Delete comment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete comment.",
    });
  }
};

/* =========================================
   LIKE / DISLIKE
========================================= */

const reactToComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID.",
      });
    }

    if (!["like", "dislike"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Reaction must be like or dislike.",
      });
    }

    const userId = req.user._id;
    const userString = userId.toString();

    const comment = await Comment.findOne({
      _id: id,
      deleted: false,
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    const liked = (comment.likedBy || []).some(
      (item) => item.toString() === userString
    );

    const disliked = (comment.dislikedBy || []).some(
      (item) => item.toString() === userString
    );

    let update;

    if (type === "like") {
      if (liked) {
        update = {
          $pull: { likedBy: userId },
          $inc: { likes: -1 },
        };
      } else if (disliked) {
        update = {
          $addToSet: { likedBy: userId },
          $pull: { dislikedBy: userId },
          $inc: { likes: 1, dislikes: -1 },
        };
      } else {
        update = {
          $addToSet: { likedBy: userId },
          $inc: { likes: 1 },
        };
      }
    } else {
      if (disliked) {
        update = {
          $pull: { dislikedBy: userId },
          $inc: { dislikes: -1 },
        };
      } else if (liked) {
        update = {
          $addToSet: { dislikedBy: userId },
          $pull: { likedBy: userId },
          $inc: { dislikes: 1, likes: -1 },
        };
      } else {
        update = {
          $addToSet: { dislikedBy: userId },
          $inc: { dislikes: 1 },
        };
      }
    }

    const updated = await Comment.findOneAndUpdate(
      {
        _id: id,
        deleted: false,
      },
      update,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Comment could not be updated.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Comment reaction updated.",
      comment: await populateComment(updated, userId),
    });
  } catch (error) {
    console.error("Comment reaction error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update comment reaction.",
    });
  }
};

/* =========================================
   REPORT COMMENT
========================================= */

const reportComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, details = "" } = req.body;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment ID.",
      });
    }

    if (!["spam", "harassment", "offensive"].includes(reason)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report reason.",
      });
    }

    if (
      typeof details !== "string" ||
      details.trim().length > 1000
    ) {
      return res.status(400).json({
        success: false,
        message: "Report details cannot exceed 1000 characters.",
      });
    }

    const comment = await Comment.findOne({
      _id: id,
      deleted: false,
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found.",
      });
    }

    if (comment.userId.toString() === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You cannot report your own comment.",
      });
    }

    try {
      await CommentReport.create({
        commentId: comment._id,
        reporterId: req.user._id,
        reason,
        details: details.trim(),
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "You have already reported this comment.",
        });
      }

      throw error;
    }

    await Comment.updateOne(
      { _id: comment._id },
      {
        $set: { reported: true },
        $addToSet: { reportReasons: reason },
      }
    );

    return res.status(201).json({
      success: true,
      message: "Comment reported successfully.",
    });
  } catch (error) {
    console.error("Report comment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to report comment.",
    });
  }
};

module.exports = {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  reactToComment,
  reportComment,
};

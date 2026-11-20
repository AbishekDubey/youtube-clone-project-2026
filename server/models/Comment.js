const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },

    language: {
      type: String,
      default: "English",
      trim: true,
    },

    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },

    edited: {
      type: Boolean,
      default: false,
    },

    likes: {
      type: Number,
      default: 0,
      min: 0,
    },

    dislikes: {
      type: Number,
      default: 0,
      min: 0,
    },

    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    dislikedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    replyCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    reported: {
      type: Boolean,
      default: false,
    },

    reportReasons: [
      {
        type: String,
        enum: [
          "spam",
          "harassment",
          "offensive",
        ],
      },
    ],

    deleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

commentSchema.index({
  videoId: 1,
  createdAt: -1,
});

commentSchema.index({
  parentId: 1,
  createdAt: 1,
});

module.exports =
  mongoose.model("Comment", commentSchema);
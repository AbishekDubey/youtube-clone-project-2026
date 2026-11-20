
const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    videoUrl: {
      type: String,
      required: true,
      trim: true,
    },

    thumbnailUrl: {
      type: String,
      default: "",
      trim: true,
    },

    // Cloudinary asset identifiers
    videoPublicId: {
      type: String,
      default: "",
      trim: true,
    },

    thumbnailPublicId: {
      type: String,
      default: "",
      trim: true,
    },

    channelName: {
      type: String,
      required: true,
      trim: true,
    },

    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    views: {
      type: Number,
      default: 0,
    },

    likes: {
      type: Number,
      default: 0,
    },

    dislikes: {
      type: Number,
      default: 0,
    },

    category: {
      type: String,
      default: "Other",
      trim: true,
    },

    duration: {
      type: String,
      default: "0:00",
    },

    // Video visibility
    visibility: {
      type: String,
      enum: ["Public", "Unlisted", "Private"],
      default: "Public",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Video", videoSchema);

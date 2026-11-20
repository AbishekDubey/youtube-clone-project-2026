
const mongoose = require("mongoose");
const Video = require("../models/Video");
const cloudinary = require("../config/cloudinary");

// Check whether the logged-in user owns a video
const isOwner = (video, user) => {
  return (
    video.channelId &&
    user &&
    video.channelId.toString() === user._id.toString()
  );
};

// Get only public videos for the public feed
const getVideos = async (req, res) => {
  try {
    const videos = await Video.find({ visibility: "Public" })
      .populate("channelId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: videos.length,
      videos,
    });
  } catch (error) {
    console.error("Get videos error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch videos",
    });
  }
};

// Get all videos belonging to the logged-in user
const getMyVideos = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const videos = await Video.find({
      channelId: req.user._id,
    })
      .populate("channelId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: videos.length,
      videos,
    });
  } catch (error) {
    console.error("Get my videos error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch your videos",
    });
  }
};

// Get one video
const getVideoById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid video ID",
      });
    }

    const video = await Video.findById(id).populate(
      "channelId",
      "name email"
    );

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Private videos are accessible only to their owner.
    if (
      video.visibility === "Private" &&
      !isOwner(video, req.user)
    ) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    return res.status(200).json({
      success: true,
      video,
    });
  } catch (error) {
    console.error("Get video error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch video",
    });
  }
};

// Create a video for the authenticated user
const createVideo = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      title,
      description,
      videoUrl,
      thumbnailUrl,
      videoPublicId,
      thumbnailPublicId,
      channelName,
      category,
      duration,
      visibility,
    } = req.body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof videoUrl !== "string" ||
      !videoUrl.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Title and video URL are required",
      });
    }

    if (
      typeof visibility === "string" &&
      !["Public", "Unlisted", "Private"].includes(visibility)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid video visibility",
      });
    }

    // The channel name comes from the authenticated user,
    // not from an untrusted client request.
    const video = await Video.create({
      title: title.trim(),
      description:
        typeof description === "string"
          ? description.trim()
          : "",
      videoUrl: videoUrl.trim(),
      thumbnailUrl:
        typeof thumbnailUrl === "string"
          ? thumbnailUrl.trim()
          : "",
      videoPublicId:
        typeof videoPublicId === "string"
          ? videoPublicId.trim()
          : "",
      thumbnailPublicId:
        typeof thumbnailPublicId === "string"
          ? thumbnailPublicId.trim()
          : "",
      channelName:
        typeof req.user.name === "string" && req.user.name.trim()
          ? req.user.name.trim()
          : "User",
      channelId: req.user._id,
      category:
        typeof category === "string" && category.trim()
          ? category.trim()
          : "Other",
      duration:
        typeof duration === "string" && duration.trim()
          ? duration.trim()
          : "0:00",
      visibility: visibility || "Public",
    });

    return res.status(201).json({
      success: true,
      message: "Video created successfully",
      video,
    });
  } catch (error) {
    console.error("Create video error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create video",
    });
  }
};

// Update only fields allowed by the owner
const updateVideo = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid video ID",
      });
    }

    const video = await Video.findById(id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    if (!isOwner(video, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own videos",
      });
    }

    const allowedUpdates = {};

    if (typeof req.body.title === "string") {
      if (!req.body.title.trim()) {
        return res.status(400).json({
          success: false,
          message: "Video title cannot be empty",
        });
      }

      allowedUpdates.title = req.body.title.trim();
    }

    if (typeof req.body.description === "string") {
      allowedUpdates.description = req.body.description.trim();
    }

    if (typeof req.body.thumbnailUrl === "string") {
      allowedUpdates.thumbnailUrl = req.body.thumbnailUrl.trim();
    }

    if (typeof req.body.channelName === "string") {
      if (!req.body.channelName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Channel name cannot be empty",
        });
      }

      allowedUpdates.channelName = req.body.channelName.trim();
    }

    if (typeof req.body.category === "string") {
      allowedUpdates.category = req.body.category.trim();
    }

    if (typeof req.body.duration === "string") {
      allowedUpdates.duration = req.body.duration.trim();
    }

    if (typeof req.body.visibility === "string") {
      if (
        !["Public", "Unlisted", "Private"].includes(
          req.body.visibility
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid video visibility",
        });
      }

      allowedUpdates.visibility = req.body.visibility;
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid video fields provided for update",
      });
    }

    const updatedVideo = await Video.findByIdAndUpdate(
      id,
      { $set: allowedUpdates },
      {
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Video updated successfully",
      video: updatedVideo,
    });
  } catch (error) {
    console.error("Update video error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update video",
    });
  }
};

// Delete a video owned by the authenticated user
const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid video ID",
      });
    }

    const video = await Video.findById(id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    if (!isOwner(video, req.user)) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own videos",
      });
    }

    // Remove the database record first.
    // Existing demo videos without Cloudinary IDs are unaffected.
    await Video.findByIdAndDelete(id);

    const cleanupResults = [];

    if (video.videoPublicId) {
      try {
        const result = await cloudinary.uploader.destroy(
          video.videoPublicId,
          { resource_type: "video" }
        );

        cleanupResults.push({
          asset: "video",
          result: result.result,
        });
      } catch (error) {
        console.error("Cloudinary video cleanup error:", error);
        cleanupResults.push({
          asset: "video",
          result: "cleanup_failed",
        });
      }
    }

    if (video.thumbnailPublicId) {
      try {
        const result = await cloudinary.uploader.destroy(
          video.thumbnailPublicId,
          { resource_type: "image" }
        );

        cleanupResults.push({
          asset: "thumbnail",
          result: result.result,
        });
      } catch (error) {
        console.error("Cloudinary thumbnail cleanup error:", error);
        cleanupResults.push({
          asset: "thumbnail",
          result: "cleanup_failed",
        });
      }
    }

    const cleanupFailed = cleanupResults.some(
      (item) => item.result !== "ok" && item.result !== "not found"
    );

    return res.status(200).json({
      success: true,
      message: cleanupFailed
        ? "Video record deleted, but some Cloudinary assets may need manual cleanup"
        : "Video deleted successfully",
      cleanupResults,
    });
  } catch (error) {
    console.error("Delete video error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete video",
    });
  }
};

// Increment video views
const incrementVideoViews = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid video ID",
      });
    }

    const video = await Video.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "View counted successfully",
      views: video.views,
    });
  } catch (error) {
    console.error("Increment views error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update video views",
    });
  }
};

module.exports = {
  getVideos,
  getMyVideos,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo,
  incrementVideoViews,
};

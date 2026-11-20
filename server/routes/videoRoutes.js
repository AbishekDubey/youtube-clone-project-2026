
const express = require("express");

const {
  getVideos,
  getMyVideos,
  getVideoById,
  createVideo,
  updateVideo,
  deleteVideo,
} = require("../controllers/videoController");

const {
  seedDefaultVideos,
} = require("../controllers/seedController");

const {
  generateUploadSignature,
} = require("../controllers/cloudinaryController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/mine", protect, getMyVideos);
// Public routes
router.get("/", getVideos);
router.get("/:id", getVideoById);

// Protected seed route
router.post("/seed-defaults", protect, seedDefaultVideos);

// Protected video creation
router.post("/", protect, createVideo);

// Protected Cloudinary upload signature
router.post(
  "/cloudinary-signature",
  protect,
  generateUploadSignature
);

// Protected update and delete
router.put("/:id", protect, updateVideo);
router.delete("/:id", protect, deleteVideo);

module.exports = router;

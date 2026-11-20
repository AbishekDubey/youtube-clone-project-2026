
const express = require("express");

const {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  reactToComment,
  reportComment,
} = require("../controllers/commentController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Public comments, with optional user identification.
router.get(
  "/video/:videoId",
  protect.optional,
  getComments
);

// Authenticated actions.
router.post("/", protect, createComment);

router.put("/:id", protect, updateComment);

router.delete("/:id", protect, deleteComment);

router.patch("/:id/reaction", protect, reactToComment);

router.post("/:id/report", protect, reportComment);

module.exports = router;

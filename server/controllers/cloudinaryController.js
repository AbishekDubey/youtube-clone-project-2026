
const cloudinary = require("../config/cloudinary");
const crypto = require("crypto");

const generateUploadSignature = async (req, res) => {
  try {
    // Verify authenticated user
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const timestamp = Math.floor(Date.now() / 1000);

    // Store uploads in a user-specific folder
    const folder = `youtube-clone/users/${req.user._id}/videos`;

    const paramsToSign = {
      timestamp,
      folder,
    };

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    return res.status(200).json({
      success: true,
      signature,
      timestamp,
      folder,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
    });
  } catch (error) {
    console.error("Cloudinary signature error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to generate upload signature",
    });
  }
};

module.exports = {
  generateUploadSignature,
};

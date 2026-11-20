
const express = require("express");

const protect = require("../middleware/authMiddleware");

const {
  createOrder,
  verifyPayment,
  getSubscription,
  getPaymentHistory,
  cancelAutoRenewal,
  recordPaymentFailure,
} = require("../controllers/paymentController");

const router = express.Router();

// All payment routes require authentication.
router.use(protect);

// Create Razorpay order.
router.post("/create-order", createOrder);

// Verify successful payment.
router.post("/verify-payment", verifyPayment);

// Record failed payment attempt.
router.post("/payment-failure", recordPaymentFailure);

// Membership information.
router.get("/subscription", getSubscription);

// Payment history.
router.get("/history", getPaymentHistory);

// Cancel auto-renewal.
router.post("/cancel-renewal", cancelAutoRenewal);

module.exports = router;

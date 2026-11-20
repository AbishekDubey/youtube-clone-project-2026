
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");

const subscriptionRoutes = require("./routes/subscriptionRoutes");
const videoRoutes = require("./routes/videoRoutes");
const authRoutes = require("./routes/authRoutes");
const commentRoutes = require("./routes/commentRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

// 1. CORS middleware FIRST
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// 2. Body parser
app.use(express.json());

// 3. Database connection
connectDB();

// 4. Health check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "YouTube Clone Backend is running",
  });
});

// 5. API routes
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/payments", paymentRoutes);

// 6. 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// 7. Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

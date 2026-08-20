import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.js";
import conversionRoutes from "./routes/conversion.js";
import jobsRoutes from "./routes/jobs.js";

const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

const app = express();

app.set("trust proxy", 1);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ""))) return callback(null, true);
    return callback(new Error("Origin is not allowed by CORS."));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ success: true, message: "ConvertFlow API is running", timestamp: new Date().toISOString() }));
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobsRoutes);
app.use("/api/conversion", conversionRoutes);

app.use((error, req, res, next) => {
  if (error?.code === "LIMIT_FILE_SIZE") return res.status(413).json({ success: false, message: "Files must be 100 MB or smaller." });
  if (error) {
    console.error("Request error:", error);
    return res.status(500).json({ success: false, message: "The request could not be completed." });
  }
  return next();
});

app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));

app.listen(PORT, () => {
  console.log(`ConvertFlow backend listening on port ${PORT}`);
  console.log(`Configured frontend origins: ${allowedOrigins.join(", ") || "none"}`);
});

import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { optionalApiKey } from "../middleware/optionalApiKey.js";

const router = express.Router();
const execFileAsync = promisify(execFile);
const tempDirectory = path.resolve("temp");
if (!fs.existsSync(tempDirectory)) fs.mkdirSync(tempDirectory, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tempDirectory),
  filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });
function cleanup(...files) { files.flat().forEach(file => { if (file && fs.existsSync(file)) { try { fs.unlinkSync(file); } catch {} } }); }

router.post("/image-upscale", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No image was uploaded." });
    const quality = String(req.body.quality || "4k").toLowerCase();
    const sizes = {
      "144p": [256, 144], "240p": [426, 240], "360p": [640, 360], "480p": [854, 480],
      "720p": [1280, 720], "1080p": [1920, 1080], "1440p": [2560, 1440], "2k": [2560, 1440],
      "5k": [5120, 2880], "6k": [6144, 3456], "4k": [3840, 2160], "8k": [7680, 4320]
    };
    const [width, height] = sizes[quality] || sizes["4k"];
    output = path.join(tempDirectory, `${crypto.randomUUID()}-upscaled.jpg`);
    await execFileAsync("magick", [
      req.file.path, "-auto-orient", "-resize", `${width}x${height}`,
      "-filter", "Lanczos", "-unsharp", "0x0.8+0.55+0.02", "-strip", "-quality", "88", output
    ], { timeout: 180000 });
    if (!fs.existsSync(output)) throw new Error("Upscaler did not create the output image.");
    return res.download(output, `${path.parse(req.file.originalname).name}-${quality}.jpg`, error => {
      cleanup(req.file.path, output);
      if (error) console.error("Upscaler download error:", error);
    });
  } catch (error) {
    cleanup(req.file?.path, output);
    console.error("Fast image upscale error:", error);
    return res.status(500).json({ success: false, message: error.message || "Image upscaling failed." });
  }
});

export default router;

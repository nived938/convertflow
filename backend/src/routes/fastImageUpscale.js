import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
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

function cleanup(...files) {
  files.flat().forEach((file) => {
    if (file && fs.existsSync(file)) {
      try { fs.unlinkSync(file); } catch {}
    }
  });
}

function safeDownloadName(name) {
  return String(name || "upscaled.jpg").replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").slice(0, 180);
}

async function runEnhancedResize(input, output, width, height) {
  // Sharp is bundled with the backend, so this path works reliably on Render.
  // It uses a high quality Lanczos resize plus sharpening and mild local contrast
  // enhancement so a second upscale is not just a larger, softer copy.
  await sharp(input, { failOn: "none" })
    .rotate()
    .resize({ width, height, fit: "inside", kernel: sharp.kernel.lanczos3, withoutEnlargement: false })
    .sharpen({ sigma: 1.15, m1: 0.65, m2: 2.0, x1: 2, y2: 10, y3: 20 })
    .modulate({ saturation: 1.04, brightness: 1.01 })
    .jpeg({ quality: 95, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toFile(output);
}

async function runFallbackResize(input, output, width, height) {
  try {
    await execFileAsync("magick", [input, "-auto-orient", "-filter", "Lanczos", "-resize", `${width}x${height}`, "-unsharp", "0x1.0+0.7+0.02", "-strip", "-quality", "95", output], { timeout: 240000, maxBuffer: 4 * 1024 * 1024 });
    return;
  } catch (magickError) {
    console.warn("ImageMagick fallback unavailable:", magickError.message);
  }
  await execFileAsync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-i", input, "-vf", `scale=${width}:${height}:force_original_aspect_ratio=decrease:flags=lanczos,unsharp=5:5:0.8:5:5:0.0`, "-frames:v", "1", "-q:v", "2", "-y", output], { timeout: 240000, maxBuffer: 4 * 1024 * 1024 });
}

router.post("/image-upscale", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No image was uploaded." });

    const quality = String(req.body?.quality || "4k").toLowerCase();
    const sizes = {
      "144p": [256, 144], "240p": [426, 240], "360p": [640, 360], "480p": [854, 480],
      "720p": [1280, 720], "1080p": [1920, 1080], "1440p": [2560, 1440], "2k": [2560, 1440],
      "4k": [3840, 2160], "5k": [5120, 2880], "6k": [6144, 3456], "8k": [7680, 4320],
    };
    if (!sizes[quality]) return res.status(400).json({ success: false, message: "Unsupported target quality. Choose 144p, 240p, 360p, 480p, 720p, 1080p, 1440p, 2K, 4K, 5K, 6K or 8K." });

    const [width, height] = sizes[quality];
    output = path.join(tempDirectory, `${crypto.randomUUID()}-upscaled.jpg`);

    try {
      await runEnhancedResize(req.file.path, output, width, height);
    } catch (sharpError) {
      console.warn("Sharp upscale failed, using external image tools:", sharpError.message);
      await runFallbackResize(req.file.path, output, width, height);
    }

    if (!fs.existsSync(output) || fs.statSync(output).size === 0) throw new Error("The image processor did not create a valid output image.");

    return res.download(output, safeDownloadName(`${path.parse(req.file.originalname).name}-${quality}.jpg`), (error) => {
      cleanup(req.file.path, output);
      if (error) console.error("Upscaler download error:", error);
    });
  } catch (error) {
    cleanup(req.file?.path, output);
    console.error("Image upscale error:", error);
    const message = String(error?.message || "Image upscaling failed.");
    const status = /unsupported|not recognized|no decode delegate|delegate/i.test(message) ? 415 : 500;
    return res.status(status).json({ success: false, message: status === 415 ? "This image format is not supported by the server. Please convert it to JPG or PNG first." : `Image upscaling failed: ${message}` });
  }
});

export default router;

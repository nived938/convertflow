import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { optionalApiKey } from "../middleware/optionalApiKey.js";
import { createZip } from "../services/archive.js";

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

function safeName(name) {
  return String(name || "download")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\.\.+/g, "_")
    .slice(0, 180) || "download";
}

async function sendFile(res, input, output, downloadName) {
  if (!fs.existsSync(output)) throw new Error("The processing tool did not create an output file.");
  res.download(output, safeName(downloadName), (error) => {
    cleanup(input, output);
    if (error) console.error("Media tool download error:", error);
  });
}

router.post("/image-upscale", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No image was uploaded." });

    const quality = String(req.body.quality || "4k").toLowerCase();
    const sizes = {
      "2k": [2560, 1440],
      "4k": [3840, 2160],
      "8k": [7680, 4320],
    };
    const [width, height] = sizes[quality] || sizes["4k"];

    output = path.join(tempDirectory, `${crypto.randomUUID()}-upscaled.png`);

    await execFileAsync("magick", [
      req.file.path,
      "-auto-orient",
      "-resize", `${width}x${height}^`,
      "-gravity", "center",
      "-extent", `${width}x${height}`,
      "-filter", "Lanczos",
      "-unsharp", "0x1+0.7+0.02",
      "-quality", "95",
      output,
    ]);

    return sendFile(
      res,
      req.file.path,
      output,
      `${path.parse(req.file.originalname).name}-${quality}.png`
    );
  } catch (error) {
    cleanup(req.file?.path, output);
    console.error("Image upscale error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Image upscaling failed.",
    });
  }
});

router.post("/image-crop", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No image was uploaded." });
    const width = Math.max(1, Math.min(10000, Number(req.body.width) || 0));
    const height = Math.max(1, Math.min(10000, Number(req.body.height) || 0));
    const x = Math.max(0, Number(req.body.x) || 0);
    const y = Math.max(0, Number(req.body.y) || 0);
    if (!width || !height) throw new Error("Crop width and height are required.");
    output = path.join(tempDirectory, `${crypto.randomUUID()}-cropped.png`);
    await execFileAsync("magick", [req.file.path, "-crop", `${width}x${height}+${x}+${y}`, "+repage", output]);
    return sendFile(res, req.file.path, output, `${path.parse(req.file.originalname).name}-cropped.png`);
  } catch (error) {
    cleanup(req.file?.path, output);
    return res.status(500).json({ success: false, message: error.message || "Image crop failed." });
  }
});

router.post("/image-background-remover", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No image was uploaded." });
    output = path.join(tempDirectory, `${crypto.randomUUID()}-background-removed.png`);
    await execFileAsync("magick", [req.file.path, "-alpha", "on", "-fuzz", "10%", "-fill", "none", "-draw", "matte 0,0 floodfill", output]);
    return sendFile(res, req.file.path, output, `${path.parse(req.file.originalname).name}-no-background.png`);
  } catch (error) {
    cleanup(req.file?.path, output);
    return res.status(500).json({ success: false, message: error.message || "Background removal failed." });
  }
});

router.post("/image-watermark", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No image was uploaded." });
    const text = String(req.body.text || "ConvertFlow").slice(0, 100);
    output = path.join(tempDirectory, `${crypto.randomUUID()}-watermarked.png`);
    await execFileAsync("magick", [req.file.path, "-gravity", "southeast", "-fill", "white", "-stroke", "black", "-strokewidth", "1", "-pointsize", "36", "-annotate", "+30+30", text, output]);
    return sendFile(res, req.file.path, output, `${path.parse(req.file.originalname).name}-watermarked.png`);
  } catch (error) {
    cleanup(req.file?.path, output);
    return res.status(500).json({ success: false, message: error.message || "Watermark failed." });
  }
});

router.post("/image-enhance", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No image was uploaded." });
    output = path.join(tempDirectory, `${crypto.randomUUID()}-enhanced.png`);
    await execFileAsync("magick", [req.file.path, "-auto-level", "-unsharp", "0x1+0.8+0.02", "-quality", "92", output]);
    return sendFile(res, req.file.path, output, `${path.parse(req.file.originalname).name}-enhanced.png`);
  } catch (error) {
    cleanup(req.file?.path, output);
    return res.status(500).json({ success: false, message: error.message || "Image enhancement failed." });
  }
});

router.post("/video-compress", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No video was uploaded." });
    const quality = String(req.body.quality || "medium");
    const crf = quality === "low" ? "32" : quality === "high" ? "23" : "28";
    const resolution = String(req.body.resolution || "original");
    output = path.join(tempDirectory, `${crypto.randomUUID()}-compressed.mp4`);
    const args = ["-i", req.file.path, "-c:v", "libx264", "-crf", crf, "-preset", "medium", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart"];
    if (["1080p", "720p", "480p"].includes(resolution)) args.push("-vf", `scale=-2:${resolution.replace("p", "")}`);
    args.push("-y", output);
    await execFileAsync("ffmpeg", args, { timeout: 240000 });
    return sendFile(res, req.file.path, output, `${path.parse(req.file.originalname).name}-compressed.mp4`);
  } catch (error) {
    cleanup(req.file?.path, output);
    return res.status(500).json({ success: false, message: error.message || "Video compression failed." });
  }
});

router.post("/video-resolution", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No video was uploaded." });
    const resolution = String(req.body.resolution || "1080p");
    const height = { "4k": 2160, "1440p": 1440, "1080p": 1080, "720p": 720, "480p": 480 }[resolution] || 1080;
    output = path.join(tempDirectory, `${crypto.randomUUID()}-resolution.mp4`);
    await execFileAsync("ffmpeg", ["-i", req.file.path, "-vf", `scale=-2:${height}:flags=lanczos`, "-c:v", "libx264", "-c:a", "aac", "-movflags", "+faststart", "-y", output], { timeout: 240000 });
    return sendFile(res, req.file.path, output, `${path.parse(req.file.originalname).name}-${resolution}.mp4`);
  } catch (error) {
    cleanup(req.file?.path, output);
    return res.status(500).json({ success: false, message: error.message || "Video resolution conversion failed." });
  }
});

router.post("/video-framerate", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No video was uploaded." });
    const fps = Math.max(1, Math.min(120, Number(req.body.fps) || 30));
    output = path.join(tempDirectory, `${crypto.randomUUID()}-fps.mp4`);
    await execFileAsync("ffmpeg", ["-i", req.file.path, "-r", String(fps), "-c:v", "libx264", "-c:a", "aac", "-movflags", "+faststart", "-y", output], { timeout: 240000 });
    return sendFile(res, req.file.path, output, `${path.parse(req.file.originalname).name}-${fps}fps.mp4`);
  } catch (error) {
    cleanup(req.file?.path, output);
    return res.status(500).json({ success: false, message: error.message || "Frame-rate conversion failed." });
  }
});

router.post("/video-mute", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No video was uploaded." });
    output = path.join(tempDirectory, `${crypto.randomUUID()}-muted.mp4`);
    await execFileAsync("ffmpeg", ["-i", req.file.path, "-c:v", "copy", "-an", "-y", output], { timeout: 240000 });
    return sendFile(res, req.file.path, output, `${path.parse(req.file.originalname).name}-muted.mp4`);
  } catch (error) {
    cleanup(req.file?.path, output);
    return res.status(500).json({ success: false, message: error.message || "Removing audio failed." });
  }
});

router.post("/video-speed", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No video was uploaded." });
    const speed = Math.max(0.25, Math.min(4, Number(req.body.speed) || 1));
    output = path.join(tempDirectory, `${crypto.randomUUID()}-speed.mp4`);
    const pts = (1 / speed).toFixed(4);
    const audioFilters = [];
    let remaining = speed;
    while (remaining > 2) { audioFilters.push("atempo=2"); remaining /= 2; }
    while (remaining < 0.5) { audioFilters.push("atempo=0.5"); remaining /= 0.5; }
    audioFilters.push(`atempo=${remaining.toFixed(4)}`);
    await execFileAsync("ffmpeg", ["-i", req.file.path, "-filter_complex", `[0:v]setpts=${pts}*PTS[v];[0:a]${audioFilters.join(",")}[a]`, "-map", "[v]", "-map", "[a]?", "-c:v", "libx264", "-c:a", "aac", "-y", output], { timeout: 240000 });
    return sendFile(res, req.file.path, output, `${path.parse(req.file.originalname).name}-${speed}x.mp4`);
  } catch (error) {
    cleanup(req.file?.path, output);
    return res.status(500).json({ success: false, message: error.message || "Video speed change failed." });
  }
});

router.post("/video-thumbnail", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No video was uploaded." });
    const seconds = Math.max(0, Number(req.body.time) || 1);
    output = path.join(tempDirectory, `${crypto.randomUUID()}-thumbnail.jpg`);
    await execFileAsync("ffmpeg", ["-ss", String(seconds), "-i", req.file.path, "-frames:v", "1", "-q:v", "2", "-y", output], { timeout: 120000 });
    return sendFile(res, req.file.path, output, `${path.parse(req.file.originalname).name}-thumbnail.jpg`);
  } catch (error) {
    cleanup(req.file?.path, output);
    return res.status(500).json({ success: false, message: error.message || "Thumbnail extraction failed." });
  }
});

router.post("/gif", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No video was uploaded." });
    const fps = Math.max(1, Math.min(30, Number(req.body.fps) || 12));
    output = path.join(tempDirectory, `${crypto.randomUUID()}.gif`);
    await execFileAsync("ffmpeg", ["-i", req.file.path, "-vf", `fps=${fps},scale=720:-1:flags=lanczos`, "-loop", "0", "-y", output], { timeout: 240000 });
    return sendFile(res, req.file.path, output, `${path.parse(req.file.originalname).name}.gif`);
  } catch (error) {
    cleanup(req.file?.path, output);
    return res.status(500).json({ success: false, message: error.message || "GIF creation failed." });
  }
});

router.post("/audio-fade", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No audio was uploaded." });
    const fade = Math.max(0.1, Math.min(30, Number(req.body.fade) || 3));
    output = path.join(tempDirectory, `${crypto.randomUUID()}-fade.mp3`);
    await execFileAsync("ffmpeg", ["-i", req.file.path, "-af", `afade=t=in:ss=0:d=${fade},afade=t=out:st=999999:d=${fade}`, "-c:a", "libmp3lame", "-b:a", "192k", "-y", output], { timeout: 120000 });
    return sendFile(res, req.file.path, output, `${path.parse(req.file.originalname).name}-fade.mp3`);
  } catch (error) {
    cleanup(req.file?.path, output);
    return res.status(500).json({ success: false, message: error.message || "Audio fade failed." });
  }
});

router.post("/audio-waveform", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No audio was uploaded." });
    output = path.join(tempDirectory, `${crypto.randomUUID()}-waveform.png`);
    await execFileAsync("ffmpeg", ["-i", req.file.path, "-filter_complex", "showwavespic=s=1600x500:colors=white", "-frames:v", "1", "-y", output], { timeout: 120000 });
    return sendFile(res, req.file.path, output, `${path.parse(req.file.originalname).name}-waveform.png`);
  } catch (error) {
    cleanup(req.file?.path, output);
    return res.status(500).json({ success: false, message: error.message || "Waveform generation failed." });
  }
});

router.post("/archive/zip", optionalApiKey, upload.array("files", 20), async (req, res) => {
  let output;
  try {
    if (!req.files?.length) return res.status(400).json({ success: false, message: "Upload at least one file." });
    output = path.join(tempDirectory, `${crypto.randomUUID()}.zip`);
    await createZip(req.files.map((file) => ({ path: file.path, name: safeName(file.originalname) })), output);
    return sendFile(res, req.files.map((file) => file.path), output, "convertflow-files.zip");
  } catch (error) {
    cleanup(req.files?.map((file) => file.path), output);
    return res.status(500).json({ success: false, message: error.message || "ZIP creation failed." });
  }
});

export default router;

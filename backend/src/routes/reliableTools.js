import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import ffmpegPath from "ffmpeg-static";
import { execFile } from "child_process";
import { promisify } from "util";
import { optionalApiKey } from "../middleware/optionalApiKey.js";

const router = express.Router();
const execFileAsync = promisify(execFile);
const tempDirectory = path.resolve("temp");

if (!fs.existsSync(tempDirectory)) {
  fs.mkdirSync(tempDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, tempDirectory),
  filename: (_req, file, cb) => {
    cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
});

function cleanup(...files) {
  files.flat().forEach((file) => {
    if (file && fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
      } catch {}
    }
  });
}

function safeName(name) {
  return (
    String(name || "download")
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
      .replace(/\.\.+/g, "_")
      .slice(0, 180) || "download"
  );
}

function send(res, input, output, name) {
  if (!fs.existsSync(output)) {
    throw new Error("The processing tool did not create an output file.");
  }

  res.download(output, safeName(name), (error) => {
    cleanup(input, output);
    if (error) console.error("tool download", error);
  });
}

function requireFile(req) {
  if (!req.file) {
    const error = new Error("No file was uploaded.");
    error.status = 400;
    throw error;
  }
}

function extFormat(format) {
  const value = String(format || "webp").toLowerCase();
  return ["jpg", "jpeg", "png", "webp", "avif"].includes(value)
    ? value
    : "webp";
}

function ffmpegArgs(input, output, args = []) {
  return ["-hide_banner", "-loglevel", "error", "-y", "-i", input, ...args, output];
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function atempoChain(speed) {
  let remaining = speed;
  const filters = [];

  while (remaining > 2) {
    filters.push("atempo=2");
    remaining /= 2;
  }

  while (remaining < 0.5) {
    filters.push("atempo=0.5");
    remaining /= 0.5;
  }

  filters.push(`atempo=${remaining.toFixed(6)}`);
  return filters.join(",");
}

router.post("/image-crop", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    requireFile(req);
    const metadata = await sharp(req.file.path).metadata();
    const sourceWidth = metadata.width || 800;
    const sourceHeight = metadata.height || 600;
    const width = Math.max(1, Math.min(Number(req.body.width) || 800, sourceWidth));
    const height = Math.max(1, Math.min(Number(req.body.height) || 600, sourceHeight));
    const left = Math.max(0, Math.min(Number(req.body.x) || 0, sourceWidth - width));
    const top = Math.max(0, Math.min(Number(req.body.y) || 0, sourceHeight - height));

    output = path.join(tempDirectory, `${crypto.randomUUID()}-crop.png`);
    await sharp(req.file.path)
      .rotate()
      .extract({ left, top, width, height })
      .png()
      .toFile(output);

    return send(res, req.file.path, output, `${path.parse(req.file.originalname).name}-cropped.png`);
  } catch (error) {
    cleanup(req.file?.path, output);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Image crop failed.",
    });
  }
});

router.post("/image-optimize", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    requireFile(req);
    const format = extFormat(req.body.format);
    const quality = clampNumber(req.body.quality, 20, 100, 82);
    output = path.join(tempDirectory, `${crypto.randomUUID()}-optimized.${format}`);

    let processor = sharp(req.file.path).rotate();
    if (format === "jpg" || format === "jpeg") {
      processor = processor.jpeg({ quality, mozjpeg: true });
    } else if (format === "png") {
      processor = processor.png({ quality, compressionLevel: 9 });
    } else if (format === "avif") {
      processor = processor.avif({ quality });
    } else {
      processor = processor.webp({ quality });
    }

    await processor.toFile(output);
    return send(res, req.file.path, output, `${path.parse(req.file.originalname).name}-optimized.${format}`);
  } catch (error) {
    cleanup(req.file?.path, output);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Image optimization failed.",
    });
  }
});

router.post("/image-metadata-remove", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    requireFile(req);
    output = path.join(tempDirectory, `${crypto.randomUUID()}-clean.png`);
    await sharp(req.file.path).rotate().png().toFile(output);
    return send(res, req.file.path, output, `${path.parse(req.file.originalname).name}-metadata-removed.png`);
  } catch (error) {
    cleanup(req.file?.path, output);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Metadata removal failed.",
    });
  }
});

router.post("/image-convert", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    requireFile(req);
    const format = extFormat(req.body.format);
    output = path.join(tempDirectory, `${crypto.randomUUID()}-converted.${format}`);
    let processor = sharp(req.file.path).rotate();

    if (format === "jpg" || format === "jpeg") {
      processor = processor.flatten({ background: "white" }).jpeg({ quality: 92, mozjpeg: true });
    } else if (format === "png") {
      processor = processor.png();
    } else if (format === "avif") {
      processor = processor.avif({ quality: 90 });
    } else {
      processor = processor.webp({ quality: 90 });
    }

    await processor.toFile(output);
    return send(res, req.file.path, output, `${path.parse(req.file.originalname).name}.${format}`);
  } catch (error) {
    cleanup(req.file?.path, output);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Image conversion failed.",
    });
  }
});

router.post("/image-resize", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    requireFile(req);
    const width = Math.max(1, Math.min(10000, Number(req.body.width) || 1920));
    const height = Math.max(1, Math.min(10000, Number(req.body.height) || 1080));
    const keepAspect = String(req.body.keepAspect || "true") !== "false";
    output = path.join(tempDirectory, `${crypto.randomUUID()}-resize.png`);

    await sharp(req.file.path)
      .rotate()
      .resize({ width, height, fit: keepAspect ? "inside" : "fill" })
      .png()
      .toFile(output);

    return send(res, req.file.path, output, `${path.parse(req.file.originalname).name}-${width}x${height}.png`);
  } catch (error) {
    cleanup(req.file?.path, output);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Image resizing failed.",
    });
  }
});

router.post("/image-adjust", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    requireFile(req);
    const brightness = clampNumber(req.body.brightness, -100, 100, 0);
    const saturation = clampNumber(req.body.saturation, -100, 100, 0);
    const sharpness = clampNumber(req.body.sharpness, 0, 5, 0);
    output = path.join(tempDirectory, `${crypto.randomUUID()}-adjusted.png`);

    let processor = sharp(req.file.path)
      .rotate()
      .modulate({
        brightness: 1 + brightness / 100,
        saturation: 1 + saturation / 100,
      });

    if (sharpness) processor = processor.sharpen({ sigma: sharpness });
    await processor.png().toFile(output);

    return send(res, req.file.path, output, `${path.parse(req.file.originalname).name}-adjusted.png`);
  } catch (error) {
    cleanup(req.file?.path, output);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Image adjustment failed.",
    });
  }
});

router.post("/image-watermark", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    requireFile(req);
    const text = String(req.body.text || "ConvertFlow")
      .replace(/[<>&"']/g, " ")
      .slice(0, 100);
    output = path.join(tempDirectory, `${crypto.randomUUID()}-watermark.png`);

    const svg = `<svg width="1200" height="180"><style>text{font-family:Arial,sans-serif;font-size:48px;font-weight:700;fill:white;stroke:black;stroke-width:2px;paint-order:stroke;}</style><text x="1140" y="115" text-anchor="end">${text}</text></svg>`;

    await sharp(req.file.path)
      .rotate()
      .composite([{ input: Buffer.from(svg), gravity: "southeast" }])
      .png()
      .toFile(output);

    return send(res, req.file.path, output, `${path.parse(req.file.originalname).name}-watermarked.png`);
  } catch (error) {
    cleanup(req.file?.path, output);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Watermark failed.",
    });
  }
});

router.post("/image-enhance", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    requireFile(req);
    output = path.join(tempDirectory, `${crypto.randomUUID()}-enhanced.png`);
    await sharp(req.file.path)
      .rotate()
      .normalize()
      .sharpen({ sigma: 1.1 })
      .png()
      .toFile(output);

    return send(res, req.file.path, output, `${path.parse(req.file.originalname).name}-enhanced.png`);
  } catch (error) {
    cleanup(req.file?.path, output);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Image enhancement failed.",
    });
  }
});

router.post("/image-background-remover", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    requireFile(req);
    const { data, info } = await sharp(req.file.path)
      .rotate()
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const background = [data[0], data[1], data[2]];
    const threshold = clampNumber(req.body.threshold, 5, 120, 35);

    for (let index = 0; index < data.length; index += 4) {
      const distance = Math.sqrt(
        (data[index] - background[0]) ** 2 +
        (data[index + 1] - background[1]) ** 2 +
        (data[index + 2] - background[2]) ** 2
      );
      if (distance < threshold) data[index + 3] = 0;
    }

    output = path.join(tempDirectory, `${crypto.randomUUID()}-background.png`);
    await sharp(data, { raw: info }).png().toFile(output);

    return send(res, req.file.path, output, `${path.parse(req.file.originalname).name}-no-background.png`);
  } catch (error) {
    cleanup(req.file?.path, output);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Background removal failed.",
    });
  }
});

function video(route, argsBuilder, outputName, timeout = 300000) {
  router.post(route, optionalApiKey, upload.single("file"), async (req, res) => {
    let output;
    try {
      requireFile(req);
      if (!ffmpegPath) throw new Error("FFmpeg is not available on this server.");

      output = path.join(tempDirectory, `${crypto.randomUUID()}-${outputName}`);
      const args = argsBuilder(req);

      await execFileAsync(
        ffmpegPath,
        ffmpegArgs(req.file.path, output, args),
        { timeout, maxBuffer: 4 * 1024 * 1024 }
      );

      return send(res, req.file.path, output, `${path.parse(req.file.originalname).name}-${outputName}`);
    } catch (error) {
      cleanup(req.file?.path, output);
      return res.status(error.status || 500).json({
        success: false,
        message: String(error?.stderr || error?.message || "Media processing failed."),
      });
    }
  });
}

video("/video-compress", (req) => {
  const quality = { low: 32, medium: 28, high: 23 }[String(req.body.quality || "medium")] || 28;
  const args = [
    "-c:v", "libx264",
    "-crf", String(quality),
    "-preset", "veryfast",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
  ];

  if (["1080p", "720p", "480p"].includes(String(req.body.resolution))) {
    args.push("-vf", `scale=-2:${String(req.body.resolution).replace("p", "")}`);
  }

  return args;
}, "compressed.mp4");

video("/video-resolution", (req) => {
  const heights = {
    "4k": 2160,
    "2160p": 2160,
    "1440p": 1440,
    "1080p": 1080,
    "720p": 720,
    "480p": 480,
  };
  const height = heights[String(req.body.resolution || "1080p").toLowerCase()] || 1080;

  return [
    "-vf", `scale=-2:${height}:flags=lanczos`,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-c:a", "aac",
    "-movflags", "+faststart",
  ];
}, "resolution.mp4");

video("/video-framerate", (req) => [
  "-r", String(clampNumber(req.body.fps, 1, 120, 30)),
  "-c:v", "libx264",
  "-preset", "veryfast",
  "-c:a", "aac",
  "-movflags", "+faststart",
], "fps.mp4");

video("/video-mute", () => ["-c:v", "copy", "-an"], "muted.mp4");

video("/video-speed", (req) => {
  const speed = clampNumber(req.body.speed, 0.25, 4, 1);
  return [
    "-filter_complex",
    `[0:v]setpts=${(1 / speed).toFixed(6)}*PTS[v];[0:a]${atempoChain(speed)}[a]`,
    "-map", "[v]",
    "-map", "[a]?",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-c:a", "aac",
    "-movflags", "+faststart",
  ];
}, "speed.mp4");

video("/video-thumbnail", (req) => [
  "-ss", String(Math.max(0, Number(req.body.time) || 1)),
  "-frames:v", "1",
  "-q:v", "2",
], "thumbnail.jpg", 120000);

video("/gif", (req) => [
  "-vf", `fps=${clampNumber(req.body.fps, 1, 30, 12)},scale=720:-1:flags=lanczos`,
], "gif.gif");

router.post("/audio-extract", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    requireFile(req);
    if (!ffmpegPath) throw new Error("FFmpeg is not available on this server.");

    const requestedFormat = String(req.body.format || "mp3").toLowerCase();
    const format = ["mp3", "wav", "aac", "flac", "m4a", "ogg"].includes(requestedFormat)
      ? requestedFormat
      : "mp3";

    output = path.join(tempDirectory, `${crypto.randomUUID()}-audio.${format}`);

    let codec;
    if (format === "wav") codec = ["-c:a", "pcm_s16le"];
    else if (format === "flac") codec = ["-c:a", "flac"];
    else if (format === "ogg") codec = ["-c:a", "libvorbis", "-q:a", "5"];
    else if (format === "aac") codec = ["-c:a", "aac", "-b:a", "192k"];
    else codec = ["-c:a", "libmp3lame", "-b:a", "192k"];

    if (format === "m4a") codec = ["-c:a", "aac", "-b:a", "192k"];

    await execFileAsync(
      ffmpegPath,
      ffmpegArgs(req.file.path, output, ["-vn", ...codec]),
      { timeout: 300000, maxBuffer: 4 * 1024 * 1024 }
    );

    return send(res, req.file.path, output, `${path.parse(req.file.originalname).name}-audio.${format}`);
  } catch (error) {
    cleanup(req.file?.path, output);
    return res.status(error.status || 500).json({
      success: false,
      message: String(error?.stderr || error?.message || "Audio extraction failed."),
    });
  }
});

export default router;

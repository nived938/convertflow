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
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } });

function cleanup(...files) {
  files.flat().forEach((file) => {
    if (file && fs.existsSync(file)) {
      try { fs.unlinkSync(file); } catch {}
    }
  });
}
function safeName(name) {
  return String(name || "download").replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").replace(/\.\.+/g, "_").slice(0, 180) || "download";
}
function sendFile(res, input, output, downloadName) {
  if (!fs.existsSync(output)) throw new Error("The processing tool did not create an output file.");
  res.setHeader("X-ConvertFlow-Original-Size", String(fs.statSync(input).size));
  res.setHeader("X-ConvertFlow-Output-Size", String(fs.statSync(output).size));
  res.download(output, safeName(downloadName), (error) => {
    cleanup(input, output);
    if (error) console.error("Advanced tool download error:", error);
  });
}

router.post("/image-optimize", optionalApiKey, upload.single("file"), async (req, res) => {
  let output;
  try {
    if (!req.file) return res.status(400).json({ success:false, message:"No image was uploaded." });
    const quality = Math.max(20, Math.min(100, Number(req.body.quality) || 82));
    const format = String(req.body.format || "webp").toLowerCase();
    const ext = ["jpg","jpeg","png","webp","avif"].includes(format) ? format : "webp";
    output = path.join(tempDirectory, `${crypto.randomUUID()}-optimized.${ext}`);
    const args = [req.file.path, "-strip", "-auto-orient"];
    if (ext === "jpg" || ext === "jpeg") args.push("-background","white","-alpha","remove","-quality",String(quality));
    else if (ext === "png") args.push("-quality",String(quality));
    else if (ext === "avif") args.push("-quality",String(quality));
    else args.push("-quality",String(quality));
    args.push(output);
    await execFileAsync("magick", args);
    return sendFile(res, req.file.path, output, `${path.parse(req.file.originalname).name}-optimized.${ext}`);
  } catch (error) {
    cleanup(req.file?.path, output);
    return res.status(500).json({success:false,message:error.message || "Image optimization failed."});
  }
});

router.post("/image-metadata-remove", optionalApiKey, upload.single("file"), async (req,res) => {
  let output;
  try {
    if (!req.file) return res.status(400).json({success:false,message:"No image was uploaded."});
    output = path.join(tempDirectory, `${crypto.randomUUID()}-clean.png`);
    await execFileAsync("magick", [req.file.path,"-strip","-auto-orient",output]);
    return sendFile(res,req.file.path,output,`${path.parse(req.file.originalname).name}-metadata-removed.png`);
  } catch(error) {
    cleanup(req.file?.path,output);
    return res.status(500).json({success:false,message:error.message || "Metadata removal failed."});
  }
});

router.post("/image-convert", optionalApiKey, upload.single("file"), async (req,res) => {
  let output;
  try {
    if (!req.file) return res.status(400).json({success:false,message:"No image was uploaded."});
    const format=String(req.body.format||"webp").toLowerCase();
    const ext=["jpg","jpeg","png","webp","avif"].includes(format)?format:"webp";
    output=path.join(tempDirectory,`${crypto.randomUUID()}-converted.${ext}`);
    const args=[req.file.path,"-auto-orient"];
    if(ext==="jpg"||ext==="jpeg") args.push("-background","white","-alpha","remove","-quality","92");
    args.push(output);
    await execFileAsync("magick",args);
    return sendFile(res,req.file.path,output,`${path.parse(req.file.originalname).name}.${ext}`);
  } catch(error) {
    cleanup(req.file?.path,output);
    return res.status(500).json({success:false,message:error.message || "Image conversion failed."});
  }
});

router.post("/image-resize", optionalApiKey, upload.single("file"), async (req,res) => {
  let output;
  try {
    if (!req.file) return res.status(400).json({success:false,message:"No image was uploaded."});
    const width=Math.max(1,Math.min(10000,Number(req.body.width)||1920));
    const height=Math.max(1,Math.min(10000,Number(req.body.height)||1080));
    const keep=String(req.body.keepAspect||"true")!=="false";
    output=path.join(tempDirectory,`${crypto.randomUUID()}-resized.png`);
    await execFileAsync("magick",[req.file.path,"-auto-orient","-resize",keep?`${width}x${height}>`:`${width}x${height}!`,output]);
    return sendFile(res,req.file.path,output,`${path.parse(req.file.originalname).name}-${width}x${height}.png`);
  } catch(error) {
    cleanup(req.file?.path,output);
    return res.status(500).json({success:false,message:error.message || "Image resizing failed."});
  }
});

router.post("/image-adjust", optionalApiKey, upload.single("file"), async (req,res) => {
  let output;
  try {
    if (!req.file) return res.status(400).json({success:false,message:"No image was uploaded."});
    const brightness=Math.max(-100,Math.min(100,Number(req.body.brightness)||0));
    const contrast=Math.max(-100,Math.min(100,Number(req.body.contrast)||0));
    const saturation=Math.max(-100,Math.min(100,Number(req.body.saturation)||0));
    const sharpness=Math.max(0,Math.min(5,Number(req.body.sharpness)||0));
    output=path.join(tempDirectory,`${crypto.randomUUID()}-adjusted.png`);
    const args=[req.file.path,"-brightness-contrast",`${brightness}x${contrast}`];
    if(saturation) args.push("-modulate",`100,${100+saturation},100`);
    if(sharpness) args.push("-unsharp",`0x${sharpness}+0.8+0.02`);
    args.push(output);
    await execFileAsync("magick",args);
    return sendFile(res,req.file.path,output,`${path.parse(req.file.originalname).name}-adjusted.png`);
  } catch(error) {
    cleanup(req.file?.path,output);
    return res.status(500).json({success:false,message:error.message || "Image adjustment failed."});
  }
});

router.post("/audio-extract", optionalApiKey, upload.single("file"), async (req,res) => {
  let output;
  try {
    if (!req.file) return res.status(400).json({success:false,message:"No video was uploaded."});
    const format=String(req.body.format||"mp3").toLowerCase();
    const ext=["mp3","wav","aac","flac","m4a","ogg"].includes(format)?format:"mp3";
    output=path.join(tempDirectory,`${crypto.randomUUID()}-audio.${ext}`);
    const codec={mp3:["-c:a","libmp3lame","-b:a","192k"],wav:["-c:a","pcm_s16le"],aac:["-c:a","aac","-b:a","192k"],flac:["-c:a","flac"],m4a:["-c:a","aac","-b:a","192k"],ogg:["-c:a","libvorbis","-q:a","5"]}[ext];
    await execFileAsync("ffmpeg",["-i",req.file.path,"-vn",...codec,"-y",output],{timeout:240000});
    return sendFile(res,req.file.path,output,`${path.parse(req.file.originalname).name}.${ext}`);
  } catch(error) {
    cleanup(req.file?.path,output);
    return res.status(500).json({success:false,message:error.message || "Audio extraction failed."});
  }
});

export default router;

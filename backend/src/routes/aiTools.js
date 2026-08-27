import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { optionalApiKey } from "../middleware/optionalApiKey.js";

const router = express.Router();
const tempDirectory = path.resolve("temp");
if (!fs.existsSync(tempDirectory)) fs.mkdirSync(tempDirectory, { recursive: true });
const storage = multer.diskStorage({ destination: (_req, _file, cb) => cb(null, tempDirectory), filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`) });
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024 } });
const cleanup = (...files) => files.flat().forEach(file => { if (file && fs.existsSync(file)) { try { fs.unlinkSync(file); } catch {} } });
const openRouterHeaders = () => ({ Authorization:`Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type":"application/json", "HTTP-Referer":process.env.FRONTEND_URL || "https://convertflow-seven-delta.vercel.app", "X-OpenRouter-Title":"ConvertFlow" });

// Image generation is handled by Puter.js in the browser. No ConvertFlow image API key is required.
router.post("/image-generate", optionalApiKey, async (_req,res) => res.status(410).json({success:false,message:"Image generation uses Puter.js. Please use the Advanced Image Generator in the frontend."}));

router.post("/image-upscale", optionalApiKey, upload.single("file"), async (req,res) => {
  try { if(!req.file) return res.status(400).json({success:false,message:"No image was uploaded."}); return res.status(503).json({success:false,message:"AI upscaling is temporarily unavailable. ConvertFlow will not fake AI enhancement with simple pixel enlargement."}); }
  finally { cleanup(req.file?.path); }
});

router.post("/text-to-audio", optionalApiKey, async (req,res) => {
  try {
    const key=process.env.OPENROUTER_API_KEY;
    if(!key) return res.status(503).json({success:false,message:"OPENROUTER_API_KEY is not configured on the backend."});
    const text=String(req.body?.text||"").trim();
    if(!text) return res.status(400).json({success:false,message:"Enter text to convert to audio."});
    const model=process.env.OPENROUTER_TTS_MODEL||"deepgram/flux-tts:free";
    const voice=String(req.body?.voice||"flux-haley-en");
    const body={model,input:text,voice,response_format:"mp3",speed:Math.max(0.85,Math.min(1.15,Number(req.body?.speed)||1))};
    const response=await fetch("https://openrouter.ai/api/v1/audio/speech",{method:"POST",headers:openRouterHeaders(),body:JSON.stringify(body)});
    if(!response.ok){const detail=await response.text().catch(()=>"");throw new Error(`OpenRouter TTS returned ${response.status}${detail?`: ${detail.slice(0,400)}`:""}`);}
    const buffer=Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Type",response.headers.get("content-type")||"audio/mpeg");res.setHeader("Content-Disposition","attachment; filename=\"convertflow-ai-voice.mp3\"");res.setHeader("Content-Length",String(buffer.length));return res.end(buffer);
  } catch(error){console.error("OpenRouter TTS error:",error);return res.status(500).json({success:false,message:error.message||"Text-to-audio failed."});}
});

export default router;

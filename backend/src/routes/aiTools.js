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
const mimeFromPath = file => ({ ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".webp":"image/webp", ".gif":"image/gif" })[path.extname(file).toLowerCase()] || "application/octet-stream";
const openRouterHeaders = () => ({ Authorization:`Bearer ${process.env.OPENROUTER_API_KEY}`, "Content-Type":"application/json", "HTTP-Referer":process.env.FRONTEND_URL || "https://convertflow-seven-delta.vercel.app", "X-OpenRouter-Title":"ConvertFlow" });

async function openRouterImage(prompt, size="1K", input=null) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY is not configured on the backend.");
  const body = { model:process.env.OPENROUTER_IMAGE_MODEL || "google/gemini-2.5-flash-image", prompt, n:1 };
  if (["0.5K","1K","2K","4K"].includes(size)) body.resolution=size;
  if (input) body.input_references=[`data:${input.mime};base64,${input.data}`];
  const response = await fetch("https://openrouter.ai/api/v1/images", { method:"POST", headers:openRouterHeaders(), body:JSON.stringify(body) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error?.message || result?.message || `OpenRouter image request failed (${response.status}).`);
  const image = result?.data?.[0];
  if (!image?.b64_json) throw new Error("OpenRouter completed without returning image data.");
  return { data:image.b64_json, mime:image.media_type || "image/png", usage:result?.usage };
}

router.post("/image-generate", optionalApiKey, async (req,res) => {
  try {
    const prompt=String(req.body?.prompt||"").trim();
    if(!prompt) return res.status(400).json({success:false,message:"Enter an image prompt."});
    const size=["0.5K","1K","2K","4K"].includes(req.body?.size) ? req.body.size : "1K";
    const result=await openRouterImage(prompt,size);
    return res.json({success:true,image:`data:${result.mime};base64,${result.data}`,usage:result.usage||null});
  } catch(error) { console.error("OpenRouter image generation error:",error); return res.status(500).json({success:false,message:error.message||"Image generation failed."}); }
});

router.post("/image-upscale", optionalApiKey, upload.single("file"), async (req,res) => {
  try {
    if(!req.file) return res.status(400).json({success:false,message:"No image was uploaded."});
    const size=String(req.body?.quality||"4k").toLowerCase()==="2k" ? "2K" : "4K";
    const input={mime:mimeFromPath(req.file.path),data:fs.readFileSync(req.file.path).toString("base64")};
    const result=await openRouterImage(`AI super-resolution upscale this exact image to ${size}. Preserve the subject, identity, composition, colors, text, logos and framing. Reconstruct plausible missing fine detail, improve edges, textures, faces and clarity, reduce noise and compression artifacts. Do not redesign, stylize, crop or add objects. Output only the enhanced image.`,size,input);
    const buffer=Buffer.from(result.data,"base64");
    res.setHeader("Content-Type",result.mime); res.setHeader("Content-Disposition",`attachment; filename="convertflow-ai-upscaled.${result.mime.includes("jpeg")?"jpg":"png"}"`); res.setHeader("Content-Length",String(buffer.length)); return res.end(buffer);
  } catch(error) { console.error("OpenRouter AI upscale error:",error); return res.status(500).json({success:false,message:error.message||"AI upscaling failed."}); }
  finally { cleanup(req.file?.path); }
});

router.post("/text-to-audio", optionalApiKey, async (req,res) => {
  try {
    const key=process.env.OPENROUTER_API_KEY;
    if(!key) return res.status(503).json({success:false,message:"OPENROUTER_API_KEY is not configured on the backend."});
    const text=String(req.body?.text||"").trim();
    if(!text) return res.status(400).json({success:false,message:"Enter text to convert to audio."});
    const model=process.env.OPENROUTER_TTS_MODEL || "fish-audio/s2.1-pro-free:free";
    const body={model,input:text,response_format:"mp3"};
    if(req.body?.voice) body.voice=String(req.body.voice).trim();
    const response=await fetch("https://openrouter.ai/api/v1/audio/speech",{method:"POST",headers:openRouterHeaders(),body:JSON.stringify(body)});
    if(!response.ok){const detail=await response.text().catch(()=>"");throw new Error(`OpenRouter TTS returned ${response.status}${detail?`: ${detail.slice(0,400)}`:""}`);}
    const buffer=Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Type",response.headers.get("content-type") || "audio/mpeg"); res.setHeader("Content-Disposition","attachment; filename=\"convertflow-ai-voice.mp3\""); res.setHeader("Content-Length",String(buffer.length)); return res.end(buffer);
  } catch(error) { console.error("OpenRouter TTS error:",error); return res.status(500).json({success:false,message:error.message||"Text-to-audio failed."}); }
});

export default router;

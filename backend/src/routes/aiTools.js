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

async function googleImage(prompt) {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) throw new Error("GOOGLE_API_KEY is not configured on the backend.");
  const model = process.env.GOOGLE_IMAGE_MODEL || "gemini-2.5-flash-image";
  const endpoint = `https://aiplatform.googleapis.com/v1/publishers/google/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({
      contents: [{ role:"user", parts:[{ text:`Generate a high-quality image from this prompt. Return the image itself, not a text description. Prompt: ${prompt}` }] }],
      generationConfig: { responseModalities:["IMAGE"] }
    })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Google image generation failed (${response.status}): ${result?.error?.message || "Unknown Google API error"}`);
  const parts = result?.candidates?.flatMap(c => c?.content?.parts || []) || [];
  const imagePart = parts.find(p => p?.inlineData?.data || p?.inline_data?.data);
  const data = imagePart?.inlineData?.data || imagePart?.inline_data?.data;
  const mime = imagePart?.inlineData?.mimeType || imagePart?.inline_data?.mime_type || "image/png";
  if (!data) throw new Error("Google completed the request but did not return an image.");
  return { data, mime, model };
}

router.post("/image-generate", optionalApiKey, async (req,res) => {
  try {
    const prompt=String(req.body?.prompt||"").trim();
    if(!prompt) return res.status(400).json({success:false,message:"Enter an image prompt."});
    const result=await googleImage(prompt);
    return res.json({success:true,image:`data:${result.mime};base64,${result.data}`,model:result.model});
  } catch(error) { console.error("Google image generation error:",error); return res.status(500).json({success:false,message:error.message||"Image generation failed."}); }
});

router.post("/image-upscale", optionalApiKey, upload.single("file"), async (req,res) => {
  try { if(!req.file) return res.status(400).json({success:false,message:"No image was uploaded."}); throw new Error("AI upscaling is not enabled yet. Image generation uses Google Vertex AI, while Text-to-Audio uses OpenRouter."); }
  catch(error) { return res.status(503).json({success:false,message:error.message}); }
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

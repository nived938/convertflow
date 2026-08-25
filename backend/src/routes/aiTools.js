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

async function geminiImage(input, prompt, size="1K") {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured on the backend.");
  const inputParts = [{ type:"text", text:prompt }];
  if (input) inputParts.push({ type:"image", mime_type:input.mime, data:input.data });
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", { method:"POST", headers:{"x-goog-api-key":key,"Content-Type":"application/json"}, body:JSON.stringify({ model:process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image", input:inputParts, response_format:{type:"image",image_size:size} }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error?.message || result?.message || `Gemini returned ${response.status}.`);
  const image = result?.output_image || result?.output?.find?.(x => x?.type === "image") || result?.parts?.find?.(x => x?.inline_data)?.inline_data;
  const data = image?.data || image?.inline_data?.data;
  if (!data) throw new Error("Gemini completed without returning an image.");
  return { data, mime:image?.mime_type || image?.inline_data?.mime_type || "image/png" };
}

router.post("/image-generate", optionalApiKey, async (req,res) => {
  try {
    const prompt=String(req.body?.prompt||"").trim();
    if(!prompt) return res.status(400).json({success:false,message:"Enter an image prompt."});
    const size=["0.5K","1K","2K","4K"].includes(req.body?.size) ? req.body.size : "1K";
    const result=await geminiImage(null,prompt,size);
    return res.json({success:true,image:`data:${result.mime};base64,${result.data}`});
  } catch(error) { console.error("AI image generation error:",error); return res.status(500).json({success:false,message:error.message||"Image generation failed."}); }
});

router.post("/image-upscale", optionalApiKey, upload.single("file"), async (req,res) => {
  try {
    if(!req.file) return res.status(400).json({success:false,message:"No image was uploaded."});
    const size=String(req.body?.quality||"4k").toLowerCase()==="2k" ? "2K" : "4K";
    const input={mime:mimeFromPath(req.file.path),data:fs.readFileSync(req.file.path).toString("base64")};
    const result=await geminiImage(input,`AI super-resolution upscale this exact image to ${size}. Preserve the subject, identity, composition, colors, text, logos and framing. Reconstruct plausible missing fine detail, improve edges, textures, faces and clarity, reduce noise and compression artifacts. Do not redesign, stylize, crop or add objects. Output only the enhanced image.`,size);
    const buffer=Buffer.from(result.data,"base64");
    res.setHeader("Content-Type",result.mime); res.setHeader("Content-Length",String(buffer.length)); return res.end(buffer);
  } catch(error) { console.error("AI upscale error:",error); return res.status(500).json({success:false,message:error.message||"AI upscaling failed."}); }
  finally { cleanup(req.file?.path); }
});

router.post("/text-to-audio", optionalApiKey, async (req,res) => {
  try {
    const key=process.env.FISH_API_KEY;
    if(!key) return res.status(503).json({success:false,message:"FISH_API_KEY is not configured on the backend."});
    const text=String(req.body?.text||"").trim();
    if(!text) return res.status(400).json({success:false,message:"Enter text to convert to audio."});
    const payload={text,format:"mp3",normalize:true,latency:"normal"};
    if(req.body?.referenceId) payload.reference_id=String(req.body.referenceId).trim();
    const speed=Math.max(0.5,Math.min(2,Number(req.body?.speed)||1));
    payload.prosody={speed,volume:0,normalize_loudness:true};
    const response=await fetch("https://api.fish.audio/v1/tts",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json",model:process.env.FISH_MODEL||"s2-pro"},body:JSON.stringify(payload)});
    if(!response.ok) { const detail=await response.text().catch(()=>""); throw new Error(`Fish Audio returned ${response.status}${detail?`: ${detail.slice(0,300)}`:""}`); }
    const buffer=Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Type","audio/mpeg"); res.setHeader("Content-Length",String(buffer.length)); return res.end(buffer);
  } catch(error) { console.error("Fish Audio TTS error:",error); return res.status(500).json({success:false,message:error.message||"Text-to-audio failed."}); }
});

export default router;

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

// Image generation uses Pollinations so OpenRouter remains dedicated to audio.
// The model can be changed in Render without touching the frontend.
const DEFAULT_IMAGE_MODEL = "nanobanana-2";

async function pollinationsImage(prompt, size="1K") {
  const key=process.env.POLLINATIONS_API_KEY;
  if(!key) throw new Error("POLLINATIONS_API_KEY is not configured on the backend.");
  const model=process.env.POLLINATIONS_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;
  const dimensions = size === "2K" ? [1536,1536] : size === "4K" ? [2048,2048] : [1024,1024];
  const params=new URLSearchParams({model,width:String(dimensions[0]),height:String(dimensions[1]),n:"1"});
  const url=`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?${params}`;
  const response=await fetch(url,{headers:{Authorization:`Bearer ${key}`}});
  if(!response.ok){const detail=await response.text().catch(()=>"");throw new Error(`Pollinations image request failed (${response.status})${detail?`: ${detail.slice(0,400)}`:""}`);}
  const contentType=response.headers.get("content-type")||"image/jpeg";
  const buffer=Buffer.from(await response.arrayBuffer());
  return {data:buffer.toString("base64"),mime:contentType,model};
}

router.post("/image-generate",optionalApiKey,async(req,res)=>{
  try{
    const prompt=String(req.body?.prompt||"").trim();
    if(!prompt) return res.status(400).json({success:false,message:"Enter an image prompt."});
    const result=await pollinationsImage(prompt,"1K");
    return res.json({success:true,image:`data:${result.mime};base64,${result.data}`,model:result.model});
  }catch(error){console.error("Pollinations image generation error:",error);return res.status(500).json({success:false,message:error.message||"Image generation failed."});}
});

router.post("/image-upscale",optionalApiKey,upload.single("file"),async(req,res)=>{
  try{
    if(!req.file) return res.status(400).json({success:false,message:"No image was uploaded."});
    const inputBuffer=fs.readFileSync(req.file.path);
    // Pollinations image editing is model/provider dependent. For a reliable no-credit fallback,
    // use the source image as a reference URL only when the selected provider supports it.
    // The current generation endpoint cannot accept local binary references, so fail clearly instead
    // of silently returning a resized image and calling it AI enhancement.
    const model=process.env.POLLINATIONS_IMAGE_EDIT_MODEL || "gptimage";
    const size=String(req.body?.quality||"4k").toLowerCase()==="2k"?"2K":"4K";
    const dataUrl=`data:${mimeFromPath(req.file.path)};base64,${inputBuffer.toString("base64")}`;
    const response=await fetch("https://gen.pollinations.ai/v1/images/edits",{method:"POST",headers:{Authorization:`Bearer ${process.env.POLLINATIONS_API_KEY}`},body:(()=>{const form=new FormData();form.append("image",new Blob([inputBuffer],{type:mimeFromPath(req.file.path)}),path.basename(req.file.path));form.append("prompt",`Professionally restore and upscale this exact image to ${size}. Preserve identity, composition, colors, text, logos and framing. Reconstruct fine details, improve edges and textures, reduce noise and compression artifacts. Do not add objects, crop or redesign it.`);form.append("model",model);return form;})()});
    if(!response.ok){const detail=await response.text().catch(()=>"");throw new Error(`Pollinations image editing failed (${response.status})${detail?`: ${detail.slice(0,400)}`:""}`);}
    const contentType=response.headers.get("content-type")||"image/png";
    const buffer=Buffer.from(await response.arrayBuffer());
    res.setHeader("Content-Type",contentType);res.setHeader("Content-Disposition",`attachment; filename="convertflow-ai-upscaled.${contentType.includes("jpeg")?"jpg":"png"}`);res.setHeader("Content-Length",String(buffer.length));return res.end(buffer);
  }catch(error){console.error("Pollinations AI upscale error:",error);return res.status(500).json({success:false,message:error.message||"AI upscaling failed."});}
  finally{cleanup(req.file?.path);}
});

router.post("/text-to-audio",optionalApiKey,async(req,res)=>{
  try{
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
  }catch(error){console.error("OpenRouter TTS error:",error);return res.status(500).json({success:false,message:error.message||"Text-to-audio failed."});}
});

export default router;

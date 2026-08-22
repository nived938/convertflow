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
  destination: (_req,_file,cb)=>cb(null,tempDirectory),
  filename: (_req,file,cb)=>cb(null,`${crypto.randomUUID()}${path.extname(file.originalname)}`),
});
const upload=multer({storage,limits:{fileSize:100*1024*1024}});
function cleanup(...files){files.flat().forEach(file=>{if(file&&fs.existsSync(file)){try{fs.unlinkSync(file)}catch{}}});}
function safeName(name){return String(name||"download").replace(/[<>:"/\\|?*\x00-\x1F]/g,"_").replace(/\.\.+/g,"_").slice(0,180)||"download";}

router.post("/image-upscale",optionalApiKey,upload.single("file"),async(req,res)=>{
 let output;
 try{
  if(!req.file)return res.status(400).json({success:false,message:"No image was uploaded."});
  const quality=String(req.body?.quality||"4k").toLowerCase();
  const sizes={"2k":[2560,1440],"4k":[3840,2160],"8k":[7680,4320]};
  const [width,height]=sizes[quality]||sizes["4k"];
  output=path.join(tempDirectory,`${crypto.randomUUID()}-upscaled.png`);
  await execFileAsync("ffmpeg",["-hide_banner","-loglevel","error","-i",req.file.path,"-vf",`scale=${width}:${height}:force_original_aspect_ratio=decrease:flags=lanczos,unsharp=5:5:0.65:5:5:0.0`,"-frames:v","1","-y",output],{timeout:240000});
  if(!fs.existsSync(output))throw new Error("FFmpeg did not create the upscaled image.");
  res.download(output,safeName(`${path.parse(req.file.originalname).name}-${quality}.png`),error=>{cleanup(req.file.path,output);if(error)console.error("Upscale download error:",error);});
 }catch(error){cleanup(req.file?.path,output);console.error("Image upscale error:",error);return res.status(500).json({success:false,message:`Image upscaling failed: ${error.message||"FFmpeg could not process the image."}`});}
});

export default router;

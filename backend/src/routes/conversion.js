import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { convertFile } from "../services/converter.js";
import { createZip } from "../services/archive.js";
import { optionalAuth } from "../middleware/auth.js";
import { optionalApiKey } from "../middleware/optionalApiKey.js";

const router = express.Router();
const tempDirectory = path.resolve("temp");
if (!fs.existsSync(tempDirectory)) fs.mkdirSync(tempDirectory, { recursive: true });
const storage = multer.diskStorage({ destination: (req,file,cb)=>cb(null,tempDirectory), filename:(req,file,cb)=>cb(null,`${crypto.randomUUID()}${path.extname(file.originalname)}`) });
const upload = multer({ storage, limits:{ fileSize:100*1024*1024 } });
function cleanupFile(filePath){if(filePath&&fs.existsSync(filePath)){try{fs.unlinkSync(filePath)}catch{}}}
function safeName(name){return String(name||"download").replace(/[<>:"/\\|?*\x00-\x1F]/g,"_").replace(/\.\.+/g,"_").trim().slice(0,180)||"download"}
async function withTimeout(promise,ms=120000){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error("Conversion timed out after 2 minutes. Please try again with a smaller file or different format.")),ms)})])}finally{clearTimeout(timer)}}

router.post("/convert", optionalApiKey, optionalAuth, upload.single("file"), async (req,res)=>{let outputPath=null;try{if(!req.file)return res.status(400).json({success:false,message:"No file was uploaded."});const outputFormat=String(req.body.outputFormat||"").toLowerCase();if(!outputFormat){cleanupFile(req.file.path);return res.status(400).json({success:false,message:"Output format is required."})}const result=await withTimeout(convertFile(req.file.path,outputFormat));outputPath=result.outputPath;const downloadName=safeName(result.outputName||`${path.parse(req.file.originalname).name}.${outputFormat}`);res.download(outputPath,downloadName,error=>{cleanupFile(req.file.path);cleanupFile(outputPath);if(error)console.error("Download error:",error)})}catch(error){console.error("Conversion error:",error);cleanupFile(req.file?.path);cleanupFile(outputPath);return res.status(error.message?.includes("timed out")?504:500).json({success:false,message:error.message||"Conversion failed. Please try again."})}});

router.post("/convert-batch", optionalApiKey, optionalAuth, upload.array("files",20), async(req,res)=>{const convertedFiles=[],inputFiles=req.files||[];try{if(!inputFiles.length)return res.status(400).json({success:false,message:"No files were uploaded."});let outputFormats=[];try{outputFormats=JSON.parse(req.body.outputFormats||"[]")}catch{return res.status(400).json({success:false,message:"Invalid outputFormats data."})}if(outputFormats.length!==inputFiles.length)return res.status(400).json({success:false,message:"Each file must have an output format."});for(let i=0;i<inputFiles.length;i++){const inputFile=inputFiles[i],outputFormat=String(outputFormats[i]||"").toLowerCase();if(!outputFormat)throw new Error(`Missing output format for ${inputFile.originalname}`);const result=await withTimeout(convertFile(inputFile.path,outputFormat));convertedFiles.push({path:result.outputPath,name:safeName(result.outputName||`${path.parse(inputFile.originalname).name}.${outputFormat}`)})}const zipName=`convertflow-${crypto.randomUUID()}.zip`,zipPath=path.join(tempDirectory,zipName);await withTimeout(createZip(convertedFiles,zipPath),60000);res.download(zipPath,"convertflow-files.zip",error=>{inputFiles.forEach(f=>cleanupFile(f.path));convertedFiles.forEach(f=>cleanupFile(f.path));cleanupFile(zipPath);if(error)console.error("ZIP download error:",error)})}catch(error){console.error("Batch conversion error:",error);inputFiles.forEach(f=>cleanupFile(f.path));convertedFiles.forEach(f=>cleanupFile(f.path));return res.status(error.message?.includes("timed out")?504:500).json({success:false,message:error.message||"Batch conversion failed. Please try again."})}});
export default router;

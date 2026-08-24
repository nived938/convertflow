import express from "express";
import { writeLog } from "./admin.js";
const router=express.Router();
const recent=new Map();
router.post("/",async(req,res)=>{try{const ip=String(req.headers["x-forwarded-for"]||req.ip||"unknown").split(",")[0].trim();const now=Date.now();const last=recent.get(ip)||0;if(now-last<1500)return res.status(429).json({success:false,message:"Too many error reports."});recent.set(ip,now);const body=req.body||{};const message=String(body.message||"Unknown client error").slice(0,1000);const event=String(body.event||"client.error").slice(0,100);const page=String(body.page||"").slice(0,300);const stack=String(body.stack||"").slice(0,4000);await writeLog("error",event,message,{page,stack,userAgent:String(req.headers["user-agent"]||"").slice(0,500),ip});return res.json({success:true});}catch(e){return res.status(500).json({success:false,message:"Could not record client error."})}});
export default router;

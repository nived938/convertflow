import express from "express";
import { sb } from "./admin.js";
const router=express.Router();
router.get("/",async(req,res)=>{try{const r=await sb("/rest/v1/site_control?id=eq.1&select=advanced_tools_enabled");const d=await r.json().catch(()=>[]);if(!r.ok||!d[0])throw new Error("Site configuration unavailable.");const c=d[0].advanced_tools_enabled||{};return res.json({success:true,downloadSectionEnabled:c._download_section_enabled!==false})}catch(e){return res.status(502).json({success:false,message:e.message,downloadSectionEnabled:true})}});
export default router;

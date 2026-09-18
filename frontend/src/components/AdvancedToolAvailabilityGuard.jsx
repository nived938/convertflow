import { useEffect,useMemo,useState } from "react";
import { useLocation,useNavigate } from "react-router-dom";

const API=(import.meta.env.VITE_API_URL||"https://convertflow-backend.onrender.com/api").replace(/\/$/,"");
const TOOLS=[["analyzer","File Information Analyzer"],["duplicates","Duplicate Detector"],["rename","Smart Filename Generator"],["split","File Splitter"],["merge","File Merger"],["contact","Contact Sheet"],["palette","Color Palette Extractor"],["blur","Image Blur"],["pixelate","Image Pixelate"],["qr","QR Generator"],["scan","QR Scanner"],["barcode","Barcode Generator"],["beautify","Screenshot Beautifier"],["favicon","Favicon Generator"],["webp","Animated WebP Converter"],["command","ConvertFlow Command Generator"],["ai-image","AI Image Generator"],["tts","Text to Audio"]];

function puterError(error){
  const code=String(error?.errorCode||error?.code||"");
  if(code==="insufficient_funds") return "Your Puter account does not have enough image-generation credits.";
  if(code==="moderation_flagged") return "Puter's image safety filter rejected this prompt. Try rewording it.";
  if(code==="upstream_failed") return "Puter's image provider failed this generation. Please try again.";
  return String(error?.message||error?.msg||"Puter image generation failed.");
}

export default function AdvancedToolAvailabilityGuard({children}){
 const navigate=useNavigate(); const {pathname}=useLocation();
 const routeTool=useMemo(()=>pathname.match(/^\/advanced-tools\/([^/]+)$/)?.[1]||"",[pathname]);
 const [state,setState]=useState({loading:true,tools:{}});
 useEffect(()=>{let alive=true;const load=async()=>{try{const r=await fetch(API+"/admin/tools/status",{cache:"no-store"});const d=await r.json().catch(()=>({}));if(alive)setState({loading:false,tools:d.tools||{}})}catch{if(alive)setState({loading:false,tools:{}})}};load();const t=setInterval(load,15000);return()=>{alive=false;clearInterval(t)}},[]);
 useEffect(()=>{if(state.loading||!routeTool)return;if(state.tools[routeTool]!==false)return;const first=TOOLS.find(([id])=>state.tools[id]!==false)?.[0];navigate(first?"/advanced-tools/"+first:"/advanced-tools",{replace:true})},[state,routeTool,navigate]);
 useEffect(()=>{if(state.loading)return;let aiGenerating=false;
  const generateImage=async()=>{
   const panel=document.querySelector(".advanced-tools .advanced-panel"); if(!panel||aiGenerating)return;
   const form=panel.querySelector(".cf-ai-image-override"); if(!form)return;
   const prompt=form.querySelector("textarea")?.value.trim()||"";
   const size=form.querySelector("select")?.value||"1K";
   const button=form.querySelector("button");
   const output=form.querySelector(".cf-ai-image-output");
   if(!prompt){if(output)output.textContent="Enter an image prompt.";return}
   if(!window.puter?.ai?.txt2img){if(output)output.textContent="Puter.js is still loading. Refresh the page and try again.";return}
   aiGenerating=true;
   if(button){button.disabled=true;button.textContent="Generating…"}
   if(output)output.innerHTML='<div class="cf-ai-loading"><span class="cf-tool-gate-spinner"></span><strong>Generating with Puter.js…</strong></div>';
   try{
    if(window.puter.auth?.isSignedIn&&!window.puter.auth.isSignedIn()) await window.puter.auth.signIn({attempt_temp_user_creation:true});
    const quality=size==="0.5K"?"512":size;
    const image=await window.puter.ai.txt2img({prompt,model:"gemini-3.1-flash-image-preview",provider:"gemini",quality,ratio:{w:1,h:1}});
    if(!(image instanceof HTMLImageElement)||!image.src)throw new Error("Puter returned an invalid image result.");
    if(output)output.innerHTML="";
    image.alt="Generated ConvertFlow image"; image.className="cf-ai-generated-image";
    const actions=document.createElement("div"); actions.className="cf-ai-image-actions";
    const dl=document.createElement("a"); dl.className="cf-ai-download"; dl.href=image.src; dl.download="convertflow-ai-generated.png"; dl.textContent="Download image";
    actions.appendChild(dl); output?.append(image,actions);
   }catch(e){if(output)output.textContent=puterError(e)}
   finally{aiGenerating=false;if(button){button.disabled=false;button.textContent="Generate image"}}
  };
  const addAiForm=()=>{
    const panel=document.querySelector(".advanced-tools .advanced-panel"); if(!panel)return;
    const title=panel.querySelector(".advanced-panel-head h2")?.textContent.trim()||"";
    const isAI=title==="AI Image Generator"&&state.tools["ai-image"]!==false;
    const unavailable=[...panel.querySelectorAll(".advanced-info")].find(el=>/currently unavailable/i.test(el.textContent||""));
    if(unavailable)unavailable.remove();
    const description=panel.querySelector(".advanced-panel-head p");
    if(isAI&&description)description.textContent="Generate images directly with Puter.js — no ConvertFlow image API key required.";
    panel.querySelectorAll(".advanced-run").forEach(btn=>{if(isAI){btn.dataset.cfHiddenByGuard="1";btn.style.display="none"}else if(btn.dataset.cfHiddenByGuard==="1"){btn.style.display="";delete btn.dataset.cfHiddenByGuard}});
    if(!isAI){panel.querySelector(".cf-ai-image-override")?.remove();return}
    if(!panel.querySelector(".cf-ai-image-override")){
      const form=document.createElement("div"); form.className="cf-ai-image-override advanced-ai-form";
      form.innerHTML='<textarea class="advanced-input" rows="6" placeholder="Describe the image you want…"></textarea><select class="advanced-input" aria-label="Image quality"><option>0.5K</option><option selected>1K</option><option>2K</option><option>4K</option></select><button type="button" class="cf-ai-generate-button"><span>Generate image</span></button><div class="cf-ai-image-output" aria-live="polite"></div>';
      panel.querySelector(".advanced-panel-head")?.after(form); form.querySelector("button")?.addEventListener("click",generateImage);
    }
  };
  const sync=()=>{document.querySelectorAll(".advanced-tools .advanced-layout>aside button").forEach(button=>{const id=TOOLS.find(([key,name])=>button.textContent.toLowerCase().includes(name.toLowerCase()))?.[0];if(!id)return;const disabled=state.tools[id]===false;button.hidden=disabled;button.setAttribute("aria-hidden",disabled?"true":"false")});addAiForm()};
  sync(); const observer=new MutationObserver(sync); observer.observe(document.body,{subtree:true,childList:true,characterData:true}); return()=>observer.disconnect()
 },[state.loading,state.tools]);
 if(state.loading&&routeTool)return <div className="cf-tool-gate"><div className="cf-tool-gate-spinner"/><strong>Loading tool availability…</strong></div>;
 if(!state.loading&&routeTool&&state.tools[routeTool]===false)return <div className="cf-tool-gate"><strong>This Advanced Tool is disabled.</strong><span>Returning to the available tools…</span></div>;
 return children;
}

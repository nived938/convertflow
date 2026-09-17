import { useEffect,useMemo,useState } from "react";
import { useLocation,useNavigate } from "react-router-dom";
const API=(import.meta.env.VITE_API_URL||"https://convertflow-backend.onrender.com/api").replace(/\/$/,"");
const TOOLS=[["analyzer","File Information Analyzer"],["duplicates","Duplicate Detector"],["rename","Smart Filename Generator"],["split","File Splitter"],["merge","File Merger"],["contact","Contact Sheet"],["palette","Color Palette Extractor"],["blur","Image Blur"],["pixelate","Image Pixelate"],["qr","QR Generator"],["scan","QR Scanner"],["barcode","Barcode Generator"],["beautify","Screenshot Beautifier"],["favicon","Favicon Generator"],["webp","Animated WebP Converter"],["command","ConvertFlow Command Generator"],["ai-image","AI Image Generator"],["tts","Text to Audio"]];
export default function AdvancedToolAvailabilityGuard({children}){
 const navigate=useNavigate(); const {pathname}=useLocation();
 const routeTool=useMemo(()=>pathname.match(/^\/advanced-tools\/([^/]+)$/)?.[1]||"",[pathname]);
 const [state,setState]=useState({loading:true,tools:{}});
 useEffect(()=>{let alive=true;const load=async()=>{try{const r=await fetch(`${API}/admin/tools/status`,{cache:"no-store"});const d=await r.json().catch(()=>({}));if(alive)setState({loading:false,tools:d.tools||{}})}catch{if(alive)setState({loading:false,tools:{}})}};load();const t=setInterval(load,15000);return()=>{alive=false;clearInterval(t)}},[]);
 useEffect(()=>{if(state.loading||!routeTool)return;if(state.tools[routeTool]!==false)return;const first=TOOLS.find(([id])=>state.tools[id]!==false)?.[0];navigate(first?`/advanced-tools/${first}`:"/advanced-tools",{replace:true})},[state,routeTool,navigate]);
 useEffect(()=>{if(state.loading)return;const sync=()=>{document.querySelectorAll('.advanced-tools .advanced-layout>aside button').forEach(button=>{const id=TOOLS.find(([key,name])=>button.textContent.toLowerCase().includes(name.toLowerCase()))?.[0];if(!id)return;const disabled=state.tools[id]===false;button.hidden=disabled;button.setAttribute('aria-hidden',disabled?'true':'false')});document.querySelectorAll('.advanced-tools .advanced-info').forEach(el=>{if(/currently unavailable/i.test(el.textContent||''))el.remove()})};sync();const observer=new MutationObserver(sync);observer.observe(document.body,{subtree:true,childList:true});return()=>observer.disconnect()},[state.loading,state.tools]);
 if(state.loading&&routeTool)return <div className="cf-tool-gate"><div className="cf-tool-gate-spinner"/><strong>Loading tool availability…</strong></div>;
 if(!state.loading&&routeTool&&state.tools[routeTool]===false)return <div className="cf-tool-gate"><strong>This Advanced Tool is disabled.</strong><span>Returning to the available tools…</span></div>;
 return children;
}

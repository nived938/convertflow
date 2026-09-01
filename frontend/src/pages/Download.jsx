import { useMemo, useState } from "react";
import { Download as DownloadIcon, Monitor, Smartphone, Apple } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "./download.css";

const releases="https://github.com/nived938/convertflow-app/releases/latest/download/";
const platforms=[
 {id:"windows",name:"Windows",description:"Windows 10/11 desktop installer",file:"ConvertFlow-Windows.exe",icon:Monitor},
 {id:"android",name:"Android",description:"Android APK",file:"ConvertFlow-Android.apk",icon:Smartphone},
 {id:"ios",name:"iPhone / iPad",description:"Unsigned iOS simulator build",file:"ConvertFlow-iOS.zip",icon:Apple},
 {id:"mac",name:"macOS",description:"Mac desktop installer",file:"ConvertFlow-macOS.dmg",icon:Apple}
];
function detectOS(){const u=navigator.userAgent||"";if(/iPhone|iPad|iPod/i.test(u))return "ios";if(/Android/i.test(u))return "android";if(/Macintosh|Mac OS X/i.test(u))return "mac";return "windows"}
export default function Download(){const detected=useMemo(detectOS,[]);const [selected,setSelected]=useState(detected);const platform=platforms.find(p=>p.id===selected);const download=()=>{window.location.href=releases+platform.file};return <div className="app"><Header/><main className="download-page"><section className="download-hero"><span>CONVERTFLOW APP</span><h1>Download ConvertFlow</h1><p>Your device was detected automatically. You can switch platforms below.</p><div className="detected">Detected: <strong>{platforms.find(p=>p.id===detected)?.name}</strong></div></section><section className="download-grid">{platforms.map(({id,name,description,file,icon:Icon})=><button key={id} className={`download-card ${selected===id?"selected":""}`} onClick={()=>setSelected(id)}><Icon size={28}/><div><strong>{name}</strong><span>{description}</span><small>{file}</small></div></button>)}</section><section className="download-action"><IconBox icon={platform?.icon}/><div><h2>{platform?.name} version</h2><p>{platform?.description}. The download starts when you press the button.</p></div><button onClick={download}><DownloadIcon size={18}/> Download {platform?.name}</button></section><p className="download-note">Windows and macOS installers plus an Android APK are built automatically by GitHub Actions. The iOS build is currently an unsigned simulator package, because a real iPhone/iPad IPA requires Apple signing credentials.</p></main><Footer/></div>}
function IconBox({icon:Icon}){return Icon?<div className="download-icon"><Icon size={24}/></div>:null}

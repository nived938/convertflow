import fs from "fs";
import path from "path";
const tempDirectory=path.resolve("temp");
export function startTempCleanup(){if(!fs.existsSync(tempDirectory))fs.mkdirSync(tempDirectory,{recursive:true});const clean=()=>{const cutoff=Date.now()-60*60*1000;for(const name of fs.readdirSync(tempDirectory)){const file=path.join(tempDirectory,name);try{const stat=fs.statSync(file);if(stat.isFile()&&stat.mtimeMs<cutoff)fs.unlinkSync(file)}catch{}}};clean();return setInterval(clean,15*60*1000)}

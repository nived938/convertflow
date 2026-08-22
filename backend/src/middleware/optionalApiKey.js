import crypto from "crypto";
const planLimits = { month: 1000, year: 15000, permanent: 50000 };
const apiBurstBuckets = new Map();
async function sb(url,key,path,options={}){return fetch(`${url}${path}`,{...options,headers:{apikey:key,Authorization:`Bearer ${key}`,...(options.headers||{})}})}
export async function optionalApiKey(req,res,next){
  const apiKey=String(req.headers["x-convertflow-api-key"]||req.headers["x-api-key"]||"").trim(); if(!apiKey)return next();
  const url=String(process.env.SUPABASE_URL||"").replace(/\/$/,""); const serviceKey=String(process.env.SUPABASE_SERVICE_ROLE_KEY||"");
  if(!url||!serviceKey)return res.status(503).json({success:false,message:"API licensing is not configured."});
  try{
    const hash=crypto.createHash("sha256").update(apiKey).digest("hex");
    const response=await sb(url,serviceKey,`/rest/v1/convertflow_api_keys?key_hash=eq.${encodeURIComponent(hash)}&revoked_at=is.null&select=id,name,plan,expires_at,usage_count,usage_limit,usage_reset_at`);
    const rows=await response.json().catch(()=>[]); if(!response.ok||!rows[0])return res.status(401).json({success:false,message:"Invalid or revoked ConvertFlow API key."});
    const license=rows[0];
    if(license.expires_at&&new Date(license.expires_at).getTime()<=Date.now()){await sb(url,serviceKey,`/rest/v1/convertflow_api_keys?id=eq.${license.id}`,{method:"DELETE"}).catch(()=>{});return res.status(403).json({success:false,message:"This ConvertFlow API key has expired."});}
    const burstKey=license.id; const now=Date.now(); let bucket=apiBurstBuckets.get(burstKey); if(!bucket||now-bucket.started>=60000)bucket={started:now,count:0}; bucket.count++; apiBurstBuckets.set(burstKey,bucket); if(bucket.count>60){res.set("Retry-After",String(Math.ceil((bucket.started+60000-now)/1000)));return res.status(429).json({success:false,message:"API rate limit reached. Maximum 60 requests per minute."});}
    let usage=Number(license.usage_count||0); let resetAt=license.usage_reset_at?new Date(license.usage_reset_at):null;
    if(resetAt&&resetAt.getTime()<=Date.now()&&license.plan!=="permanent"){usage=0;resetAt=new Date();if(license.plan==="month")resetAt.setMonth(resetAt.getMonth()+1);else resetAt.setFullYear(resetAt.getFullYear()+1);}
    const limit=Number(license.usage_limit||planLimits[license.plan]||1000); if(usage>=limit)return res.status(429).json({success:false,message:`API usage limit reached (${limit} conversions).`});
    const updatedUsage=usage+1;
    await sb(url,serviceKey,`/rest/v1/convertflow_api_keys?id=eq.${license.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({usage_count:updatedUsage,usage_limit:limit,usage_reset_at:resetAt?.toISOString()||null,last_used_at:new Date().toISOString()})}).catch(()=>{});
    await sb(url,serviceKey,"/rest/v1/convertflow_conversion_events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({api_key_id:license.id,source:"api",file_count:Array.isArray(req.files)?req.files.length:1})}).catch(()=>{});
    req.convertflowApiLicense={...license,usage_count:updatedUsage,usage_limit:limit}; return next();
  }catch(error){console.error("API key validation error:",error);return res.status(502).json({success:false,message:"Could not validate the ConvertFlow API key."});}
}

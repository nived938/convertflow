import { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { Link } from "react-router-dom";

const plans=[
  {id:"month",label:"1 month",price:"$1",limit:"1,000 conversions",expiry:"30 days"},
  {id:"year",label:"1 year",price:"$5",limit:"15,000 conversions",expiry:"1 year"},
  {id:"permanent",label:"Permanent",price:"$8",limit:"50,000 conversions",expiry:"Never"}
];

const API_TESTER_URL=import.meta.env.VITE_API_TESTER_URL||"https://convertflow-api-tester.vercel.app";

function buy(plan){
  const subject=`Buying API of ConvertFlow for ${plan.label}`;
  const body=`Hello Nived,\n\nI would like to buy the ConvertFlow API for ${plan.label}.\n\nPlease send me the payment instructions and API access details.\n\nThank you.`;
  const params=new URLSearchParams({to:"nivedsreejaharidasan@gmail.com",su:subject,body});
  const popup=window.open(`https://mail.google.com/mail/?view=cm&fs=1&${params.toString()}`,"_blank","noopener,noreferrer");
  if(!popup)window.location.href=`mailto:nivedsreejaharidasan@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default function Api(){
  const [openingTester,setOpeningTester]=useState(false);
  function openTester(){
    setOpeningTester(true);
    window.location.href=API_TESTER_URL;
  }

  return <div className="app"><Header/>
    <main style={{width:"min(1000px,calc(100% - 32px))",margin:"0 auto",padding:"80px 0"}}>
      <section style={{textAlign:"center",maxWidth:760,margin:"0 auto 38px"}}>
        <span className="section-label">CONVERTFLOW API</span>
        <h1 style={{fontSize:"clamp(38px,7vw,68px)",margin:"12px 0 18px"}}>Build with ConvertFlow</h1>
        <p style={{fontSize:17,lineHeight:1.7,opacity:.65}}>Add image, video and audio conversion to your own applications and workflows. No account system is required for API customers.</p>
        <div style={{display:"flex",justifyContent:"center",gap:10,flexWrap:"wrap",marginTop:22}}>
          <Link className="auth-submit" style={{display:"inline-flex",width:"auto"}} to="/api/docs">Read API documentation</Link>
          <button className="header-signup" style={{border:0,cursor:"pointer",width:"auto",padding:"12px 20px"}} disabled={openingTester} onClick={openTester}>{openingTester?"Opening tester...":"Open API Tester ↗"}</button>
        </div>
        <p style={{fontSize:12,opacity:.45,marginTop:12}}>The API tester is a separate site. Your test key is not stored after a refresh.</p>
      </section>

      <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:16}}>
        {plans.map(plan=><article key={plan.id} style={{padding:28,border:"1px solid var(--border,#273244)",borderRadius:22,background:"rgba(255,255,255,.03)"}}>
          <p style={{margin:0,opacity:.55}}>{plan.label}</p>
          <h2 style={{fontSize:42,margin:"8px 0 12px"}}>{plan.price}</h2>
          <p style={{opacity:.65}}>{plan.limit}</p>
          <p style={{opacity:.6,minHeight:52}}>Managed API access for your project.</p>
          <button className="header-signup" style={{border:0,cursor:"pointer",width:"auto",padding:"12px 18px"}} onClick={()=>buy(plan)}>Contact us to buy</button>
        </article>)}
      </section>

      <table className="plan-table"><thead><tr><th>Feature</th><th>1 month</th><th>1 year</th><th>Permanent</th></tr></thead><tbody>
        <tr><td>API access</td><td>✓</td><td>✓</td><td>✓</td></tr>
        <tr><td>Conversions</td><td>1,000</td><td>15,000</td><td>50,000</td></tr>
        <tr><td>Expiration</td><td>30 days</td><td>1 year</td><td>Never</td></tr>
        <tr><td>Usage tracking</td><td>✓</td><td>✓</td><td>✓</td></tr>
      </tbody></table>
      <p style={{textAlign:"center",marginTop:34,opacity:.5}}>Email: nivedsreejaharidasan@gmail.com</p>
    </main>
    <Footer/>
  </div>;
}

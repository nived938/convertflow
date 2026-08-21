import Header from "../components/Header";
import Footer from "../components/Footer";
const services=["Website","Image Converter","Video Converter","Audio Converter","API"];
export default function Status(){return <div className="app"><Header/><main className="content-page"><span className="section-label">SYSTEM STATUS</span><h1>ConvertFlow Status</h1><p>Current service availability at a glance.</p><div className="status-list">{services.map(name=><div className="info-card status-row" key={name}><div><strong>{name}</strong><span>Operational</span></div><b>✓</b></div>)}</div><p style={{opacity:.55,marginTop:24}}>If a conversion is failing, please include the input format, output format and error message when contacting us.</p></main><Footer/></div>}

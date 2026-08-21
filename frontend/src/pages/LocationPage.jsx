import { Link, useParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

const locations = { india: "India", kerala: "Kerala" };
export default function LocationPage(){const {location="india"}=useParams();const name=locations[location]||"India";return <div className="app"><Header/><main className="content-page"><span className="section-label">ONLINE FILE CONVERTER</span><h1>Free file converter for users in {name}</h1><p>Convert supported image, video, and audio files online from any modern browser. ConvertFlow does not require an account.</p><div className="info-card"><h2>Fast access from {name}</h2><p>Use the same conversion tools on desktop, tablet, or mobile. Choose a format, upload your file, and download the converted result.</p><Link className="auth-submit" to="/convert">Open ConvertFlow</Link></div><p>See our <Link to="/faq">FAQ</Link>, <Link to="/services/image">image converter</Link>, and <Link to="/services/video">video converter</Link> pages for more information.</p></main><Footer/></div>}

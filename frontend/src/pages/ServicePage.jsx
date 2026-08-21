import { Link, useParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";

const services = {
  image: { title: "Free Image Converter", text: "Convert common image files quickly between popular formats without creating an account.", formats: "JPG, JPEG, PNG, WebP, GIF, BMP, TIFF, AVIF, ICO, HEIC" },
  video: { title: "Free Video Converter", text: "Convert common video files for playback, sharing, editing, and web use.", formats: "MP4, WebM, AVI, MKV, MOV, FLV, MPEG, MPG, M4V, TS, 3GP, OGV" },
  audio: { title: "Free Audio Converter", text: "Convert common audio files into practical formats for devices, editing, and sharing.", formats: "MP3, WAV, AAC, OGG, FLAC, M4A, OPUS, AIFF, AC3, AMR, WMA" },
};
export default function ServicePage(){const {type="image"}=useParams();const service=services[type]||services.image;return <div className="app"><Header/><main className="content-page"><span className="section-label">CONVERT ONLINE</span><h1>{service.title}</h1><p>{service.text}</p><div className="info-card"><h2>Supported output formats</h2><p>{service.formats}</p><Link className="auth-submit" style={{ marginTop: 30 }} to="/convert">Start converting</Link></div><h2>Simple and account-free</h2><p>Upload your file, select the output format, convert it, and download the result. No login is required.</p></main><Footer/></div>}

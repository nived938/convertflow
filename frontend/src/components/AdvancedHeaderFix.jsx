import { ArrowLeft } from "lucide-react";
import { useLocation,useNavigate } from "react-router-dom";
export default function AdvancedHeaderFix(){const nav=useNavigate(),{pathname}=useLocation();if(!/^\/advanced-tools\/[^/]+$/.test(pathname))return null;return <div className="cf-advanced-header-fix" aria-label="Advanced tool navigation"><button type="button" onClick={()=>nav("/advanced-tools")}><ArrowLeft size={16}/> All Tools</button><i className="cf-header-divider" aria-hidden="true"/><span>UTILITY</span></div>}

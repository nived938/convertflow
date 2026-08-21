import Header from "../components/Header";
import Footer from "../components/Footer";

const code = `curl -X POST https://convertflow-backend.onrender.com/api/conversion/convert \\
  -H "X-ConvertFlow-API-Key: cf_live_xxxxx" \\
  -F "file=@image.png" \\
  -F "outputFormat=jpg"`;

export default function ApiDocs(){return <div className="app"><Header/><main className="content-page"><span className="section-label">API DOCUMENTATION</span><h1>Build with ConvertFlow</h1><p>Use your ConvertFlow API key to add file conversion to your own apps, scripts and workflows.</p><div className="info-card"><h2>Authentication</h2><p>Send your API key in the <code>X-ConvertFlow-API-Key</code> header.</p><pre className="api-code"><code>{code}</code></pre><button className="auth-submit" style={{display:"inline-flex",width:"auto"}} onClick={()=>navigator.clipboard?.writeText(code)}>Copy example</button></div><div className="info-card"><h2>Convert a file</h2><p><code>POST /api/conversion/convert</code></p><p>Form fields: <code>file</code> and <code>outputFormat</code>. Maximum file size is 100 MB.</p></div><div className="info-card"><h2>Batch conversion</h2><p><code>POST /api/conversion/convert-batch</code></p><p>Send multiple files with <code>files</code> and a JSON <code>outputFormats</code> array in the same order.</p></div><div className="info-card"><h2>Errors</h2><p>401 means the API key is invalid, 403 means it has expired or reached a restricted state, 413 means the file is too large, and 429 means the request limit has been reached.</p></div><div className="info-card"><h2>Plans and limits</h2><p>1 month: 1,000 conversions. 1 year: 15,000 conversions. Permanent: 50,000 conversions. Limits can be changed by ConvertFlow administration.</p></div></main><Footer/></div>}

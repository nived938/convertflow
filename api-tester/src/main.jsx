import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

const API_BASE = (import.meta.env.VITE_API_URL || "https://convertflow-backend.onrender.com/api").replace(/\/$/, "");
const formats = ["jpg", "png", "webp", "gif", "pdf", "mp3", "wav", "mp4", "webm"];

function App() {
  const fileRef = useRef(null);
  const [apiKey, setApiKey] = useState("");
  const [format, setFormat] = useState("jpg");
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [testing, setTesting] = useState(false);

  function chooseFile(next) {
    const selected = next?.[0];
    if (!selected) return;
    if (selected.size > 100 * 1024 * 1024) {
      setStatus({ type: "error", text: "That file is larger than the 100 MB API limit." });
      return;
    }
    setFile(selected);
    setStatus(null);
  }

  async function testApi() {
    if (!apiKey.trim()) return setStatus({ type: "error", text: "Enter your ConvertFlow API key first." });
    if (!file) return setStatus({ type: "error", text: "Choose a file to test the API." });

    setTesting(true);
    setStatus({ type: "working", text: "Uploading and converting..." });
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("outputFormat", format);
      const response = await fetch(`${API_BASE}/conversion/convert`, {
        method: "POST",
        headers: { "X-ConvertFlow-API-Key": apiKey.trim() },
        body: form
      });

      if (!response.ok) {
        let message = `Request failed with HTTP ${response.status}.`;
        try {
          const data = await response.json();
          if (data?.message) message = data.message;
        } catch {
          const text = await response.text().catch(() => "");
          if (text) message = text.slice(0, 300);
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `convertflow-api-test.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus({ type: "success", text: "API test passed. The converted file was downloaded." });
    } catch (error) {
      setStatus({ type: "error", text: error.message || "The API request failed." });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="tester-shell">
      <header className="tester-header">
        <div className="brand-mark">CF</div>
        <div>
          <strong>ConvertFlow</strong>
          <span>API Test Console</span>
        </div>
        <a href="https://convertflow-seven-delta.vercel.app/" target="_blank" rel="noreferrer">Main website ↗</a>
      </header>

      <main className="console">
        <section className="intro">
          <div className="eyebrow">DEVELOPER CONSOLE</div>
          <h1>Test your API key.</h1>
          <p>Paste a ConvertFlow API key, upload a file, choose an output format, and run a real conversion request.</p>
        </section>

        <section className="panel">
          <div className="panel-title"><span>01</span><div><h2>API credentials</h2><p>Your key exists only in this page session.</p></div></div>
          <label className="field-label" htmlFor="api-key">ConvertFlow API key</label>
          <input id="api-key" className="key-input" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="cf_live_..." autoComplete="off" spellCheck="false" />
          <div className="privacy-note"><span>●</span> Nothing is saved to localStorage, cookies, or the server. Refreshing this page clears the key.</div>
        </section>

        <section className="panel">
          <div className="panel-title"><span>02</span><div><h2>Conversion test</h2><p>Use the same conversion endpoint available to API customers.</p></div></div>
          <div className={`dropzone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files); }} onClick={() => fileRef.current?.click()}>
            <input ref={fileRef} type="file" hidden onChange={(event) => chooseFile(event.target.files)} />
            <div className="upload-icon">↑</div>
            {file ? <><strong>{file.name}</strong><span>{(file.size / 1024 / 1024).toFixed(2)} MB · Click to replace</span></> : <><strong>Drop a file here</strong><span>or click to browse · maximum 100 MB</span></>}
          </div>

          <div className="controls">
            <div className="format-control"><label className="field-label" htmlFor="format">Output format</label><select id="format" value={format} onChange={(event) => setFormat(event.target.value)}>{formats.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}</select></div>
            <button className="run-button" disabled={testing} onClick={testApi}>{testing ? "Testing API..." : "Run API test →"}</button>
          </div>

          {status && <div className={`status ${status.type}`} role="status">{status.type === "success" ? "✓" : status.type === "error" ? "!" : "…"}<span>{status.text}</span></div>}
        </section>

        <section className="how-it-works">
          <div><span>1</span><p>Enter the API key you received from ConvertFlow.</p></div>
          <div><span>2</span><p>Upload a file and select the format you want.</p></div>
          <div><span>3</span><p>The tester calls the live API and downloads the result.</p></div>
        </section>
      </main>

      <footer>ConvertFlow API Test Console · Keys are intentionally not persisted in the browser.</footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);

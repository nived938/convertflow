import { useState } from "react";
import DropZone from "./DropZone";
import FormatSelector from "./FormatSelector";
import FileQueue from "./FileQueue";
import { detectFormat } from "../data/formats";
import { downloadJobFile, downloadJobZip, createConversionJob, getJob } from "../services/api";

function getDefaultOutputFormat(file) {
  const detected = detectFormat(file.name);
  if (!detected) return "png";
  if (detected.category === "image") return detected.id === "jpg" || detected.id === "jpeg" ? "png" : "jpg";
  if (detected.category === "video") return detected.id === "mp4" ? "webm" : "mp4";
  if (detected.category === "audio") return detected.id === "mp3" ? "wav" : "mp3";
  return "png";
}

function createFileItem(file) {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, file, outputFormat: getDefaultOutputFormat(file), progress: 0, status: "waiting", downloadUrl: null, downloadName: null, outputSize: null, error: null };
}

export default function Converter() {
  const [files, setFiles] = useState([]), [converting, setConverting] = useState(false), [completed, setCompleted] = useState(false), [error, setError] = useState(""), [jobId, setJobId] = useState(null), [jobStatus, setJobStatus] = useState("idle"), [jobProgress, setJobProgress] = useState(0), [zipReady, setZipReady] = useState(false);

  const handleFilesSelected = (selected) => { if (!selected?.length) return; setFiles((current) => [...current, ...selected.map(createFileItem)]); setError(""); setCompleted(false); };
  const removeFile = (id) => setFiles((current) => current.filter((item) => item.id !== id));
  const updateFile = (id, updates) => setFiles((current) => current.map((item) => item.id === id ? { ...item, ...updates } : item));

  const monitorJob = async (currentJobId, startedAt = Date.now()) => {
    try {
      if (Date.now() - startedAt > 120000) throw new Error("Conversion timed out after 2 minutes. Please try again with a smaller file or a different format.");
      const job = await getJob(currentJobId);
      setJobStatus(job.status); setJobProgress(job.progress);
      setFiles((current) => current.map((item, index) => {
        const serverFile = job.files?.[index]; if (!serverFile) return item;
        return { ...item, status: serverFile.status, progress: serverFile.progress, error: serverFile.error, downloadName: serverFile.outputName, outputSize: serverFile.outputSize || serverFile.size || null };
      }));
      if (job.status === "completed" || job.status === "completed_with_errors") { setJobProgress(100); setZipReady(!!job.downloadReady); setCompleted(true); setConverting(false); return; }
      if (job.status === "failed") { setError(job.error || "The conversion failed. Please check the file and output format and try again."); setConverting(false); return; }
      window.setTimeout(() => monitorJob(currentJobId, startedAt), 1000);
    } catch (e) { console.error(e); setError(e.message || "Could not check conversion status."); setJobStatus("failed"); setConverting(false); }
  };

  const startConversion = async () => {
    if (!files.length) return setError("Please select at least one file.");
    setError(""); setCompleted(false); setConverting(true); setZipReady(false); setJobProgress(0); setJobStatus("uploading");
    files.forEach((item) => updateFile(item.id, { status: "queued", progress: 0, error: null }));
    try {
      const response = await createConversionJob(files, (p) => setJobProgress(Math.round(p * 0.2)));
      const id = response.job.id; setJobId(id); setJobStatus("queued"); await monitorJob(id);
    } catch (e) { console.error(e); setError(e.message || "Could not start conversion. Please try again."); setJobStatus("failed"); setConverting(false); }
  };

  const downloadFile = async (item, index) => {
    if (!jobId || item.status !== "completed") return;
    try {
      const job = await getJob(jobId), serverFile = job.files?.[index];
      if (!serverFile?.id) throw new Error("Converted file is not available.");
      const blob = await downloadJobFile(jobId, serverFile.id), url = URL.createObjectURL(blob), link = document.createElement("a");
      link.href = url; link.download = item.downloadName || item.file.name; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    } catch (e) { setError(e.message || "Could not download the converted file."); }
  };
  const downloadZip = async () => {
    if (!jobId || !zipReady) return;
    try { const blob = await downloadJobZip(jobId), url = URL.createObjectURL(blob), link = document.createElement("a"); link.href = url; link.download = "convertflow-files.zip"; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); } catch (e) { setError(e.message || "Could not download ZIP."); }
  };
  const share = async () => {
    const data = { title: "ConvertFlow", text: "I just converted a file with ConvertFlow.", url: window.location.origin };
    try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(window.location.origin); setError("ConvertFlow link copied to your clipboard."); } } catch (e) { if (e?.name !== "AbortError") setError("Could not open sharing."); }
  };
  const resetConverter = () => { setFiles([]); setConverting(false); setCompleted(false); setError(""); setJobId(null); setJobStatus("idle"); setJobProgress(0); setZipReady(false); };
  const completedCount = files.filter((item) => item.status === "completed").length;

  return <section className="converter-section">
    <div className="section-heading"><span className="section-label">FILE CONVERTER</span><h2>Convert your files</h2><p>Convert multiple files quickly and securely.</p></div>
    <div className="converter-card">
      {!files.length ? <DropZone onFilesSelected={handleFilesSelected} /> : <>
        <FileQueue files={files} onRemove={removeFile} />
        {!converting && !completed && <>
          <div className="multi-file-options"><span>Select an output format for each file above.</span></div>
          {files.map((item) => <div className="file-format-row" key={item.id}><div className="file-format-name"><strong>{item.file.name}</strong><span>{detectFormat(item.file.name)?.name || "Unknown"}</span></div><FormatSelector file={item.file} value={item.outputFormat} onChange={(format) => updateFile(item.id, { outputFormat: format })} /></div>)}
          {error && <div className="conversion-error"><strong>Unable to convert</strong><span>{error}</span></div>}
          <button className="convert-button" onClick={startConversion}>Convert all files</button>
          <button className="add-more-button" onClick={() => setFiles([])}>Clear files</button>
        </>}
        {converting && <div className="conversion-list"><div className="conversion-job-status"><span className="section-label">{jobStatus === "uploading" ? "UPLOADING" : "CONVERTING"}</span><strong>{jobStatus === "uploading" ? "Uploading your files..." : "Converting your files..."}</strong><span>{jobProgress}%</span></div><div className="progress-track job-progress"><div className="progress-fill" style={{ width: `${jobProgress}%` }} /></div>{files.map((item) => <div className="conversion-item" key={item.id}><div className="conversion-item-top"><div><strong>{item.file.name}</strong><span>{item.outputFormat.toUpperCase()}</span></div><span>{item.status === "completed" ? "✓" : item.status === "failed" ? "!" : `${item.progress}%`}</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${item.progress}%` }} /></div></div>)}</div>}
        {completed && <div className="conversion-results"><div className="results-header"><span className="section-label">CONVERSION COMPLETE</span><h3>{completedCount} of {files.length} files converted</h3></div>{error && <div className="conversion-error"><strong>Notice</strong><span>{error}</span></div>}{files.map((item, index) => <div className="result-item" key={item.id}><div><strong>{item.downloadName || item.file.name}</strong><span>{item.status === "completed" ? `${item.outputSize ? `${Math.round(item.outputSize / 1024)} KB · ` : ""}Ready to download` : item.error || "Conversion failed"}</span></div>{item.status === "completed" && <button className="download-button small" onClick={() => downloadFile(item, index)}>↓ Download</button>}</div>)}<button className="download-button" onClick={downloadZip}>↓ Download all as ZIP</button><div className="result-actions"><button className="cancel-button" onClick={share}>Share ConvertFlow</button><button className="cancel-button" onClick={resetConverter}>Convert more files</button></div></div>}
      </>}
    </div>
  </section>;
}

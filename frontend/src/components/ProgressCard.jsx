import { useEffect, useState } from "react";
import { CheckCircle2, Download, LoaderCircle, XCircle } from "lucide-react";

export default function ProgressCard({
  file,
  progress = 0,
  status = "processing",
  onDownload,
  onCancel,
}) {
  const isComplete = status === "complete";
  const isFailed = status === "failed";
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    if (isComplete || isFailed) {
      setStalled(false);
      return undefined;
    }
    setStalled(false);
    const timer = window.setTimeout(() => setStalled(true), 2000);
    return () => window.clearTimeout(timer);
  }, [progress, status, isComplete, isFailed]);

  const showSpinner = !isComplete && !isFailed && stalled;

  return (
    <div className="progress-card">
      <div className="progress-top">
        <div className="progress-file">
          <div className="progress-file-icon">
            {isComplete ? <CheckCircle2 size={21} /> : isFailed ? <XCircle size={21} /> : <LoaderCircle size={21} className="spin" />}
          </div>
          <div>
            <strong>{file?.name || "File"}</strong>
            <span>
              {isComplete ? "Conversion complete" : isFailed ? "Conversion failed" : showSpinner ? "Still processing..." : "Converting your file..."}
            </span>
          </div>
        </div>
        <span className={`progress-percentage ${showSpinner ? "progress-stalled" : ""}`} aria-label={showSpinner ? "Processing is still active" : `${Math.round(progress)} percent complete`}>
          {showSpinner ? <LoaderCircle size={20} className="spin" /> : `${Math.round(progress)}%`}
        </span>
      </div>
      <div className="progress-track">
        <div className={`progress-fill ${isComplete ? "complete" : isFailed ? "failed" : ""}`} style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
      </div>
      {isComplete && <button className="download-button" onClick={onDownload}><Download size={17} />Download file</button>}
      {!isComplete && !isFailed && <button className="cancel-button" onClick={onCancel}>Cancel conversion</button>}
    </div>
  );
}

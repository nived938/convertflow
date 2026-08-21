import { useEffect, useState } from "react";

function formatSize(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function FileQueue({ files, onRemove }) {
  return (
    <div className="file-queue">
      <div className="file-queue-header">
        <span className="section-label">FILES</span>
        <span>{files.length} {files.length === 1 ? "file" : "files"}</span>
      </div>
      <div className="file-list">
        {files.map((item) => <QueueItem key={item.id} item={item} onRemove={onRemove} />)}
      </div>
    </div>
  );
}

function QueueItem({ item, onRemove }) {
  const [preview, setPreview] = useState("");
  const isImage = item.file.type?.startsWith("image/");

  useEffect(() => {
    if (!isImage) return undefined;
    const url = URL.createObjectURL(item.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [item.file, isImage]);

  const inputSize = item.file.size;
  const outputSize = item.outputSize || null;
  const savings = outputSize && inputSize ? Math.round((1 - outputSize / inputSize) * 100) : null;

  return <div className="file-item">
    <div className="file-icon file-preview-icon">
      {preview ? <img src={preview} alt="" /> : item.file.name.split(".").pop().toUpperCase()}
    </div>
    <div className="file-info">
      <strong title={item.file.name}>{item.file.name}</strong>
      <span>{formatSize(inputSize)}{outputSize ? ` → ${formatSize(outputSize)}` : ""}</span>
      {savings !== null && <small className={savings > 0 ? "size-saving" : "size-increase"}>{savings > 0 ? `${savings}% smaller` : savings < 0 ? `${Math.abs(savings)}% larger` : "Same size"}</small>}
    </div>
    <button className="file-remove" onClick={() => onRemove(item.id)} disabled={item.status === "converting"} aria-label={`Remove ${item.file.name}`}>×</button>
  </div>;
}

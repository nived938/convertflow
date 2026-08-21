import { useRef, useState } from "react";
import { CloudUpload, FilePlus, ShieldCheck, X } from "lucide-react";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

export default function DropZone({ onFilesSelected }) {
  const inputRef = useRef(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");

  const processFiles = (files) => {
    const selectedFiles = Array.from(files || []);
    const oversized = selectedFiles.filter((file) => file.size > MAX_FILE_SIZE);
    if (oversized.length) {
      setMessage(`${oversized.length} file${oversized.length === 1 ? "" : "s"} exceed the 100 MB limit.`);
    } else {
      setMessage("");
    }
    const accepted = selectedFiles.filter((file) => file.size <= MAX_FILE_SIZE);
    if (accepted.length) onFilesSelected(accepted);
  };

  const handleInput = (event) => {
    processFiles(event.target.files);
    event.target.value = "";
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current += 1;
    setDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragging(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    setDragging(false);
    processFiles(event.dataTransfer.files);
  };

  return (
    <div
      className={`drop-zone ${dragging ? "dragging" : ""}`}
      onDragEnter={handleDragEnter}
      onDragOver={(event) => { event.preventDefault(); event.stopPropagation(); setDragging(true); }}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
      }}
    >
      <input ref={inputRef} type="file" multiple hidden onChange={handleInput} />

      <div className="upload-icon"><CloudUpload size={42} /></div>

      <h2>{dragging ? "Drop files to upload" : "Select your file to convert"}</h2>
      <p>{dragging ? "Release to start uploading" : "or drag and drop your files here"}</p>

      <button className="browse-button" onClick={(event) => { event.stopPropagation(); inputRef.current?.click(); }}>
        <FilePlus size={17} /> Choose files
      </button>

      <span className="upload-hint">Multiple files supported · Maximum 100 MB per file</span>

      <div className="upload-security"><ShieldCheck size={14} /> Files are processed temporarily and cleaned up automatically</div>

      {message && <div className="drop-error" onClick={(event) => event.stopPropagation()}>
        <X size={15} /> {message}
      </div>}
    </div>
  );
}

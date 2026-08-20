import { useRef, useState } from "react";
import {
  CloudUpload,
  FilePlus,
} from "lucide-react";

export default function DropZone({ onFilesSelected }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const processFiles = (files) => {
    const selectedFiles = Array.from(files);

    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles);
    }
  };

  const handleInput = (event) => {
    processFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);

    processFiles(event.dataTransfer.files);
  };

  return (
    <div
      className={`drop-zone ${dragging ? "dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={handleInput}
      />

      <div className="upload-icon">
        <CloudUpload size={42} />
      </div>

      <h2>Select your file to convert</h2>

      <p>
        or drop your file here
      </p>

      <button
        className="browse-button"
        onClick={(event) => {
          event.stopPropagation();
          inputRef.current?.click();
        }}
      >
        <FilePlus size={17} />
        Choose files
      </button>

      <span className="upload-hint">
        Multiple files supported
      </span>
    </div>
  );
}
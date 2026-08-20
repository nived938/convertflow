import { useState } from "react";

import DropZone from "./DropZone";
import FormatSelector from "./FormatSelector";
import FileQueue from "./FileQueue";

import {
  detectFormat,
} from "../data/formats";

import {
  downloadJobFile,
  downloadJobZip,
} from "../services/api";

import {
  createConversionJob,
  getJob,
} from "../services/api";

function getDefaultOutputFormat(file) {
  const detected = detectFormat(file.name);

  if (!detected) {
    return "png";
  }

  if (detected.category === "image") {
    if (
      detected.id === "jpg" ||
      detected.id === "jpeg"
    ) {
      return "png";
    }

    return "jpg";
  }

  if (detected.category === "video") {
    if (detected.id === "mp4") {
      return "webm";
    }

    return "mp4";
  }

  if (detected.category === "audio") {
    if (detected.id === "mp3") {
      return "wav";
    }

    return "mp3";
  }

  return "png";
}

function createFileItem(file) {
  return {
    id:
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`,

    file,

    outputFormat:
      getDefaultOutputFormat(file),

    progress: 0,

    status: "waiting",

    outputBlob: null,

    downloadUrl: null,

    downloadName: null,

    error: null,
  };
}

export default function Converter() {
  const [files, setFiles] = useState([]);

  const [converting, setConverting] =
    useState(false);

  const [completed, setCompleted] =
    useState(false);

  const [error, setError] =
    useState("");

  const [jobId, setJobId] = useState(null);

  const [jobStatus, setJobStatus] =
    useState("idle");

  const [jobProgress, setJobProgress] =
    useState(0);

  const [zipReady, setZipReady] =
    useState(false);

  const handleFilesSelected = (
    selectedFiles
  ) => {
    if (
      !selectedFiles ||
      selectedFiles.length === 0
    ) {
      return;
    }

    const newFiles =
      selectedFiles.map(createFileItem);

    setFiles((current) => [
      ...current,
      ...newFiles,
    ]);

    setError("");
    setCompleted(false);
  };

  const removeFile = (id) => {
    setFiles((current) =>
      current.filter(
        (item) => item.id !== id
      )
    );
  };

  const updateFile = (
    id,
    updates
  ) => {
    setFiles((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...updates,
            }
          : item
      )
    );
  };

  const startConversion = async () => {
  if (files.length === 0) {
    setError(
      "Please select at least one file."
    );

    return;
  }

  setError("");
  setCompleted(false);
  setConverting(true);
  setZipReady(false);
  setJobProgress(0);
  setJobStatus("uploading");

  files.forEach((item) => {
    updateFile(item.id, {
      status: "queued",
      progress: 0,
      error: null,
    });
  });

  try {
    const response =
      await createConversionJob(
        files,
        (uploadProgress) => {
          setJobProgress(
            Math.round(
              uploadProgress * 0.2
            )
          );
        }
      );

    const newJobId =
      response.job.id;

    setJobId(newJobId);
    setJobStatus("queued");

    await monitorJob(newJobId);
  } catch (conversionError) {
    console.error(
      "Could not create conversion job:",
      conversionError
    );

    setError(
      conversionError.message ||
        "Could not start conversion."
    );

    setJobStatus("failed");
    setConverting(false);
  }
};

  const monitorJob = async (
    currentJobId
  ) => {
  try {
    const job =
      await getJob(
        currentJobId
      );

    setJobStatus(
      job.status
    );

    setJobProgress(
      job.progress
    );

    setFiles((current) =>
      current.map((item, index) => {
        const serverFile = job.files[index];

        if (!serverFile) {
          return item;
        }

        return {
          ...item,

          status:
            serverFile.status,

          progress:
            serverFile.progress,

          error:
            serverFile.error,

          downloadName:
            serverFile.outputName,
        };
      })
    );

    if (
      job.status ===
        "completed" ||
      job.status ===
        "completed_with_errors"
    ) {
      setJobStatus(
        job.status
      );

      setJobProgress(100);

      setZipReady(
        job.downloadReady
      );

      setCompleted(true);
      setConverting(false);

      return;
    }

    if (
      job.status ===
        "failed"
    ) {
      setJobStatus("failed");

      setConverting(false);

      setError(
        "The conversion job failed."
      );

      return;
    }

    setTimeout(() => {
      monitorJob(
        currentJobId
      );
    }, 1000);
  } catch (error) {
    console.error(
      "Job status error:",
      error
    );

    setError(
      error.message ||
        "Could not check conversion status."
    );

    setConverting(false);
  }
};

  const downloadFile = async (item, index) => {
    if (!jobId || item.status !== "completed") {
      return;
    }

    try {
      const job = await getJob(jobId);
      const serverFile = job.files[index];

      if (!serverFile?.id) {
        throw new Error("Converted file is not available.");
      }

      const blob = await downloadJobFile(jobId, serverFile.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = item.downloadName || item.file.name;

      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error("File download failed:", downloadError);

      setError(
        downloadError.message || "Could not download the converted file."
      );
    }
  };

  const downloadZip = async () => {
  if (!jobId || !zipReady) {
    return;
  }

  try {
    const blob =
      await downloadJobZip(
        jobId
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      "convertflow-files.zip";

    document.body.appendChild(
      link
    );

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error(
      "ZIP download failed:",
      error
    );

    setError(
      error.message ||
        "Could not download ZIP."
    );
  }
};

  const resetConverter = () => {
    files.forEach((item) => {
      if (item.downloadUrl) {
        URL.revokeObjectURL(
          item.downloadUrl
        );
      }
    });

    setFiles([]);
    setConverting(false);
    setCompleted(false);
    setError("");
    setJobId(null);
    setJobStatus("idle");
    setJobProgress(0);
    setZipReady(false);
  };

  const completedCount =
    files.filter(
      (item) =>
        item.status === "completed"
    ).length;

  return (
    <section className="converter-section">

      <div className="section-heading">

        <span className="section-label">
          FILE CONVERTER
        </span>

        <h2>
          Convert your files
        </h2>

        <p>
          Convert multiple files quickly
          and securely.
        </p>

      </div>

      <div className="converter-card">

        {files.length === 0 ? (
          <DropZone
            onFilesSelected={
              handleFilesSelected
            }
          />
        ) : (
          <>
            <FileQueue
              files={files}
              onRemove={removeFile}
            />

            {!converting &&
              !completed && (
                <>
                  <div className="multi-file-options">

                    <span>
                      Select an output format
                      for each file above.
                    </span>

                  </div>

                  {files.map((item) => (
                    <div
                      className="file-format-row"
                      key={item.id}
                    >
                      <div className="file-format-name">

                        <strong>
                          {item.file.name}
                        </strong>

                        <span>
                          {detectFormat(
                            item.file.name
                          )?.name ||
                            "Unknown"}
                        </span>

                      </div>

                      <FormatSelector
                        file={item.file}
                        value={
                          item.outputFormat
                        }
                        onChange={(format) =>
                          updateFile(
                            item.id,
                            {
                              outputFormat:
                                format,
                            }
                          )
                        }
                      />

                    </div>
                  ))}

                  {error && (
                    <div className="conversion-error">

                      <strong>
                        Error
                      </strong>

                      <span>
                        {error}
                      </span>

                    </div>
                  )}

                  <button
                    className="convert-button"
                    onClick={
                      startConversion
                    }
                  >
                    Convert all files
                  </button>

                  <button
                    className="add-more-button"
                    onClick={() =>
                      setFiles([])
                    }
                  >
                    Clear files
                  </button>

                </>
              )}

            {converting && (
  <div className="conversion-list">

    <div className="conversion-job-status">

      <span className="section-label">
        {jobStatus === "uploading"
          ? "UPLOADING"
          : "CONVERTING"}
      </span>

      <strong>
        {jobStatus === "uploading"
          ? "Uploading your files..."
          : "Converting your files..."}
      </strong>

      <span>
        {jobProgress}%
      </span>

    </div>

    <div className="progress-track job-progress">

      <div
        className="progress-fill"
        style={{
          width:
            `${jobProgress}%`,
        }}
      />

    </div>

    {files.map((item) => (
      <div
        className="conversion-item"
        key={item.id}
      >

        <div className="conversion-item-top">

          <div>

            <strong>
              {item.file.name}
            </strong>

            <span>
              {item.outputFormat.toUpperCase()}
            </span>

          </div>

          <span>
            {item.status ===
            "completed"
              ? "✓"
              : item.status ===
                "failed"
                ? "!"
                : `${item.progress}%`}
          </span>

        </div>

        <div className="progress-track">

          <div
            className="progress-fill"
            style={{
              width:
                `${item.progress}%`,
            }}
          />

        </div>

      </div>
    ))}

  </div>
)}

            {completed && (
              <div className="conversion-results">

                <div className="results-header">

                  <span className="section-label">
                    CONVERSION COMPLETE
                  </span>

                  <h3>
                    {completedCount} of{" "}
                    {files.length} files
                    converted
                  </h3>

                </div>

                {files.map((item, index) => (
                  <div
                    className="result-item"
                    key={item.id}
                  >

                    <div>

                      <strong>
                        {item.downloadName ||
                          item.file.name}
                      </strong>

                      <span>
                        {item.status ===
                        "completed"
                          ? "Ready to download"
                          : item.error ||
                            "Conversion failed"}
                      </span>

                    </div>

                    {item.status ===
                      "completed" && (
                      <button
                        className="download-button small"
                        onClick={() =>
                          downloadFile(item, index)
                        }
                      >
                        ↓ Download
                      </button>
                    )}

                  </div>
                ))}
                <button
                  className="download-button"
                  onClick={downloadZip}
                >
                  ↓ Download all as ZIP
                </button>

                <button
                  className="cancel-button"
                  onClick={resetConverter}
                >
                  Convert more files
                </button>

              </div>
            )
            }
          </>
        )}

      </div>

    </section>
  );
}

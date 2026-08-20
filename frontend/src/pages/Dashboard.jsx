import {
  useEffect,
  useState,
} from "react";

import Header from "../components/Header";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import {
  deleteMyJob,
  downloadJobZip,
  getMyJobs,
} from "../services/api";

function formatDate(date) {
  if (!date) {
    return "-";
  }

  return new Date(date).toLocaleString();
}

function getExtension(filename) {
  const extension = filename?.split(".").pop();

  return extension && extension !== filename
    ? extension.toUpperCase()
    : "FILE";
}

function statusLabel(status) {
  const labels = {
    completed: "Completed",
    completed_with_errors: "Completed with errors",
    processing: "Processing",
    creating_archive: "Creating ZIP",
    queued: "Queued",
    failed: "Failed",
  };

  return labels[status] || status;
}

function saveDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function Dashboard() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloadingJobId, setDownloadingJobId] = useState(null);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError("");
      setJobs(await getMyJobs());
    } catch (loadError) {
      console.error(loadError);
      setError(
        loadError.message || "Could not load your conversion history."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadHistory();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const deleteJob = async (jobId) => {
    if (!window.confirm("Delete this conversion and its temporary downloads?")) {
      return;
    }

    try {
      setError("");
      await deleteMyJob(jobId);
      setJobs((current) => current.filter((job) => job.id !== jobId));
    } catch (deleteError) {
      setError(deleteError.message || "Could not delete conversion.");
    }
  };

  const downloadJob = async (job) => {
    try {
      setDownloadingJobId(job.id);
      setError("");
      const blob = await downloadJobZip(job.id);
      saveDownload(blob, "convertflow-files.zip");
    } catch (downloadError) {
      setError(
        downloadError.message || "Could not download converted files."
      );
    } finally {
      setDownloadingJobId(null);
    }
  };

  const completedJobs = jobs.filter(
    (job) => job.status === "completed" || job.status === "completed_with_errors"
  ).length;

  const activeJobs = jobs.filter(
    (job) => ["queued", "processing", "creating_archive"].includes(job.status)
  ).length;

  return (
    <div className="app">
      <Header />

      <main className="dashboard-page">
        <div className="dashboard-header">
          <div>
            <span className="section-label">YOUR ACCOUNT</span>
            <h1>Dashboard</h1>
            <p>
              {user?.email
                ? `Conversions created while signed in as ${user.email}.`
                : "Manage your ConvertFlow conversions."}
            </p>
          </div>

          <button className="dashboard-refresh" onClick={loadHistory}>
            Refresh
          </button>
        </div>

        <section className="dashboard-stats" aria-label="Conversion summary">
          <div className="dashboard-stat">
            <span>ALL CONVERSIONS</span>
            <strong>{jobs.length}</strong>
          </div>
          <div className="dashboard-stat">
            <span>COMPLETED</span>
            <strong>{completedJobs}</strong>
          </div>
          <div className="dashboard-stat">
            <span>IN PROGRESS</span>
            <strong>{activeJobs}</strong>
          </div>
        </section>

        <section className="dashboard-history" aria-labelledby="history-heading">
          <div className="dashboard-history-heading">
            <div>
              <span className="section-label">RECENT CONVERSIONS</span>
              <h2 id="history-heading">Conversion history</h2>
              <p>Temporary downloads are available for up to one hour.</p>
            </div>
          </div>

          {error && <div className="dashboard-error">{error}</div>}

          {loading ? (
            <div className="dashboard-empty">Loading conversion history...</div>
          ) : jobs.length === 0 ? (
            <div className="dashboard-empty">
              <div className="empty-icon">↗</div>
              <h2>No conversions yet</h2>
              <p>Conversions made while signed in will appear here.</p>
            </div>
          ) : (
            <div className="history-list">
              {jobs.map((job) => {
                const isDownloadable =
                  job.status === "completed" ||
                  job.status === "completed_with_errors";

                return (
                  <article className="history-card" key={job.id}>
                    <div className="history-card-header">
                      <div>
                        <span className="history-date">{formatDate(job.createdAt)}</span>
                        <h3>
                          {job.totalFiles} {job.totalFiles === 1 ? "file" : "files"}
                        </h3>
                      </div>

                      <span className={`history-status ${job.status}`}>
                        {statusLabel(job.status)}
                      </span>
                    </div>

                    <div className="history-files">
                      {job.files.map((file) => (
                        <div className="history-file" key={file.id}>
                          <div className="history-file-info">
                            <strong>{file.originalName}</strong>
                            <span>
                              {getExtension(file.originalName)} → {file.outputFormat.toUpperCase()}
                            </span>
                          </div>

                          <span className={`history-file-status ${file.status}`}>
                            {statusLabel(file.status)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="history-card-footer">
                      <span>
                        {job.completedFiles}/{job.totalFiles} completed
                      </span>

                      <div className="history-actions">
                        {isDownloadable && (
                          <button
                            className="history-download"
                            disabled={downloadingJobId === job.id}
                            onClick={() => downloadJob(job)}
                          >
                            {downloadingJobId === job.id ? "Preparing..." : "Download ZIP"}
                          </button>
                        )}
                        <button
                          className="history-delete"
                          onClick={() => deleteJob(job.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}

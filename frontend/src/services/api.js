export const API_BASE_URL = (import.meta.env.VITE_API_URL || "https://convertflow-backend.onrender.com/api").replace(/\/$/, "");
let backendEnabled = true;
let controlLoadedAt = 0;

async function refreshBackendAccess(force = false) {
  if (!force && Date.now() - controlLoadedAt < 10000) return backendEnabled;
  try {
    const response = await fetch("/api/site-mode", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (data.success) {
      backendEnabled = data.backendEnabled !== false;
      controlLoadedAt = Date.now();
    }
  } catch {
    // Fail open only for the public site status check. Conversion requests still
    // report a useful connection error if the backend cannot be reached.
  }
  return backendEnabled;
}

async function ensureBackendAccess() {
  const allowed = await refreshBackendAccess();
  if (!allowed) throw new Error("ConvertFlow backend access is currently disabled by the administrator.");
}

function authHeaders(headers = {}) {
  const token = localStorage.getItem("convertflow_token");
  const apiKey = localStorage.getItem("convertflow_api_key");
  return {
    ...headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(apiKey ? { "X-ConvertFlow-API-Key": apiKey } : {}),
  };
}

export async function checkBackendHealth() {
  await ensureBackendAccess();
  const response = await fetch(`${API_BASE_URL}/health`, { credentials: "include" });
  const text = await response.text();
  let data = {};
  if (text.trim()) { try { data = JSON.parse(text); } catch { data = { message: text }; } }
  if (!response.ok) throw new Error(data.message || `Backend responded with HTTP ${response.status}`);
  return data;
}

export async function convertFile(file, outputFormat, onProgress) {
  await ensureBackendAccess();
  const formData = new FormData(); formData.append("file", file); formData.append("outputFormat", outputFormat);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest(); xhr.open("POST", `${API_BASE_URL}/conversion/convert"); xhr.withCredentials = true; xhr.responseType = "blob";
    const apiKey = localStorage.getItem("convertflow_api_key"); if (apiKey) xhr.setRequestHeader("X-ConvertFlow-API-Key", apiKey);
    const token = localStorage.getItem("convertflow_token"); if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress((e.loaded / e.total) * 100); };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve(xhr.response) : reject(new Error("The server could not convert this file."));
    xhr.onerror = () => reject(new Error("Could not connect to the conversion server.")); xhr.onabort = () => reject(new Error("Conversion was cancelled.")); xhr.send(formData);
  });
}

export async function convertBatch(files, onProgress) {
  await ensureBackendAccess();
  const formData = new FormData(); const outputFormats = [];
  for (const item of files) { formData.append("files", item.file); outputFormats.push(item.outputFormat); }
  formData.append("outputFormats", JSON.stringify(outputFormats));
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest(); xhr.open("POST", `${API_BASE_URL}/conversion/convert-batch"); xhr.withCredentials = true; xhr.responseType = "blob";
    const apiKey = localStorage.getItem("convertflow_api_key"); if (apiKey) xhr.setRequestHeader("X-ConvertFlow-API-Key", apiKey);
    const token = localStorage.getItem("convertflow_token"); if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress((e.loaded / e.total) * 100); };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve(xhr.response) : reject(new Error("Batch conversion failed.")); xhr.onerror = () => reject(new Error("Could not connect to the conversion server.")); xhr.send(formData);
  });
}
export async function createConversionJob(files, onProgress) { return convertBatch(files, onProgress); }

async function json(path, options = {}) {
  await ensureBackendAccess();
  const headers = authHeaders(options.headers || {});
  const response = await fetch(`${API_BASE_URL}${path}`, { credentials: "include", ...options, headers });
  const text = await response.text(); let data = {};
  if (text.trim()) { try { data = JSON.parse(text); } catch { data = { message: text }; } }
  if (!response.ok) throw new Error(data.message || `Request failed with HTTP ${response.status}.`);
  return data;
}

export async function getJob(id) { return (await json(`/jobs/${id}`)).job; }
export async function getConversionHistory() { return (await json("/jobs/my")).jobs; }
export async function getMyJobs() { return getConversionHistory(); }
export async function deleteConversionHistory(id) { return json(`/jobs/history/${id}`, { method: "DELETE" }); }
export async function deleteMyJob(id) { return json(`/jobs/my/${id}`, { method: "DELETE" }); }
export async function register(email, password) { return json("/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }); }
export async function login(email, password) { return json("/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }); }
export async function logout() { localStorage.removeItem("convertflow_token"); return json("/auth/logout", { method: "POST" }); }
export async function getCurrentUser() { try { return (await json("/auth/me")).user; } catch { return null; } }
export async function verifyLoginCode(email, code) { const result = await json("/auth/verify-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) }); if (result.token) localStorage.setItem("convertflow_token", result.token); return result; }
export async function requestPasswordReset(email) { return json("/auth/request-password-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }); }
export async function resetPassword(email, code, password) { return json("/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code, password }) }); }
async function blob(path, fallback) { await ensureBackendAccess(); const response = await fetch(`${API_BASE_URL}${path}`, { credentials: "include", headers: authHeaders() }); if (!response.ok) throw new Error(fallback); return response.blob(); }
export async function downloadJobZip(id) { return blob(`/jobs/${id}/download`, "Could not download ZIP."); }
export async function downloadJobFile(jobId, fileId) { return blob(`/jobs/${jobId}/files/${fileId}/download`, "Could not download the converted file."); }

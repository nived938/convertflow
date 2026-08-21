export const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

function authHeaders(headers = {}) {
  const token = localStorage.getItem("convertflow_token");
  return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
}

export async function checkBackendHealth() {
  if (!API_BASE_URL) throw new Error("VITE_API_URL is not configured.");
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { credentials: "include" });
    if (!response.ok) throw new Error(`Backend responded with HTTP ${response.status}`);
    return response.json();
  } catch (error) {
    throw new Error(error?.message || "Could not connect to the conversion server.");
  }
}

export async function convertFile(file, outputFormat, onProgress) {
  const formData = new FormData(); formData.append("file", file); formData.append("outputFormat", outputFormat);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest(); xhr.open("POST", `${API_BASE_URL}/conversion/convert`); xhr.withCredentials = true; xhr.responseType = "blob";
    const token = localStorage.getItem("convertflow_token"); if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress((e.loaded / e.total) * 100); };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve(xhr.response) : reject(new Error("The server could not convert this file."));
    xhr.onerror = () => reject(new Error("Could not connect to the conversion server.")); xhr.onabort = () => reject(new Error("Conversion was cancelled.")); xhr.send(formData);
  });
}

export async function convertBatch(files, onProgress) {
  const formData = new FormData(); const outputFormats = [];
  for (const item of files) { formData.append("files", item.file); outputFormats.push(item.outputFormat); }
  formData.append("outputFormats", JSON.stringify(outputFormats));
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest(); xhr.open("POST", `${API_BASE_URL}/conversion/convert-batch`); xhr.withCredentials = true; xhr.responseType = "blob";
    const token = localStorage.getItem("convertflow_token"); if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress((e.loaded / e.total) * 100); };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve(xhr.response) : reject(new Error("Batch conversion failed.")); xhr.onerror = () => reject(new Error("Could not connect to the conversion server.")); xhr.send(formData);
  });
}

export async function createConversionJob(files, onProgress) {
  const formData = new FormData(); const outputFormats = [];
  for (const item of files) { formData.append("files", item.file); outputFormats.push(item.outputFormat); }
  formData.append("outputFormats", JSON.stringify(outputFormats));
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest(); xhr.open("POST", `${API_BASE_URL}/jobs`); xhr.withCredentials = true; xhr.responseType = "json";
    const token = localStorage.getItem("convertflow_token"); if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve(xhr.response) : reject(new Error(xhr.response?.message || "Could not create conversion job.")); xhr.onerror = () => reject(new Error("Could not connect to the conversion server.")); xhr.send(formData);
  });
}

async function json(path, options = {}) {
  const headers = authHeaders(options.headers || {});
  const response = await fetch(`${API_BASE_URL}${path}`, { credentials: "include", ...options, headers });
  const data = await response.json(); if (!response.ok) throw new Error(data.message || "Request failed."); return data;
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
export async function verifyLoginCode(email, code) {
  const result = await json("/auth/verify-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code }) });
  if (result.token) localStorage.setItem("convertflow_token", result.token);
  return result;
}
export async function requestPasswordReset(email) { await json("/auth/request-password-reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }); }
export async function resetPassword(email, code, password) { await json("/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, code, password }) }); }
async function blob(path, fallback) { const response = await fetch(`${API_BASE_URL}${path}`, { credentials: "include", headers: authHeaders() }); if (!response.ok) throw new Error(fallback); return response.blob(); }
export async function downloadJobZip(id) { return blob(`/jobs/${id}/download`, "Could not download ZIP."); }
export async function downloadJobFile(jobId, fileId) { return blob(`/jobs/${jobId}/files/${fileId}/download`, "Could not download the converted file."); }

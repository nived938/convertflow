import fs from "fs";
import path from "path";
import crypto from "crypto";

import {
  convertFile,
} from "../services/converter.js";

import {
  createJobRecord,
  updateJobRecord,
} from "../models/jobmodel.js";

import {
  createZip,
} from "../services/archive.js";

const jobs = new Map();

const tempDirectory = path.resolve("temp");

function createId() {
  return crypto.randomUUID();
}

function cleanupFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  }
}

function publicJob(job) {
  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    totalFiles: job.files.length,
    completedFiles: job.files.filter((file) => file.status === "completed").length,
    files: job.files.map((file) => ({
      id: file.id,
      originalName: file.originalName,
      outputFormat: file.outputFormat,
      status: file.status,
      progress: file.progress,
      outputName: file.outputName || null,
      error: file.error || null,
    })),
    downloadReady: Boolean(job.zipPath),
    createdAt: job.createdAt,
    completedAt: job.completedAt || null,
  };
}

export async function createJob(uploadedFiles, outputFormats, userId = null) {
  const job = {
    id: createId(),
    userId,
    status: "queued",
    progress: 0,
    files: uploadedFiles.map((file, index) => ({
      id: createId(),
      originalName: file.originalname,
      inputPath: file.path,
      outputFormat: outputFormats[index].toLowerCase(),
      status: "queued",
      progress: 0,
      outputPath: null,
      outputName: null,
      error: null,
    })),
    zipPath: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  jobs.set(job.id, job);
  createJobRecord(job);

  processJob(job).catch((error) => {
    console.error(`Job ${job.id} failed:`, error);
    job.status = "failed";
    job.error = error.message;
    job.completedAt = new Date().toISOString();
    updateJobRecord(job);
  });

  return publicJob(job);
}

export function getJob(jobId) {
  const job = jobs.get(jobId);
  return job ? publicJob(job) : null;
}

export function getJobInternal(jobId) {
  return jobs.get(jobId) || null;
}

export function getAllJobs() {
  return Array.from(jobs.values()).map(publicJob);
}

export function removeJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) return;
  cleanupJobFiles(job);
  jobs.delete(jobId);
}

async function processJob(job) {
  job.status = "processing";
  updateJobRecord(job);

  for (const file of job.files) {
    file.status = "processing";
    file.progress = 0;

    try {
      console.log(`Job ${job.id}: ${file.originalName} → ${file.outputFormat}`);
      const result = await convertFile(file.inputPath, file.outputFormat);
      file.outputPath = result.outputPath;
      file.outputName = result.outputName || `${path.parse(file.originalName).name}.${file.outputFormat}`;
      file.progress = 100;
      file.status = "completed";
    } catch (error) {
      console.error(`File conversion failed: ${file.originalName}`, error);
      file.status = "failed";
      file.progress = 0;
      file.error = error.message;
    }

    updateJobProgress(job);
    cleanupFile(file.inputPath);
  }

  const successfulFiles = job.files.filter((file) => file.status === "completed");

  if (successfulFiles.length === 0) {
    job.status = "failed";
    job.progress = 0;
    job.completedAt = new Date().toISOString();
    updateJobRecord(job);
    return;
  }

  job.status = "creating_archive";
  updateJobProgress(job);

  try {
    const zipName = `convertflow-${job.id}.zip`;
    const zipPath = path.join(tempDirectory, zipName);

    await createZip(
      successfulFiles.map((file) => ({ path: file.outputPath, name: file.outputName })),
      zipPath
    );

    job.zipPath = zipPath;
    job.status = successfulFiles.length === job.files.length ? "completed" : "completed_with_errors";
    job.progress = 100;
    job.completedAt = new Date().toISOString();
    updateJobRecord(job);
    console.log(`Job ${job.id} completed.`);
  } catch (error) {
    job.status = "failed";
    job.error = error.message;
    updateJobRecord(job);
    console.error(`ZIP creation failed for job ${job.id}:`, error);
  }
}

function updateJobProgress(job) {
  if (job.files.length === 0) {
    job.progress = 100;
  } else {
    const total = job.files.reduce((sum, file) => sum + file.progress, 0);
    job.progress = Math.round(total / job.files.length);
  }
  updateJobRecord(job);
}

export function cleanupJobFiles(job) {
  if (!job) return;
  for (const file of job.files) {
    cleanupFile(file.inputPath);
    cleanupFile(file.outputPath);
  }
  cleanupFile(job.zipPath);
  job.cleanedUp = true;
}

const CLEANUP_INTERVAL = 60 * 60 * 1000;
const MAX_TEMP_AGE = 60 * 60 * 1000;

function isFileUsedByActiveJob(filePath) {
  for (const job of jobs.values()) {
    if (job.status === "processing" || job.status === "creating_archive") {
      for (const file of job.files) {
        if (file.inputPath === filePath || file.outputPath === filePath) return true;
      }
      if (job.zipPath === filePath) return true;
    }
  }
  return false;
}

export function cleanupOldTempFiles() {
  if (!fs.existsSync(tempDirectory)) return;
  const now = Date.now();
  const files = fs.readdirSync(tempDirectory);

  for (const filename of files) {
    const filePath = path.join(tempDirectory, filename);
    try {
      const stats = fs.statSync(filePath);
      const age = now - stats.mtimeMs;
      if (age > MAX_TEMP_AGE && !isFileUsedByActiveJob(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Removed old temporary file: ${filename}`);
      }
    } catch (error) {
      console.error(`Could not clean ${filename}:`, error);
    }
  }
}

setInterval(cleanupOldTempFiles, CLEANUP_INTERVAL);

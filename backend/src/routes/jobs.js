import express from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { optionalAuth } from "../middleware/auth.js";

import {
  createJob,
  getJob,
  getJobInternal,
  removeJob,
} from "../workers/conversionWorker.js";

import {
  getJobOwner,
  getUserJobRecords,
  deleteUserJobRecord,
} from "../models/jobModel.js";

const router = express.Router();

const tempDirectory = path.resolve("temp");

if (!fs.existsSync(tempDirectory)) {
  fs.mkdirSync(tempDirectory, {
    recursive: true,
  });
}

const storage = multer.diskStorage({
  destination: (
    req,
    file,
    cb
  ) => {
    cb(null, tempDirectory);
  },

  filename: (
    req,
    file,
    cb
  ) => {
    const id =
      crypto.randomUUID();

    const extension =
      path.extname(
        file.originalname
      );

    cb(
      null,
      `${id}${extension}`
    );
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize:
      100 * 1024 * 1024,
  },
});

function canAccessJob(jobId, userId) {
  const ownerId = getJobOwner(jobId);

  return !ownerId || ownerId === userId;
}

function loadUserJobs(req, res) {
  try {
    return res.json({
      success: true,
      jobs: getUserJobRecords(req.user.userId),
    });
  } catch (error) {
    console.error("History error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not load conversion history.",
    });
  }
}

function deleteUserJob(req, res) {
  try {
    const activeJob = getJobInternal(req.params.jobId);

    if (
      activeJob &&
      ["queued", "processing", "creating_archive"].includes(activeJob.status)
    ) {
      return res.status(409).json({
        success: false,
        message: "A conversion in progress cannot be deleted.",
      });
    }

    const deleted = deleteUserJobRecord(
      req.params.jobId,
      req.user.userId
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Conversion not found.",
      });
    }

    removeJob(req.params.jobId);

    return res.json({
      success: true,
      message: "Conversion history deleted.",
    });
  } catch (error) {
    console.error("Delete history error:", error);

    return res.status(500).json({
      success: false,
      message: "Could not delete conversion history.",
    });
  }
}

router.get("/my", requireAuth, loadUserJobs);
router.delete("/my/:jobId", requireAuth, deleteUserJob);

// Keep the original history URL as an authenticated alias for existing clients.
router.get("/history", requireAuth, loadUserJobs);
router.delete("/history/:jobId", requireAuth, deleteUserJob);

router.post(
  "/",
  optionalAuth,
  upload.array("files", 20),
  async (req, res) => {
    try {
      const files =
        req.files || [];

      if (files.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "No files were uploaded.",
        });
      }

      let outputFormats = [];

      try {
        outputFormats =
          JSON.parse(
            req.body.outputFormats ||
              "[]"
          );
      } catch {
        return res.status(400).json({
          success: false,
          message:
            "Invalid outputFormats.",
        });
      }

      if (
        outputFormats.length !==
        files.length
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Each file must have an output format.",
        });
      }

      const job = await createJob(
        files,
        outputFormats,
        req.user?.userId || null
      );

      return res.status(201).json({
        success: true,
        job,
      });
    } catch (error) {
      console.error(
        "Create job error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Could not create conversion job.",
      });
    }
  }
);

router.get(
  "/:jobId/download",
  optionalAuth,
  (req, res) => {
    if (!canAccessJob(req.params.jobId, req.user?.userId)) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    const job =
      getJobInternal(
        req.params.jobId
      );

    if (!job) {
      return res.status(404).json({
        success: false,
        message:
          "Job not found.",
      });
    }

    if (!job.zipPath) {
      return res.status(409).json({
        success: false,
        message:
          "The ZIP file is not ready yet.",
      });
    }

    if (
      !fs.existsSync(
        job.zipPath
      )
    ) {
      return res.status(404).json({
        success: false,
        message:
          "ZIP file no longer exists.",
      });
    }

    const zipPath =
      job.zipPath;

    return res.download(
      zipPath,
      "convertflow-files.zip",
      (error) => {
        if (error) {
          console.error(
            "ZIP download error:",
            error
          );
        }
      }
    );
  }
);

router.get(
  "/:jobId/files/:fileId/download",
  optionalAuth,
  (req, res) => {
    if (!canAccessJob(req.params.jobId, req.user?.userId)) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    const job = getJobInternal(
      req.params.jobId
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    const file = job.files.find(
      (candidate) => candidate.id === req.params.fileId
    );

    if (!file || file.status !== "completed" || !file.outputPath) {
      return res.status(409).json({
        success: false,
        message: "The converted file is not ready yet.",
      });
    }

    if (!fs.existsSync(file.outputPath)) {
      return res.status(404).json({
        success: false,
        message: "The converted file is no longer available.",
      });
    }

    return res.download(
      file.outputPath,
      file.outputName
    );
  }
);

router.get(
  "/:jobId",
  optionalAuth,
  (req, res) => {
    if (!canAccessJob(req.params.jobId, req.user?.userId)) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    const job = getJob(req.params.jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found.",
      });
    }

    return res.json({
      success: true,
      job,
    });
  }
);

export default router;

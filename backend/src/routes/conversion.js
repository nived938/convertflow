import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";

import {
  convertFile,
} from "../services/converter.js";

import {
  createZip,
} from "../services/archive.js";

import {
  requireAuth,
} from "../middleware/auth.js";

import {
  optionalAuth,
} from "../middleware/auth.js";

const router = express.Router();

const tempDirectory = path.resolve(
  "temp"
);

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
      path.extname(file.originalname);

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

function cleanupFile(filePath) {
  if (
    filePath &&
    fs.existsSync(filePath)
  ) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // Ignore cleanup errors.
    }
  }
}

router.post(
  "/convert",
  optionalAuth,
  upload.single("file"),
  async (req, res) => {
    let outputPath = null;

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "No file was uploaded.",
        });
      }

      const outputFormat =
        req.body.outputFormat
          ?.toLowerCase();

      if (!outputFormat) {
        cleanupFile(
          req.file.path
        );

        return res.status(400).json({
          success: false,
          message:
            "Output format is required.",
        });
      }

      console.log(
        `Converting ${req.file.originalname} → ${outputFormat}`
      );

      const result =
        await convertFile(
          req.file.path,
          outputFormat
        );

      outputPath =
        result.outputPath;

      const downloadName =
        result.outputName ||
        `${path.parse(
          req.file.originalname
        ).name}.${outputFormat}`;

      res.download(
        outputPath,
        downloadName,
        (error) => {
          cleanupFile(
            req.file.path
          );

          cleanupFile(
            outputPath
          );

          if (error) {
            console.error(
              "Download error:",
              error
            );
          }
        }
      );
    } catch (error) {
      console.error(
        "Conversion error:",
        error
      );

      cleanupFile(
        req.file?.path
      );

      cleanupFile(
        outputPath
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Conversion failed.",
      });
    }
  }
);

router.post(
  "/convert-batch",
  optionalAuth,
  upload.array("files", 20),
  async (req, res) => {
    const convertedFiles = [];
    const inputFiles = req.files || [];

    try {
      if (inputFiles.length === 0) {
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
            "Invalid outputFormats data.",
        });
      }

      if (
        outputFormats.length !==
        inputFiles.length
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Each file must have an output format.",
        });
      }

      for (
        let index = 0;
        index < inputFiles.length;
        index++
      ) {
        const inputFile =
          inputFiles[index];

        const outputFormat =
          outputFormats[index]
            ?.toLowerCase();

        if (!outputFormat) {
          throw new Error(
            `Missing output format for ${inputFile.originalname}`
          );
        }

        console.log(
          `Batch conversion: ${inputFile.originalname} → ${outputFormat}`
        );

        const result =
          await convertFile(
            inputFile.path,
            outputFormat
          );

        convertedFiles.push({
          path:
            result.outputPath,

          name:
            result.outputName ||
            `${path.parse(
              inputFile.originalname
            ).name}.${outputFormat}`,
        });
      }

      const zipName =
        `convertflow-${crypto
          .randomUUID()}.zip`;

      const zipPath =
        path.join(
          tempDirectory,
          zipName
        );

      await createZip(
        convertedFiles,
        zipPath
      );

      res.download(
        zipPath,
        "convertflow-files.zip",
        (error) => {
          for (
            const file of inputFiles
          ) {
            cleanupFile(
              file.path
            );
          }

          for (
            const file of convertedFiles
          ) {
            cleanupFile(
              file.path
            );
          }

          cleanupFile(zipPath);

          if (error) {
            console.error(
              "ZIP download error:",
              error
            );
          }
        }
      );
    } catch (error) {
      console.error(
        "Batch conversion error:",
        error
      );

      for (
        const file of inputFiles
      ) {
        cleanupFile(file.path);
      }

      for (
        const file of convertedFiles
      ) {
        cleanupFile(file.path);
      }

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Batch conversion failed.",
      });
    }
  }
);

export default router;
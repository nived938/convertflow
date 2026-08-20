import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function getImageMagickCommand() {
  if (process.platform === "win32") {
    return "magick";
  }

  return "convert";
}

export async function convertImage(
  inputPath,
  outputFormat
) {
  const inputExtension = path
    .extname(inputPath)
    .toLowerCase();

  const baseName = path.basename(
    inputPath,
    inputExtension
  );

  const outputDirectory = path.dirname(
    inputPath
  );

  const outputPath = path.join(
    outputDirectory,
    `${baseName}-converted.${outputFormat}`
  );

  const command =
    getImageMagickCommand();

  const argumentsList = [
    inputPath,
    outputPath,
  ];

  console.log(
    `ImageMagick: ${command} ${argumentsList.join(" ")}`
  );

  await execFileAsync(
    command,
    argumentsList
  );

  if (!fs.existsSync(outputPath)) {
    throw new Error(
      "Image conversion completed but the output file was not created."
    );
  }

  return {
    outputPath,
    outputName: `${baseName}.${outputFormat}`,
  };
}
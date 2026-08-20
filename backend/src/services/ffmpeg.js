import path from "path";
import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const audioFormats = [
  "mp3",
  "wav",
  "aac",
  "ogg",
  "flac",
  "m4a",
];

const videoFormats = [
  "mp4",
  "webm",
  "avi",
  "mkv",
  "mov",
];

function buildArguments(
  inputPath,
  outputPath,
  outputFormat
) {
  const args = [
    "-i",
    inputPath,
    "-y",
  ];

  if (audioFormats.includes(outputFormat)) {
    args.push("-vn");

    if (outputFormat === "mp3") {
      args.push(
        "-codec:a",
        "libmp3lame",
        "-q:a",
        "2"
      );
    }

    if (outputFormat === "ogg") {
      args.push(
        "-codec:a",
        "libvorbis",
        "-q:a",
        "5"
      );
    }

    if (outputFormat === "flac") {
      args.push(
        "-codec:a",
        "flac"
      );
    }

    if (outputFormat === "wav") {
      args.push(
        "-codec:a",
        "pcm_s16le"
      );
    }

    if (outputFormat === "aac") {
      args.push(
        "-codec:a",
        "aac",
        "-b:a",
        "192k"
      );
    }

    if (outputFormat === "m4a") {
      args.push(
        "-codec:a",
        "aac",
        "-b:a",
        "192k"
      );
    }
  }

  if (outputFormat === "mp4") {
    args.push(
      "-c:v",
      "libx264",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart"
    );
  }

  if (outputFormat === "webm") {
    args.push(
      "-c:v",
      "libvpx-vp9",
      "-c:a",
      "libopus"
    );
  }

  args.push(outputPath);

  return args;
}

export async function convertMedia(
  inputPath,
  outputFormat
) {
  const extension = path.extname(
    inputPath
  );

  const baseName = path.basename(
    inputPath,
    extension
  );

  const outputDirectory =
    path.dirname(inputPath);

  const outputPath = path.join(
    outputDirectory,
    `${baseName}-converted.${outputFormat}`
  );

  const args = buildArguments(
    inputPath,
    outputPath,
    outputFormat
  );

  console.log(
    `FFmpeg: ffmpeg ${args.join(" ")}`
  );

  await execFileAsync(
    "ffmpeg",
    args
  );

  if (!fs.existsSync(outputPath)) {
    throw new Error(
      "FFmpeg completed but the output file was not created."
    );
  }

  return {
    outputPath,
    outputName:
      `${baseName}.${outputFormat}`,
  };
}
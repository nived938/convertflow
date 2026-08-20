import {
  convertImage,
} from "./imagemagick.js";

import {
  convertMedia,
} from "./ffmpeg.js";

const imageFormats = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "bmp",
  "tiff",
];

const videoFormats = [
  "mp4",
  "webm",
  "avi",
  "mkv",
  "mov",
];

const audioFormats = [
  "mp3",
  "wav",
  "aac",
  "ogg",
  "flac",
  "m4a",
];

export async function convertFile(
  inputPath,
  outputFormat
) {
  const format =
    outputFormat.toLowerCase();

  if (imageFormats.includes(format)) {
    return convertImage(
      inputPath,
      format
    );
  }

  if (
    videoFormats.includes(format) ||
    audioFormats.includes(format)
  ) {
    return convertMedia(
      inputPath,
      format
    );
  }

  throw new Error(
    `Conversion to ${format.toUpperCase()} is not supported yet.`
  );
}
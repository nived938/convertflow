import { convertImage } from "./imagemagick.js";
import { convertMedia } from "./ffmpeg.js";

// Common formats supported by the underlying ImageMagick and FFmpeg tools.
// Availability can still depend on the codecs/delegates installed in the Render image.
const imageFormats = [
  "jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff", "tif", "avif", "ico", "heic", "heif", "jp2", "j2k", "ppm", "pgm", "pbm", "pnm", "tga", "svg"
];
const videoFormats = [
  "mp4", "webm", "avi", "mkv", "mov", "flv", "mpeg", "mpg", "m4v", "ts", "mts", "m2ts", "3gp", "3g2", "ogv", "vob", "wmv", "asf", "f4v"
];
const audioFormats = [
  "mp3", "wav", "aac", "ogg", "oga", "flac", "m4a", "opus", "aiff", "aif", "ac3", "amr", "wma", "mka", "ape", "au"
];

export async function convertFile(inputPath, outputFormat) {
  const format = String(outputFormat || "").toLowerCase().replace(/^\./, "");
  if (!format) throw new Error("An output format is required.");
  if (imageFormats.includes(format)) return convertImage(inputPath, format);
  if (videoFormats.includes(format) || audioFormats.includes(format)) return convertMedia(inputPath, format);
  throw new Error(`Conversion to ${format.toUpperCase()} is not supported yet.`);
}

export const supportedFormats = { image: imageFormats, video: videoFormats, audio: audioFormats };

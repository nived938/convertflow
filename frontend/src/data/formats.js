export const formats = {
  image: [
    {
      id: "jpg",
      name: "JPG",
      extensions: ["jpg", "jpeg"],
    },
    {
      id: "png",
      name: "PNG",
      extensions: ["png"],
    },
    {
      id: "webp",
      name: "WEBP",
      extensions: ["webp"],
    },
    {
      id: "gif",
      name: "GIF",
      extensions: ["gif"],
    },
    {
      id: "bmp",
      name: "BMP",
      extensions: ["bmp"],
    },
    {
      id: "tiff",
      name: "TIFF",
      extensions: ["tiff", "tif"],
    },
  ],

  video: [
    {
      id: "mp4",
      name: "MP4",
      extensions: ["mp4"],
    },
    {
      id: "webm",
      name: "WEBM",
      extensions: ["webm"],
    },
    {
      id: "avi",
      name: "AVI",
      extensions: ["avi"],
    },
    {
      id: "mkv",
      name: "MKV",
      extensions: ["mkv"],
    },
    {
      id: "mov",
      name: "MOV",
      extensions: ["mov"],
    },
  ],

  audio: [
    {
      id: "mp3",
      name: "MP3",
      extensions: ["mp3"],
    },
    {
      id: "wav",
      name: "WAV",
      extensions: ["wav"],
    },
    {
      id: "aac",
      name: "AAC",
      extensions: ["aac"],
    },
    {
      id: "ogg",
      name: "OGG",
      extensions: ["ogg"],
    },
    {
      id: "flac",
      name: "FLAC",
      extensions: ["flac"],
    },
    {
      id: "m4a",
      name: "M4A",
      extensions: ["m4a"],
    },
  ],
};

export function detectFormat(filename) {
  const extension = filename
    .split(".")
    .pop()
    .toLowerCase();

  for (const [category, categoryFormats] of Object.entries(
    formats
  )) {
    const match = categoryFormats.find(
      (format) =>
        format.extensions.includes(extension)
    );

    if (match) {
      return {
        ...match,
        category,
      };
    }
  }

  return null;
}

export function getFormatsForCategory(
  category
) {
  return formats[category] || [];
}
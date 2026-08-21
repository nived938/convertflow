export const formats = {
  image: [
    ["jpg","JPG",["jpg","jpeg"]],["png","PNG",["png"]],["webp","WEBP",["webp"]],["gif","GIF",["gif"]],["bmp","BMP",["bmp"]],["tiff","TIFF",["tiff","tif"]],["avif","AVIF",["avif"]],["ico","ICO",["ico"]],["heic","HEIC",["heic","heif"]],["jp2","JPEG 2000",["jp2","j2k"]],["ppm","PPM",["ppm"]],["tga","TGA",["tga"]]
  ].map(([id,name,extensions])=>({id,name,extensions})),
  video: [
    ["mp4","MP4",["mp4"]],["webm","WEBM",["webm"]],["avi","AVI",["avi"]],["mkv","MKV",["mkv"]],["mov","MOV",["mov"]],["flv","FLV",["flv"]],["mpeg","MPEG",["mpeg","mpg"]],["m4v","M4V",["m4v"]],["ts","MPEG-TS",["ts","mts","m2ts"]],["3gp","3GP",["3gp","3g2"]],["ogv","OGV",["ogv"]],["vob","VOB",["vob"]],["wmv","WMV",["wmv"]]
  ].map(([id,name,extensions])=>({id,name,extensions})),
  audio: [
    ["mp3","MP3",["mp3"]],["wav","WAV",["wav"]],["aac","AAC",["aac"]],["ogg","OGG",["ogg","oga"]],["flac","FLAC",["flac"]],["m4a","M4A",["m4a"]],["opus","OPUS",["opus"]],["aiff","AIFF",["aiff","aif"]],["ac3","AC3",["ac3"]],["amr","AMR",["amr"]],["wma","WMA",["wma"]],["mka","MKA",["mka"]]
  ].map(([id,name,extensions])=>({id,name,extensions}))
};

export function detectFormat(filename) {
  const extension = filename.split(".").pop().toLowerCase();
  for (const [category, categoryFormats] of Object.entries(formats)) {
    const match = categoryFormats.find(format => format.extensions.includes(extension));
    if (match) return { ...match, category };
  }
  return null;
}

export function getFormatsForCategory(category) { return formats[category] || []; }

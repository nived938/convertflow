import {
  Settings2,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

export default function ConversionOptions({
  inputFormat,
  outputFormat,
}) {
  const [open, setOpen] = useState(false);

  const isImage =
    ["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff"].includes(
      outputFormat
    );

  const isVideo =
    ["mp4", "webm", "mkv", "avi", "mov", "flv"].includes(
      outputFormat
    );

  const isAudio =
    ["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(
      outputFormat
    );

  const isPdf = outputFormat === "pdf";

  return (
    <div className="conversion-options">
      <button
        className="options-header"
        onClick={() => setOpen((current) => !current)}
      >
        <div className="options-title">
          <div className="options-icon">
            <Settings2 size={17} />
          </div>

          <div>
            <strong>Conversion options</strong>

            <span>
              {inputFormat?.toUpperCase() || "FILE"} →{" "}
              {outputFormat?.toUpperCase() || "FILE"}
            </span>
          </div>
        </div>

        <ChevronDown
          size={18}
          className={open ? "rotate" : ""}
        />
      </button>

      {open && (
        <div className="options-body">

          {isImage && (
            <>
              <div className="option-row">
                <label>Quality</label>

                <select defaultValue="90">
                  <option value="100">Maximum</option>
                  <option value="90">High</option>
                  <option value="75">Good</option>
                  <option value="60">Medium</option>
                </select>
              </div>

              <div className="option-row">
                <label>Width</label>

                <input
                  type="number"
                  placeholder="Auto"
                  min="1"
                />
              </div>

              <div className="option-row">
                <label>Height</label>

                <input
                  type="number"
                  placeholder="Auto"
                  min="1"
                />
              </div>

              <label className="checkbox-option">
                <input type="checkbox" />
                <span>Keep original dimensions</span>
              </label>

              <label className="checkbox-option">
                <input type="checkbox" defaultChecked />
                <span>Preserve aspect ratio</span>
              </label>
            </>
          )}

          {isVideo && (
            <>
              <div className="option-row">
                <label>Video codec</label>

                <select defaultValue="auto">
                  <option value="auto">Automatic</option>
                  <option value="h264">H.264</option>
                  <option value="h265">H.265</option>
                  <option value="vp9">VP9</option>
                  <option value="av1">AV1</option>
                </select>
              </div>

              <div className="option-row">
                <label>Resolution</label>

                <select defaultValue="original">
                  <option value="original">Original</option>
                  <option value="2160">4K</option>
                  <option value="1440">1440p</option>
                  <option value="1080">1080p</option>
                  <option value="720">720p</option>
                  <option value="480">480p</option>
                </select>
              </div>

              <div className="option-row">
                <label>Frame rate</label>

                <select defaultValue="original">
                  <option value="original">Original</option>
                  <option value="60">60 FPS</option>
                  <option value="30">30 FPS</option>
                  <option value="24">24 FPS</option>
                </select>
              </div>
            </>
          )}

          {isAudio && (
            <>
              <div className="option-row">
                <label>Audio bitrate</label>

                <select defaultValue="192">
                  <option value="320">320 kbps</option>
                  <option value="256">256 kbps</option>
                  <option value="192">192 kbps</option>
                  <option value="128">128 kbps</option>
                  <option value="96">96 kbps</option>
                </select>
              </div>

              <div className="option-row">
                <label>Sample rate</label>

                <select defaultValue="44100">
                  <option value="48000">48 kHz</option>
                  <option value="44100">44.1 kHz</option>
                  <option value="32000">32 kHz</option>
                  <option value="22050">22.05 kHz</option>
                </select>
              </div>
            </>
          )}

          {isPdf && (
            <>
              <div className="option-row">
                <label>Page range</label>

                <input
                  type="text"
                  placeholder="All pages"
                />
              </div>

              <div className="option-row">
                <label>Quality</label>

                <select defaultValue="high">
                  <option value="maximum">Maximum</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </>
          )}

          {!isImage && !isVideo && !isAudio && !isPdf && (
            <div className="no-options">
              <Settings2 size={22} />

              <p>
                This conversion does not currently have
                additional options.
              </p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
import {
  formats,
  detectFormat,
} from "../data/formats";

export default function FormatSelector({
  file,
  value,
  onChange,
}) {
  const detected = file
    ? detectFormat(file.name)
    : null;

  const availableFormats =
    detected
      ? formats[detected.category]
      : formats.image;

  return (
    <div className="format-selector">

      <div className="format-selector-header">

        <div>
          <span className="section-label">
            OUTPUT FORMAT
          </span>

          <h3>
            Convert to
          </h3>
        </div>

        {detected && (
          <span className="detected-format">
            {detected.category.toUpperCase()}
          </span>
        )}

      </div>

      <div className="format-grid">

        {availableFormats.map((format) => (
          <button
            key={format.id}
            type="button"
            className={
              value === format.id
                ? "format-option active"
                : "format-option"
            }
            onClick={() =>
              onChange(format.id)
            }
          >
            <strong>
              {format.name}
            </strong>

            {format.id === value && (
              <span className="format-check">
                ✓
              </span>
            )}
          </button>
        ))}

      </div>

    </div>
  );
}
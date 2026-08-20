export default function FileQueue({
  files,
  onRemove,
}) {
  return (
    <div className="file-queue">

      <div className="file-queue-header">

        <span className="section-label">
          FILES
        </span>

        <span>
          {files.length}{" "}
          {files.length === 1
            ? "file"
            : "files"}
        </span>

      </div>

      <div className="file-list">

        {files.map((item) => {

          const size =
            item.file.size;

          const sizeText =
            size < 1024 * 1024
              ? `${(
                  size / 1024
                ).toFixed(1)} KB`
              : `${(
                  size /
                  (1024 * 1024)
                ).toFixed(2)} MB`;

          return (
            <div
              className="file-item"
              key={item.id}
            >

              <div className="file-icon">
                {item.file.name
                  .split(".")
                  .pop()
                  .toUpperCase()}
              </div>

              <div className="file-info">

                <strong>
                  {item.file.name}
                </strong>

                <span>
                  {sizeText}
                </span>

              </div>

              <button
                className="file-remove"
                onClick={() =>
                  onRemove(item.id)
                }
                disabled={
                  item.status ===
                  "converting"
                }
              >
                ×
              </button>

            </div>
          );
        })}

      </div>

    </div>
  );
}
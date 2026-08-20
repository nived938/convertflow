import fs from "fs";
import { ZipArchive } from "archiver";

export function createZip(
  files,
  outputPath
) {
  return new Promise(
    (resolve, reject) => {
      const output =
        fs.createWriteStream(
          outputPath
        );

      const archive =
        new ZipArchive({
          zlib: {
            level: 9,
          },
        });

      output.on(
        "close",
        () => {
          resolve(outputPath);
        }
      );

      output.on(
        "error",
        reject
      );

      archive.on(
        "error",
        reject
      );

      archive.pipe(output);

      for (
        const file of files
      ) {
        archive.file(
          file.path,
          {
            name: file.name,
          }
        );
      }

      archive.finalize();
    }
  );
}
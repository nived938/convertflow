import { db } from "../../database/database.js";

export function createJobRecord(
  job
) {
  const statement =
    db.prepare(`
      INSERT INTO jobs (
        id,
        user_id,
        status,
        progress,
        total_files,
        completed_files,
        created_at,
        completed_at,
        error
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

  statement.run(
    job.id,
    job.userId || null,
    job.status,
    job.progress,
    job.files.length,
    0,
    job.createdAt,
    null,
    null
  );

  const fileStatement =
    db.prepare(`
      INSERT INTO conversion_files (
        id,
        job_id,
        original_name,
        output_name,
        output_format,
        status,
        progress,
        error
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

  for (
    const file of job.files
  ) {
    fileStatement.run(
      file.id,
      job.id,
      file.originalName,
      null,
      file.outputFormat,
      file.status,
      file.progress,
      null
    );
  }
}

export function updateJobRecord(
  job
) {
  const statement =
    db.prepare(`
      UPDATE jobs
      SET
        status = ?,
        progress = ?,
        completed_files = ?,
        completed_at = ?,
        error = ?
      WHERE id = ?
    `);

  const completedFiles =
    job.files.filter(
      (file) =>
        file.status ===
        "completed"
    ).length;

  statement.run(
    job.status,
    job.progress,
    completedFiles,
    job.completedAt ||
      null,
    job.error ||
      null,
    job.id
  );

  const fileStatement =
    db.prepare(`
      UPDATE conversion_files
      SET
        output_name = ?,
        status = ?,
        progress = ?,
        error = ?
      WHERE id = ?
    `);

  for (
    const file of job.files
  ) {
    fileStatement.run(
      file.outputName ||
        null,
      file.status,
      file.progress,
      file.error ||
        null,
      file.id
    );
  }
}

export function getJobRecord(
  jobId
) {
  const job =
    db.prepare(`
      SELECT *
      FROM jobs
      WHERE id = ?
    `).get(jobId);

  if (!job) {
    return null;
  }

  const files =
    db.prepare(`
      SELECT *
      FROM conversion_files
      WHERE job_id = ?
      ORDER BY rowid ASC
    `).all(jobId);

  return {
    id: job.id,

    userId: job.user_id || null,

    status: job.status,

    progress: job.progress,

    totalFiles:
      job.total_files,

    completedFiles:
      job.completed_files,

    createdAt:
      job.created_at,

    completedAt:
      job.completed_at,

    error:
      job.error,

    files: files.map(
      (file) => ({
        id: file.id,

        originalName:
          file.original_name,

        outputName:
          file.output_name,

        outputFormat:
          file.output_format,

        status:
          file.status,

        progress:
          file.progress,

        error:
          file.error,
      })
    ),
  };
}

export function getJobOwner(jobId) {
  const job =
    db.prepare(`
      SELECT user_id
      FROM jobs
      WHERE id = ?
    `).get(jobId);

  return job?.user_id || null;
}

export function getUserJobRecords(userId) {
  const jobs =
    db.prepare(`
      SELECT *
      FROM jobs
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);

  return jobs.map(
    (job) => {
      const files =
        db.prepare(`
          SELECT *
          FROM conversion_files
          WHERE job_id = ?
          ORDER BY rowid ASC
        `).all(job.id);

      return {
        id: job.id,

        userId: job.user_id || null,

        status: job.status,

        progress: job.progress,

        totalFiles:
          job.total_files,

        completedFiles:
          job.completed_files,

        createdAt:
          job.created_at,

        completedAt:
          job.completed_at,

        error:
          job.error,

        files: files.map(
          (file) => ({
            id: file.id,

            originalName:
              file.original_name,

            outputName:
              file.output_name,

            outputFormat:
              file.output_format,

            status:
              file.status,

            progress:
              file.progress,

            error:
              file.error,
          })
        ),
      };
    }
  );
}

export function deleteJobRecord(
  jobId
) {
  db.prepare(`
    DELETE FROM conversion_files
    WHERE job_id = ?
  `).run(jobId);

  db.prepare(`
    DELETE FROM jobs
    WHERE id = ?
  `).run(jobId);
}

export function deleteUserJobRecord(
  jobId,
  userId
) {
  const result =
    db.prepare(`
      DELETE FROM jobs
      WHERE id = ?
        AND user_id = ?
    `).run(
      jobId,
      userId
    );

  return result.changes > 0;
}

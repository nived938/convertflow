export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api"
).replace(/\/$/, "");

export async function checkBackendHealth() {
  const response = await fetch(`${API_BASE_URL}/health`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Backend responded with ${response.status}`);
  }

  return response.json();
}

export async function convertFile(
  file,
  outputFormat,
  onProgress
) {
  const formData = new FormData();

  formData.append("file", file);
  formData.append(
    "outputFormat",
    outputFormat
  );

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open(
      "POST",
      `${API_BASE_URL}/conversion/convert`
    );

    xhr.withCredentials = true;

    xhr.responseType = "blob";

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }

      const percent =
        (event.loaded / event.total) * 100;

      if (onProgress) {
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (
        xhr.status >= 200 &&
        xhr.status < 300
      ) {
        resolve(xhr.response);
        return;
      }

      reject(
        new Error(
          "The server could not convert this file."
        )
      );
    };

    xhr.onerror = () => {
      reject(
        new Error(
          "Could not connect to the conversion server."
        )
      );
    };

    xhr.onabort = () => {
      reject(
        new Error("Conversion was cancelled.")
      );
    };

    xhr.send(formData);
  });
}

export async function convertBatch(
  files,
  onProgress
) {
  const formData = new FormData();

  const outputFormats = [];

  for (const item of files) {
    formData.append(
      "files",
      item.file
    );

    outputFormats.push(
      item.outputFormat
    );
  }

  formData.append(
    "outputFormats",
    JSON.stringify(
      outputFormats
    )
  );

  return new Promise(
    (resolve, reject) => {
      const xhr =
        new XMLHttpRequest();

      xhr.open(
        "POST",
        `${API_BASE_URL}/conversion/convert-batch`
      );

      xhr.withCredentials = true;

      xhr.responseType =
        "blob";

      xhr.upload.onprogress = (
        event
      ) => {
        if (
          !event.lengthComputable
        ) {
          return;
        }

        const percent =
          (event.loaded /
            event.total) *
          100;

        if (onProgress) {
          onProgress(
            percent
          );
        }
      };

      xhr.onload = () => {
        if (
          xhr.status >= 200 &&
          xhr.status < 300
        ) {
          resolve(
            xhr.response
          );

          return;
        }

        reject(
          new Error(
            "Batch conversion failed."
          )
        );
      };

      xhr.onerror = () => {
        reject(
          new Error(
            "Could not connect to the conversion server."
          )
        );
      };

      xhr.send(
        formData
      );
    }
  );
}

export async function createConversionJob(
  files,
  onProgress
) {
  const formData =
    new FormData();

  const outputFormats =
    [];

  for (
    const item of files
  ) {
    formData.append(
      "files",
      item.file
    );

    outputFormats.push(
      item.outputFormat
    );
  }

  formData.append(
    "outputFormats",
    JSON.stringify(
      outputFormats
    )
  );

  return new Promise(
    (resolve, reject) => {
      const xhr =
        new XMLHttpRequest();

      xhr.open(
        "POST",
        `${API_BASE_URL}/jobs`
      );

      // Logged-in conversions include the session cookie so the server can
      // associate the job with the account. Anonymous conversions still work.
      xhr.withCredentials = true;

      xhr.responseType =
        "json";

      xhr.upload.onprogress =
        (event) => {
          if (
            !event.lengthComputable
          ) {
            return;
          }

          const percent =
            Math.round(
              (event.loaded /
                event.total) *
                100
            );

          if (onProgress) {
            onProgress(
              percent
            );
          }
        };

      xhr.onload = () => {
        if (
          xhr.status >= 200 &&
          xhr.status < 300
        ) {
          resolve(
            xhr.response
          );

          return;
        }

        reject(
          new Error(
            xhr.response
              ?.message ||
              "Could not create conversion job."
          )
        );
      };

      xhr.onerror = () => {
        reject(
          new Error(
            "Could not connect to the conversion server."
          )
        );
      };

      xhr.send(
        formData
      );
    }
  );
}

export async function getJob(
  jobId
) {
  const response =
    await fetch(
      `${API_BASE_URL}/jobs/${jobId}`,
      {
        credentials: "include",
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Could not get job status."
    );
  }

  return data.job;
}

export async function downloadJobZip(
  jobId
) {
  const response =
    await fetch(
      `${API_BASE_URL}/jobs/${jobId}/download`,
      {
        credentials: "include",
      }
    );

  if (!response.ok) {
    let message =
      "Could not download ZIP.";

    try {
      const data =
        await response.json();

      message =
        data.message ||
        message;
    } catch {
      // Keep default message.
    }

    throw new Error(
      message
    );
  }

  return response.blob();
}

export async function getConversionHistory() {
  const response =
    await fetch(
      `${API_BASE_URL}/jobs/my`,
      {
        credentials: "include",
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Could not load conversion history."
    );
  }

  return data.jobs;
}

export async function deleteConversionHistory(
  jobId
) {
  const response =
    await fetch(
      `${API_BASE_URL}/jobs/history/${jobId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Could not delete conversion history."
    );
  }

  return data;
}

export async function register(
  email,
  password
) {
  const response =
    await fetch(
      `${API_BASE_URL}/auth/register`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        credentials:
          "include",
        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Registration failed."
    );
  }

  return data;
}

export async function login(
  email,
  password
) {
  const response =
    await fetch(
      `${API_BASE_URL}/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        credentials:
          "include",
        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Login failed."
    );
  }

  return data;
}

export async function logout() {
  const response =
    await fetch(
      `${API_BASE_URL}/auth/logout`,
      {
        method: "POST",
        credentials:
          "include",
      }
    );

  return response.json();
}

export async function getCurrentUser() {
  const response =
    await fetch(
      `${API_BASE_URL}/auth/me`,
      {
        credentials:
          "include",
      }
    );

  if (!response.ok) {
    return null;
  }

  const data =
    await response.json();

  return data.user;
}

export async function getMyJobs() {
  const response =
    await fetch(
      `${API_BASE_URL}/jobs/my`,
      {
        credentials:
          "include",
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Could not load conversion history."
    );
  }

  return data.jobs;
}

export async function downloadJobFile(
  jobId,
  fileId
) {
  const response =
    await fetch(
      `${API_BASE_URL}/jobs/${jobId}/files/${fileId}/download`,
      {
        credentials: "include",
      }
    );

  if (!response.ok) {
    let message = "Could not download the converted file.";

    try {
      const data = await response.json();
      message = data.message || message;
    } catch {
      // Keep the fallback message when a non-JSON error is returned.
    }

    throw new Error(message);
  }

  return response.blob();
}

export async function deleteMyJob(jobId) {
  const response =
    await fetch(
      `${API_BASE_URL}/jobs/my/${jobId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Could not delete conversion."
    );
  }

  return data;
}

export async function verifyLoginCode(
  email,
  code
) {
  const response =
    await fetch(
      `${API_BASE_URL}/auth/verify-login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          code,
        }),
      }
    );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Could not verify the code."
    );
  }

  return data;
}

export async function requestPasswordReset(email) {
  const response = await fetch(`${API_BASE_URL}/auth/request-password-reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Could not request a reset code.");
  }
}

export async function resetPassword(email, code, password) {
  const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code, password }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Could not reset password.");
  }
}

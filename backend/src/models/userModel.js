import crypto from "crypto";

function getConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase is not configured on the backend.");
  }

  return { url, key };
}

async function supabase(path, options = {}) {
  const { url, key } = getConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

export async function createUser(email, passwordHash) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const rows = await supabase("convertflow_users", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify([{
      id,
      email,
      password_hash: passwordHash,
      created_at: createdAt,
    }]),
  });

  const row = rows[0];
  return {
    id: row.id,
    email: row.email,
    createdAt: row.created_at,
  };
}

export async function findUserByEmail(email) {
  const rows = await supabase(
    `convertflow_users?select=*&email=eq.${encodeURIComponent(email)}&limit=1`
  );
  return rows[0] || null;
}

export async function findUserById(id) {
  const rows = await supabase(
    `convertflow_users?select=id,email,created_at&id=eq.${encodeURIComponent(id)}&limit=1`
  );
  return rows[0] || null;
}

export async function updateUserPassword(id, passwordHash) {
  await supabase(`convertflow_users?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ password_hash: passwordHash }),
  });
}

export async function recordLoginEvent(user, event) {
  await supabase("login_events", {
    method: "POST",
    body: JSON.stringify([{
      id: crypto.randomUUID(),
      user_id: user.id,
      email: user.email,
      event,
      created_at: new Date().toISOString(),
    }]),
    headers: { Prefer: "return=minimal" },
  });
}

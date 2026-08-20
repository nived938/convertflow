import crypto from "crypto";

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return url && key ? { url, key } : null;
}

async function request(path, method, body, headers = {}) {
  const config = getSupabaseConfig();

  if (!config) {
    return;
  }

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Supabase audit request failed with ${response.status}`);
  }
}

export function syncUserToSupabase(user) {
  return request(
    "convertflow_users?on_conflict=id",
    "POST",
    [{
      id: user.id,
      email: user.email,
      created_at: user.createdAt || new Date().toISOString(),
    }],
    { Prefer: "resolution=merge-duplicates,return=minimal" }
  );
}

export function recordLoginEvent(user, event) {
  return request(
    "login_events",
    "POST",
    [{
      id: crypto.randomUUID(),
      user_id: user.id,
      email: user.email,
      event,
      created_at: new Date().toISOString(),
    }],
    { Prefer: "return=minimal" }
  );
}

export function logSupabaseFailure(context, error) {
  console.error(`Supabase ${context} sync failed:`, error.message);
}

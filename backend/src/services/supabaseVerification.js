function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured.");
  return { url, key };
}

async function request(path, options = {}) {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`Supabase verification request failed with ${response.status}: ${await response.text()}`);
  if (response.status === 204) return null;
  return response.json();
}

export const supabaseVerification = {
  async upsert({ userId, type, codeHash, expiresAt, attempts }) {
    return request("verification_codes?on_conflict=user_id,type", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{ user_id: userId, type, code_hash: codeHash, expires_at: expiresAt, attempts, created_at: new Date().toISOString() }]),
    });
  },
  async find(userId, type) {
    const rows = await request(`verification_codes?select=*&user_id=eq.${encodeURIComponent(userId)}&type=eq.${encodeURIComponent(type)}&limit=1`);
    return rows[0] || null;
  },
  async incrementAttempts(userId, type, attempts) {
    return request(`verification_codes?user_id=eq.${encodeURIComponent(userId)}&type=eq.${encodeURIComponent(type)}`, {
      method: "PATCH",
      body: JSON.stringify({ attempts }),
    });
  },
  async remove(userId, type) {
    return request(`verification_codes?user_id=eq.${encodeURIComponent(userId)}&type=eq.${encodeURIComponent(type)}`, { method: "DELETE" });
  },
};

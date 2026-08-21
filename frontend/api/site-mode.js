export default async function handler(req, res) {
  const supabaseUrl = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const anonKey = String(process.env.SUPABASE_ANON_KEY || '');
  if (!supabaseUrl || !anonKey) return res.status(503).json({ success: false, mode: 'normal', backendEnabled: true, message: 'Site mode is not configured.' });
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/site_control?id=eq.1&select=mode,backend_enabled,updated_at`, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
    const data = await response.json().catch(() => []);
    if (!response.ok || !Array.isArray(data) || !data[0]) return res.status(502).json({ success: false, mode: 'normal', backendEnabled: true, message: 'Could not read site control.' });
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Vary', 'Origin');
    return res.status(200).json({ success: true, mode: data[0].mode, backendEnabled: data[0].backend_enabled !== false, updatedAt: data[0].updated_at });
  } catch {
    return res.status(502).json({ success: false, mode: 'normal', backendEnabled: true, message: 'Could not reach site control database.' });
  }
}

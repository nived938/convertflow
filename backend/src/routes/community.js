import express from "express";
import crypto from "crypto";
import { sb, verifyAdminToken, writeLog } from "./admin.js";

const router = express.Router();

function requireAdmin(req, res, next) {
  const h = String(req.headers.authorization || "");
  const t = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!verifyAdminToken(t)) {
    return res.status(401).json({ success: false, message: "Unauthorized or expired admin session." });
  }
  next();
}

async function supabaseError(response, fallback) {
  const text = await response.text().catch(() => "");
  let detail = "";
  try {
    const parsed = JSON.parse(text);
    detail = parsed?.message || parsed?.details || parsed?.hint || parsed?.error || "";
  } catch {}
  return new Error(detail ? `${fallback} ${detail}` : fallback);
}

router.get("/announcement", async (_req, res) => {
  try {
    const r = await sb("/rest/v1/convertflow_announcement?id=eq.1&select=id,enabled,title,message,type,updated_at");
    if (!r.ok) {
      const error = await supabaseError(r, "Could not load announcement.");
      console.error("Announcement GET:", error.message);
      // Keep the public site working if the optional announcement table has not
      // been created yet. Admin can still see the real database error when saving.
      return res.json({
        success: true,
        configured: false,
        announcement: { enabled: false, title: "", message: "", type: "info" },
        message: "Announcement storage is not configured yet."
      });
    }
    const d = await r.json().catch(() => []);
    return res.json({
      success: true,
      configured: true,
      announcement: d[0] || { enabled: false, title: "", message: "", type: "info" }
    });
  } catch (e) {
    console.error("Announcement GET:", e);
    return res.json({
      success: true,
      configured: false,
      announcement: { enabled: false, title: "", message: "", type: "info" },
      message: e.message || "Announcement storage is not configured yet."
    });
  }
});

router.put("/announcement", requireAdmin, async (req, res) => {
  try {
    const enabled = req.body?.enabled !== false;
    const title = String(req.body?.title || "").trim().slice(0, 120);
    const message = String(req.body?.message || "").trim().slice(0, 500);
    const type = ["info", "success", "warning", "danger"].includes(req.body?.type) ? req.body.type : "info";

    const r = await sb("/rest/v1/convertflow_announcement?id=eq.1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ enabled, title, message, type, updated_at: new Date().toISOString() })
    });

    if (!r.ok) {
      const error = await supabaseError(r, "Could not save announcement.");
      throw Object.assign(error, { statusCode: 502 });
    }

    await writeLog("success", "announcement.updated", enabled ? "Announcement published" : "Announcement disabled", { title, type });
    return res.json({ success: true, configured: true, announcement: { enabled, title, message, type } });
  } catch (e) {
    console.error("Announcement PUT:", e);
    return res.status(e.statusCode || 502).json({
      success: false,
      message: e.message || "Could not save announcement.",
      needsMigration: /relation|table|schema cache|does not exist/i.test(String(e.message || ""))
    });
  }
});

router.post("/donations", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim().replace(/[<>]/g, "").slice(0, 80);
    if (!name) return res.status(400).json({ success: false, message: "Name is required." });

    const r = await sb("/rest/v1/convertflow_donation_requests", {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ id: crypto.randomUUID(), name, status: "pending" })
    });

    if (!r.ok) throw await supabaseError(r, "Could not save supporter information.");
    await writeLog("success", "donation.started", "Donation flow started", { name });
    return res.json({ success: true });
  } catch (e) {
    console.error("Donation request:", e);
    return res.status(502).json({
      success: false,
      message: e.message || "Could not save supporter information.",
      needsMigration: /relation|table|schema cache|does not exist/i.test(String(e.message || ""))
    });
  }
});

router.get("/supporters", async (_req, res) => {
  try {
    const r = await sb("/rest/v1/convertflow_supporters?visible=eq.true&order=sort_order.asc,created_at.desc&select=id,name");
    if (!r.ok) throw await supabaseError(r, "Could not load supporters.");
    const d = await r.json().catch(() => []);
    return res.json({ success: true, supporters: d });
  } catch (e) {
    console.error("Supporters GET:", e);
    return res.json({ success: true, supporters: [] });
  }
});

router.get("/admin/donations", requireAdmin, async (_req, res) => {
  try {
    const r = await sb("/rest/v1/convertflow_donation_requests?order=created_at.desc&select=id,name,status,created_at,updated_at");
    if (!r.ok) throw await supabaseError(r, "Could not load donation requests.");
    const d = await r.json().catch(() => []);
    return res.json({ success: true, donations: d });
  } catch (e) {
    return res.status(502).json({ success: false, message: e.message || "Could not load donation requests." });
  }
});

router.get("/admin/supporters", requireAdmin, async (_req, res) => {
  try {
    const r = await sb("/rest/v1/convertflow_supporters?order=sort_order.asc,created_at.desc&select=id,name,visible,sort_order,created_at");
    if (!r.ok) throw await supabaseError(r, "Could not load supporters.");
    const d = await r.json().catch(() => []);
    return res.json({ success: true, supporters: d });
  } catch (e) {
    return res.status(502).json({ success: false, message: e.message || "Could not load supporters." });
  }
});

router.post("/admin/supporters", requireAdmin, async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim().replace(/[<>]/g, "").slice(0, 80);
    if (!name) return res.status(400).json({ success: false, message: "Name is required." });
    const r = await sb("/rest/v1/convertflow_supporters", {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({ name, visible: true, sort_order: 0 })
    });
    if (!r.ok) throw await supabaseError(r, "Could not add supporter.");
    await writeLog("success", "supporter.added", "Supporter added", { name });
    return res.json({ success: true });
  } catch (e) {
    return res.status(502).json({ success: false, message: e.message || "Could not add supporter." });
  }
});

router.delete("/admin/supporters/:id", requireAdmin, async (req, res) => {
  try {
    const r = await sb(`/rest/v1/convertflow_supporters?id=eq.${encodeURIComponent(req.params.id)}`, { method: "DELETE" });
    if (!r.ok) throw await supabaseError(r, "Could not remove supporter.");
    await writeLog("warning", "supporter.removed", "Supporter removed", { id: req.params.id });
    return res.json({ success: true });
  } catch (e) {
    return res.status(502).json({ success: false, message: e.message || "Could not remove supporter." });
  }
});

export default router;

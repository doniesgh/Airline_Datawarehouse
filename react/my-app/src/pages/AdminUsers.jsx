import { useEffect, useState } from "react";
import { auth } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

const C = {
  navy: "#0f2044",
  navyMid: "#1a3060",
  gold: "#c9a84c",
  white: "#ffffff",
  text: "#c8d6f0",
  textMuted: "#7a96c0",
  glassBorder: "rgba(255,255,255,0.15)",
  pos: "#16a34a",
  neg: "#dc2626",
};

const ROLES = ["passenger", "manager", "admin"];

const roleColor = (r) =>
  r === "admin" ? C.neg : r === "manager" ? C.gold : C.pos;

function CreateForm({ onCreated }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "manager" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const u = await auth.createUser(form);
      setForm({ name: "", email: "", password: "", role: "manager" });
      onCreated(u);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Could not create user");
    } finally { setBusy(false); }
  };

  const fieldStyle = {
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${C.glassBorder}`, color: C.white,
    borderRadius: 8, padding: "10px 12px", fontSize: 13,
    fontFamily: "inherit", outline: "none",
  };

  return (
    <form onSubmit={submit} style={{
      background: "rgba(255,255,255,0.03)", border: `1px solid ${C.glassBorder}`,
      borderRadius: 12, padding: 18, marginBottom: 24,
    }}>
      <div style={{ color: C.gold, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginBottom: 12 }}>
        Add a user
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
        <input style={fieldStyle} placeholder="Full name" value={form.name} required
               onChange={(e) => update("name", e.target.value)} />
        <input style={fieldStyle} placeholder="Email" type="email" value={form.email} required
               onChange={(e) => update("email", e.target.value)} />
        <input style={fieldStyle} placeholder="Password" type="password" value={form.password} required minLength={6}
               onChange={(e) => update("password", e.target.value)} />
        <select style={fieldStyle} value={form.role}
                onChange={(e) => update("role", e.target.value)}>
          {ROLES.map(r => <option key={r} value={r} style={{ background: C.navy }}>{r}</option>)}
        </select>
        <button type="submit" className="sv-btn-gold" disabled={busy}
                style={{ padding: "10px 18px", fontSize: 12 }}>
          {busy ? "Creating…" : "Create user"}
        </button>
      </div>
      {err && <div style={{ marginTop: 10, color: C.neg, fontSize: 12 }}>{err}</div>}
    </form>
  );
}

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      const r = await auth.listUsers();
      setRows(r.items || []);
      setErr("");
    } catch (e) {
      setErr(e?.response?.data?.detail || "Cannot load users");
    }
  };

  useEffect(() => { load(); }, []);

  const changeRole = async (id, role) => {
    await auth.updateRole(id, role).catch((e) => alert(e?.response?.data?.detail || "Failed"));
    load();
  };

  const remove = async (id, email) => {
    if (!confirm(`Delete ${email}?`)) return;
    await auth.deleteUser(id).catch((e) => alert(e?.response?.data?.detail || "Failed"));
    load();
  };

  return (
    <div style={{ minHeight: "100vh", padding: "120px 32px 80px", maxWidth: 1180, margin: "0 auto" }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 12, letterSpacing: 4, color: C.gold, textTransform: "uppercase",
      }}>Administration</div>
      <h1 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "clamp(34px,5vw,52px)", color: C.white, fontWeight: 600,
        margin: "8px 0 4px",
      }}>Users & Roles</h1>
      <div style={{ color: C.textMuted, fontSize: 14, maxWidth: 640, marginBottom: 24 }}>
        Manage who can access the platform and what they can see. Passenger, Manager, and Admin
        roles each unlock a different surface.
      </div>

      <CreateForm onCreated={load} />

      {err && (
        <div style={{
          marginBottom: 16, padding: "10px 14px",
          background: `${C.neg}22`, border: `1px solid ${C.neg}55`,
          borderRadius: 8, color: C.neg, fontSize: 13,
        }}>{err}</div>
      )}

      <div style={{
        background: "rgba(255,255,255,0.03)", border: `1px solid ${C.glassBorder}`,
        borderRadius: 12, padding: 14, overflowX: "auto",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", color: C.text }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: `1px solid ${C.glassBorder}` }}>
              {["Name", "Email", "Role", "Status", ""].map((h) => (
                <th key={h} style={{
                  padding: "10px 8px", fontSize: 11, letterSpacing: 2,
                  textTransform: "uppercase", color: C.gold,
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <td style={{ padding: "10px 8px", fontSize: 13, color: C.white }}>{u.name}</td>
                <td style={{ padding: "10px 8px", fontSize: 12, color: C.textMuted }}>{u.email || "—"}</td>
                <td style={{ padding: "10px 8px" }}>
                  <select value={u.role}
                          disabled={u.id === me?.id}
                          onChange={(e) => changeRole(u.id, e.target.value)}
                          style={{
                            background: "rgba(255,255,255,0.04)",
                            color: roleColor(u.role),
                            border: `1px solid ${roleColor(u.role)}55`,
                            borderRadius: 6, padding: "5px 8px", fontSize: 12,
                            fontWeight: 700, textTransform: "uppercase",
                          }}>
                    {ROLES.map(r => <option key={r} value={r} style={{ background: C.navy, color: C.white }}>{r}</option>)}
                  </select>
                </td>
                <td style={{ padding: "10px 8px", fontSize: 12 }}>
                  <span style={{ color: u.active ? C.pos : C.textMuted }}>
                    {u.active ? "Active" : "Disabled"}
                  </span>
                </td>
                <td style={{ padding: "10px 8px", textAlign: "right" }}>
                  <button onClick={() => remove(u.id, u.email)}
                          disabled={u.id === me?.id}
                          style={{
                            background: "transparent", color: C.neg,
                            border: `1px solid ${C.neg}55`,
                            borderRadius: 6, padding: "5px 10px", fontSize: 11,
                            cursor: u.id === me?.id ? "not-allowed" : "pointer",
                            opacity: u.id === me?.id ? 0.4 : 1,
                          }}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

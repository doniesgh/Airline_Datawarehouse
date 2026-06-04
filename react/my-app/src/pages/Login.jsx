import { useRef, useState } from "react";
import Webcam from "react-webcam";
import { useAuth } from "../contexts/AuthContext";
import { auth as authApi } from "../services/api";

const C = {
  navy: "#0f2044",
  navyMid: "#1a3060",
  gold: "#c9a84c",
  goldLight: "#e8c97a",
  goldDark: "#9b7a2f",
  white: "#ffffff",
  text: "#c8d6f0",
  textMuted: "#7a96c0",
  glassBorder: "rgba(255,255,255,0.15)",
  pos: "#16a34a",
  neg: "#dc2626",
};

const Field = ({ label, ...rest }) => (
  <label style={{ display: "block", marginBottom: 14 }}>
    <div style={{
      fontFamily: "'Barlow Condensed', sans-serif",
      fontSize: 11, letterSpacing: 2, color: C.gold,
      textTransform: "uppercase", marginBottom: 6,
    }}>{label}</div>
    <input {...rest} style={{
      width: "100%", background: "rgba(255,255,255,0.04)",
      border: `1px solid ${C.glassBorder}`, color: C.white,
      borderRadius: 8, padding: "12px 14px", fontSize: 14,
      fontFamily: "inherit", outline: "none",
    }} />
  </label>
);

function PasswordTab({ onDone, onError }) {
  const { loginPassword, signup } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); onError("");
    try {
      const user = mode === "login"
        ? await loginPassword(form.email, form.password)
        : await signup({ name: form.name, email: form.email, password: form.password });
      onDone(user);
    } catch (err) {
      onError(err?.response?.data?.detail || "Authentication failed");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit}>
      {mode === "signup" && (
        <Field label="Full name" value={form.name} required
               onChange={(e) => update("name", e.target.value)} />
      )}
      <Field label="Email" type="email" value={form.email} required
             onChange={(e) => update("email", e.target.value)} />
      <Field label="Password" type="password" value={form.password} required minLength={6}
             onChange={(e) => update("password", e.target.value)} />
      <button type="submit" className="sv-btn-gold" disabled={busy}
              style={{ width: "100%", padding: "12px", fontSize: 13, marginTop: 6 }}>
        {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
      <div style={{ marginTop: 14, fontSize: 12, color: C.textMuted, textAlign: "center" }}>
        {mode === "login" ? (
          <>Don't have an account?{" "}
            <span onClick={() => setMode("signup")}
                  style={{ color: C.gold, cursor: "pointer", textDecoration: "underline" }}>
              Sign up
            </span>
          </>
        ) : (
          <>Already registered?{" "}
            <span onClick={() => setMode("login")}
                  style={{ color: C.gold, cursor: "pointer", textDecoration: "underline" }}>
              Sign in
            </span>
          </>
        )}
      </div>
    </form>
  );
}

function FaceTab({ onDone, onError }) {
  const webcamRef = useRef(null);
  const { loginFace, signup } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const grabDescriptor = async () => {
    if (!webcamRef.current) throw new Error("Camera not ready");
    const image = webcamRef.current.getScreenshot();
    if (!image) throw new Error("Camera not ready");
    const { descriptor } = await authApi.extractDescriptor(image);
    return { descriptor, image };
  };

  const signIn = async () => {
    setBusy(true); onError("");
    try {
      const { descriptor } = await grabDescriptor();
      onDone(await loginFace(descriptor));
    } catch (err) {
      onError(err?.response?.data?.detail || err?.message || "Face not recognized");
    } finally { setBusy(false); }
  };

  const signUp = async (e) => {
    e.preventDefault();
    setBusy(true); onError("");
    try {
      const { descriptor, image } = await grabDescriptor();
      const user = await signup({
        name: form.name, email: form.email, password: form.password,
        descriptor, photo: image,
      });
      onDone(user);
    } catch (err) {
      onError(err?.response?.data?.detail || err?.message || "Sign-up failed");
    } finally { setBusy(false); }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[["login", "Sign in"], ["signup", "Sign up"]].map(([k, label]) => (
          <button key={k} type="button" onClick={() => { setMode(k); onError(""); }}
            style={{
              flex: 1, padding: "7px 10px",
              background: mode === k ? `${C.gold}22` : "transparent",
              color: mode === k ? C.gold : C.textMuted,
              border: `1px solid ${mode === k ? C.gold : C.glassBorder}`,
              borderRadius: 6, cursor: "pointer", fontSize: 11,
              letterSpacing: 1, textTransform: "uppercase",
              fontFamily: "'Barlow Condensed', sans-serif",
            }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{
        borderRadius: 12, overflow: "hidden", border: `1px solid ${C.glassBorder}`,
        background: "#000", aspectRatio: "4/3", marginBottom: 14,
      }}>
        <Webcam ref={webcamRef} screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "user" }}
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>

      {mode === "login" && (
        <>
          <button type="button" className="sv-btn-gold" onClick={signIn} disabled={busy}
                  style={{ width: "100%", padding: "12px", fontSize: 13 }}>
            {busy ? "Verifying…" : "Sign in with face"}
          </button>
          <div style={{ marginTop: 10, fontSize: 11, color: C.textMuted, textAlign: "center" }}>
            Your face is matched against the user database. No image is stored.
          </div>
        </>
      )}

      {mode === "signup" && (
        <form onSubmit={signUp}>
          <Field label="Full name" value={form.name} required
                 onChange={(e) => update("name", e.target.value)} />
          <Field label="Email" type="email" value={form.email} required
                 onChange={(e) => update("email", e.target.value)} />
          <Field label="Password" type="password" value={form.password} required minLength={6}
                 onChange={(e) => update("password", e.target.value)} />
          <button type="submit" className="sv-btn-gold" disabled={busy}
                  style={{ width: "100%", padding: "12px", fontSize: 13 }}>
            {busy ? "Creating account…" : "Sign up with face"}
          </button>
          <div style={{ marginTop: 10, fontSize: 11, color: C.textMuted, textAlign: "center" }}>
            We store your face descriptor next to your account so you can sign in either way.
          </div>
        </form>
      )}
    </div>
  );
}

export default function LoginPage({ setPage }) {
  const [tab, setTab] = useState("password");
  const [err, setErr] = useState("");

  const onDone = (user) => {
    if (user.role === "manager" || user.role === "admin") setPage("insights");
    else setPage("home");
  };

  return (
    <div style={{
      minHeight: "100vh", paddingTop: 120, paddingBottom: 60,
      display: "flex", alignItems: "flex-start", justifyContent: "center",
    }}>
      <div style={{
        width: "min(440px, 92vw)",
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${C.glassBorder}`,
        borderRadius: 16, padding: 32, backdropFilter: "blur(20px)",
      }}>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: 12, letterSpacing: 4, color: C.gold, textTransform: "uppercase",
        }}>SkyVoyage</div>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 30, color: C.white, fontWeight: 600, margin: "6px 0 4px",
        }}>Welcome back</h1>
        <div style={{ width: 60, height: 2, background: `linear-gradient(90deg, ${C.gold}, transparent)`, margin: "10px 0 22px" }} />

        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[["password", "Email"], ["face", "Face ID"]].map(([k, label]) => (
            <button key={k} onClick={() => { setTab(k); setErr(""); }}
              style={{
                flex: 1, padding: "10px 12px",
                background: tab === k ? C.gold : "transparent",
                color: tab === k ? C.navy : C.text,
                border: `1px solid ${tab === k ? C.gold : C.glassBorder}`,
                borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 12,
                letterSpacing: 1, textTransform: "uppercase",
                fontFamily: "'Barlow Condensed', sans-serif",
              }}>
              {label}
            </button>
          ))}
        </div>

        {tab === "password"
          ? <PasswordTab onDone={onDone} onError={setErr} />
          : <FaceTab     onDone={onDone} onError={setErr} />}

        {err && (
          <div style={{
            marginTop: 14, padding: "10px 12px",
            background: `${C.neg}22`, border: `1px solid ${C.neg}55`,
            borderRadius: 8, color: C.neg, fontSize: 12,
          }}>{err}</div>
        )}
      </div>
    </div>
  );
}

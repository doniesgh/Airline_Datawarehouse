import { useState } from "react";
import { nlp } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

const C = {
  navy: "#0f2044",
  navyMid: "#1a3060",
  gold: "#c9a84c",
  goldDark: "#9b7a2f",
  white: "#ffffff",
  text: "#c8d6f0",
  textMuted: "#7a96c0",
  glassBorder: "rgba(255,255,255,0.15)",
  pos: "#16a34a",
  neg: "#dc2626",
  mix: "#d97706",
};

const messageFor = (r) => {
  if (r.churn_signal) {
    return {
      title: "We don't want to lose you.",
      body:  "A customer-care specialist will reach out within 24h with a personalised recovery offer.",
      color: C.neg,
    };
  }
  if (r.overall_sentiment === "negative" || r.is_mixed) {
    const reco = r.recommendations?.[0] || "We'll make it right.";
    return {
      title: "We're sorry to hear that.",
      body:  `${reco}. A confirmation will be sent to your inbox.`,
      color: C.mix,
    };
  }
  if (r.overall_sentiment === "positive") {
    return {
      title: "Thank you for flying with us!",
      body:  "Join Horizon Rewards and earn 500 bonus miles today.",
      color: C.pos,
    };
  }
  return {
    title: "Thanks for the feedback.",
    body:  "Every signal helps us improve your next journey.",
    color: C.gold,
  };
};

export default function FeedbackWidget() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!text.trim()) return;
    setLoading(true); setErr("");
    try {
      if (isAuthenticated) {
        const r = await nlp.submitFeedback(text);
        setResult(r.analysis);
      } else {
        const r = await nlp.analyze(text);
        setResult(r);
      }
    } catch (e) {
      setErr("We couldn't process your feedback right now.");
    }
    setLoading(false);
  };

  const reset = () => { setText(""); setResult(null); setErr(""); };

  return (
    <>
      <button onClick={() => setOpen(true)} style={{
        position: "fixed", bottom: 28, right: 96, zIndex: 1999,
        height: 56, padding: "0 20px", borderRadius: 28,
        background: C.navyMid, color: C.gold,
        border: `1px solid ${C.gold}`, cursor: "pointer",
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 13, letterSpacing: 2, textTransform: "uppercase",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}>
        Share feedback
      </button>

      {open && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => { setOpen(false); reset(); }}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: C.navyMid, border: `1px solid ${C.glassBorder}`,
            borderRadius: 16, width: "min(520px, 92vw)",
            padding: 32, animation: "fadeUp 0.3s ease",
          }}>
            {!result && (
              <>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 11, letterSpacing: 4, color: C.gold,
                  textTransform: "uppercase",
                }}>Voice of customer</div>
                <h3 style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 26, color: C.white, fontWeight: 600,
                  margin: "6px 0 4px",
                }}>How was your journey?</h3>
                <div style={{ width: 60, height: 2, background: `linear-gradient(90deg, ${C.gold}, transparent)`, margin: "10px 0 18px" }} />

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Tell us in a sentence or two — the food, the staff, the delays, anything."
                  rows={5}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.04)",
                    border: `1px solid ${C.glassBorder}`, color: C.white,
                    borderRadius: 10, padding: 14, fontSize: 14,
                    fontFamily: "inherit", resize: "vertical", outline: "none",
                  }}
                />

                {err && <div style={{ color: C.neg, fontSize: 12, marginTop: 10 }}>{err}</div>}

                <div style={{ display: "flex", gap: 12, marginTop: 16, justifyContent: "flex-end" }}>
                  <button className="sv-btn-outline"
                    onClick={() => { setOpen(false); reset(); }}
                    style={{ padding: "10px 22px", fontSize: 12 }}>
                    Cancel
                  </button>
                  <button className="sv-btn-gold"
                    onClick={submit}
                    disabled={loading || !text.trim()}
                    style={{ padding: "10px 22px", fontSize: 12 }}>
                    {loading ? "Analyzing…" : "Send feedback"}
                  </button>
                </div>
              </>
            )}

            {result && (() => {
              const m = messageFor(result);
              return (
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: "50%",
                    background: `${m.color}22`, border: `1px solid ${m.color}55`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 18px", fontSize: 30, color: m.color,
                  }}>
                    {result.overall_sentiment === "positive" ? "✓" :
                     result.churn_signal ? "!" :
                     result.overall_sentiment === "negative" ? "↺" : "i"}
                  </div>

                  <h3 style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 24, color: C.white, fontWeight: 600, marginBottom: 8,
                  }}>{m.title}</h3>
                  <div style={{ color: C.text, fontSize: 14, lineHeight: 1.7, padding: "0 6px" }}>
                    {m.body}
                  </div>

                  <div style={{
                    marginTop: 18, padding: "10px 14px",
                    background: `${m.color}11`, border: `1px solid ${m.color}33`,
                    borderRadius: 8, fontSize: 11, color: C.textMuted,
                    fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: 1,
                  }}>
                    SENTIMENT: <span style={{ color: m.color, fontWeight: 700, textTransform: "uppercase" }}>{result.overall_sentiment}</span>
                    {result.emotion && result.emotion !== "neutral" && (
                      <> · EMOTION: <span style={{ color: m.color, fontWeight: 700, textTransform: "uppercase" }}>{result.emotion}</span></>
                    )}
                  </div>

                  <button className="sv-btn-gold"
                    onClick={() => { setOpen(false); reset(); }}
                    style={{ marginTop: 20, padding: "10px 24px", fontSize: 12 }}>
                    Continue
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}

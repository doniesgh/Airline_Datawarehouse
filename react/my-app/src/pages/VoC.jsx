import { useEffect, useRef, useState } from "react";
import { nlp } from "../services/api";
import { cached, getCachedSync } from "../services/cache";

const feedKey = (f) => `nlp.feed:${f.sentiment}|${f.churn_only}|${f.live_only}`;

const C = {
  navy: "#0f2044",
  navyMid: "#1a3060",
  gold: "#c9a84c",
  goldLight: "#e8c97a",
  white: "#ffffff",
  text: "#c8d6f0",
  textMuted: "#7a96c0",
  glassBorder: "rgba(255,255,255,0.15)",
  pos: "#16a34a",
  neg: "#dc2626",
  neu: "#6b7280",
  mix: "#d97706",
};

const ASPECT_LABEL = {
  food: "Food & beverage",
  delays: "Delays / cancellations",
  staff: "Staff & crew",
  seat_comfort: "Seat comfort",
  baggage: "Baggage",
  check_in: "Check-in / boarding",
  wifi: "Wi-Fi",
};

const COMPLAINT_LABEL = {
  delays_cancellations: "Delays / cancellations",
  baggage_issues: "Baggage",
  staff_service: "Staff & service",
  seat_comfort: "Seat comfort",
  check_in_boarding: "Check-in / boarding",
  food_quality: "Food quality",
  wifi_entertainment: "Wi-Fi / entertainment",
  booking_refund: "Booking / refund",
  other: "Other",
};

const sentColor = (s) =>
  s === "positive" ? C.pos : s === "negative" ? C.neg : s === "mixed" ? C.mix : C.neu;

function Spinner({ size = 18, color = "#c9a84c" }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size,
      borderRadius: "50%",
      border: `2px solid ${color}33`,
      borderTopColor: color,
      animation: "spin 0.8s linear infinite",
    }} />
  );
}

function FullPageLoader({ label }) {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 16,
    }}>
      <Spinner size={36} />
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 13, letterSpacing: 4, color: C.gold, textTransform: "uppercase",
      }}>{label || "Loading"}</div>
    </div>
  );
}

function UpdatingPill() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "6px 12px", borderRadius: 20,
      background: "rgba(201,168,76,0.12)",
      border: "1px solid rgba(201,168,76,0.4)",
      color: C.gold, fontSize: 11,
      fontFamily: "'Barlow Condensed', sans-serif",
      letterSpacing: 1.5, textTransform: "uppercase",
    }}>
      <Spinner size={10} /> Updating
    </span>
  );
}

function Pill({ children, color }) {
  return (
    <span style={{
      background: `${color}22`, color, padding: "3px 10px",
      borderRadius: 999, fontSize: 11, fontWeight: 700,
      letterSpacing: 1, textTransform: "uppercase",
      border: `1px solid ${color}55`,
    }}>{children}</span>
  );
}

function KpiCard({ label, value, sub, accent = C.gold }) {
  return (
    <div style={{
      flex: "1 1 220px",
      background: "rgba(255,255,255,0.04)",
      border: `1px solid ${accent}55`,
      borderRadius: 12, padding: "20px 22px",
      backdropFilter: "blur(20px)",
    }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 11, letterSpacing: 3, color: accent,
        textTransform: "uppercase", marginBottom: 8,
      }}>{label}</div>
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 36, color: C.white, fontWeight: 600, lineHeight: 1,
      }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>{sub}</div>
      )}
    </div>
  );
}

function SectionTitle({ tag, title }) {
  return (
    <div style={{ margin: "32px 0 16px" }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 11, letterSpacing: 4, color: C.gold,
        textTransform: "uppercase",
      }}>{tag}</div>
      <div style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 26, color: C.white, fontWeight: 600, marginTop: 4,
      }}>{title}</div>
      <div style={{ width: 60, height: 2, background: `linear-gradient(90deg, ${C.gold}, transparent)`, marginTop: 10 }} />
    </div>
  );
}

function KpiStrip({ stats }) {
  if (!stats) return null;
  const total = stats.total || 0;
  const topComplaint = stats.complaints?.[0];
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <KpiCard
        label="Passenger satisfaction"
        value={`${stats.satisfaction_pct}%`}
        sub={`${stats.sentiment?.positive ?? 0} positive of ${total} feedbacks`}
        accent={C.pos}
      />
      <KpiCard
        label="Dissatisfaction"
        value={`${stats.dissatisfaction_pct}%`}
        sub={`${stats.sentiment?.negative ?? 0} negative tweets / reviews`}
        accent={C.neg}
      />
      <KpiCard
        label="Churn risk"
        value={`${stats.churn_rate}%`}
        sub="Passengers signaling intent to leave"
        accent={C.gold}
      />
      <KpiCard
        label="Top complaint"
        value={topComplaint ? COMPLAINT_LABEL[topComplaint.category] || topComplaint.category : "—"}
        sub={topComplaint ? `${topComplaint.count.toLocaleString()} mentions` : ""}
        accent={C.mix}
      />
    </div>
  );
}

function AspectBars({ aspects }) {
  if (!aspects?.length) return <div style={{ color: C.textMuted }}>No aspect data yet.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {aspects.map((a) => (
        <div key={a.aspect}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: C.white, fontSize: 13 }}>{ASPECT_LABEL[a.aspect] || a.aspect}</span>
            <span style={{ color: C.textMuted, fontSize: 12 }}>{a.count.toLocaleString()} mentions</span>
          </div>
          <div style={{
            display: "flex", height: 10, borderRadius: 6, overflow: "hidden",
            background: "rgba(255,255,255,0.06)", border: `1px solid ${C.glassBorder}`,
          }}>
            <div style={{ width: `${a.positive_pct}%`, background: C.pos }} title={`Positive ${a.positive_pct}%`} />
            <div style={{ width: `${a.neutral_pct}%`, background: C.neu }} title={`Neutral ${a.neutral_pct}%`} />
            <div style={{ width: `${a.negative_pct}%`, background: C.neg }} title={`Negative ${a.negative_pct}%`} />
          </div>
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.textMuted, marginTop: 4 }}>
            <span style={{ color: C.pos }}>● {a.positive_pct}% positive</span>
            <span style={{ color: C.neu }}>● {a.neutral_pct}% neutral</span>
            <span style={{ color: C.neg }}>● {a.negative_pct}% negative</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function FeedCard({ item }) {
  const negativeAspects = Object.entries(item.aspects || {})
    .filter(([, v]) => v).map(([k]) => ASPECT_LABEL[k] || k);
  return (
    <div style={{
      background: item.is_live ? "rgba(201,168,76,0.08)" : "rgba(255,255,255,0.04)",
      border: `1px solid ${item.is_live ? C.gold + "55" : C.glassBorder}`,
      borderLeft: `3px solid ${sentColor(item.pred_sentiment)}`,
      borderRadius: 10, padding: "14px 16px",
      position: "relative",
    }}>
      {item.is_live && (
        <div style={{
          position: "absolute", top: -1, right: 10,
          background: C.gold, color: C.navy,
          fontSize: 9, fontWeight: 800, letterSpacing: 1.5,
          padding: "2px 8px", borderRadius: "0 0 6px 6px",
        }}>
          ● LIVE
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Pill color={sentColor(item.pred_sentiment)}>{item.pred_sentiment}</Pill>
          {item.emotion && item.emotion !== "neutral" && (
            <Pill color="#7c3aed">{item.emotion}</Pill>
          )}
          {item.churn_signal && <Pill color={C.neg}>Churn risk</Pill>}
          {item.complaint_category && item.complaint_category !== "none" && (
            <Pill color={C.mix}>{COMPLAINT_LABEL[item.complaint_category] || item.complaint_category}</Pill>
          )}
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, textAlign: "right" }}>
          {item.is_live && item.user_name && (
            <div style={{ color: C.gold }}>{item.user_name}</div>
          )}
          <div>{item.airline || "—"} · {item.source}</div>
        </div>
      </div>
      <div style={{ color: C.text, fontSize: 13, lineHeight: 1.6 }}>
        {item.text?.slice(0, 280)}{item.text?.length > 280 ? "…" : ""}
      </div>
      {negativeAspects.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: C.textMuted }}>
          <b style={{ color: C.gold }}>Aspects:</b> {negativeAspects.join(" · ")}
        </div>
      )}
    </div>
  );
}

function DissatisfiedTable({ rows, onAction }) {
  if (!rows?.length) return <div style={{ color: C.textMuted }}>No dissatisfied passengers in the current window.</div>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", color: C.text }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: `1px solid ${C.glassBorder}` }}>
            <th style={{ padding: "10px 8px", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: C.gold }}>Passenger</th>
            <th style={{ padding: "10px 8px", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: C.gold }}>Airline</th>
            <th style={{ padding: "10px 8px", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: C.gold }}>Neg rate</th>
            <th style={{ padding: "10px 8px", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: C.gold }}>Tweets</th>
            <th style={{ padding: "10px 8px", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: C.gold }}>Recommended action</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.user_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <td style={{ padding: "10px 8px", fontSize: 13, color: C.white }}>{r.user_id}</td>
              <td style={{ padding: "10px 8px", fontSize: 12, color: C.textMuted }}>{r.last_airline || "—"}</td>
              <td style={{ padding: "10px 8px", fontSize: 12, color: C.neg, fontWeight: 600 }}>{Math.round(r.neg_rate * 100)}%</td>
              <td style={{ padding: "10px 8px", fontSize: 12 }}>{r.total}</td>
              <td style={{ padding: "10px 8px", fontSize: 12, maxWidth: 320 }}>
                {r.recommendations?.[0] || "General service follow-up"}
              </td>
              <td style={{ padding: "10px 8px" }}>
                <button className="sv-btn-gold"
                  onClick={() => onAction(r)}
                  style={{ padding: "6px 14px", fontSize: 11 }}>
                  Send offer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LiveAnalyzer() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const run = async () => {
    if (!text.trim()) return;
    setErr(""); setLoading(true);
    try {
      const r = await nlp.analyze(text);
      setResult(r);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Analysis failed.");
    }
    setLoading(false);
  };

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste a tweet, review or customer email here..."
        rows={4}
        style={{
          width: "100%", background: "rgba(255,255,255,0.04)",
          border: `1px solid ${C.glassBorder}`, color: C.white,
          borderRadius: 10, padding: 14, fontSize: 13, fontFamily: "inherit",
          resize: "vertical",
        }}
      />
      <div style={{ display: "flex", gap: 12, marginTop: 12, alignItems: "center" }}>
        <button className="sv-btn-gold" onClick={run} disabled={loading || !text.trim()}>
          {loading ? "Analyzing…" : "Analyze"}
        </button>
        {err && <span style={{ color: C.neg, fontSize: 12 }}>{err}</span>}
      </div>

      {result && (
        <div style={{ marginTop: 18 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ color: C.textMuted, fontSize: 12 }}>Overall</span>
            <Pill color={sentColor(result.overall_sentiment)}>
              {result.overall_sentiment} ({Math.round(result.confidence * 100)}%)
            </Pill>
            {result.is_mixed && <Pill color={C.mix}>Mixed</Pill>}
            {result.churn_signal && <Pill color={C.neg}>Churn risk</Pill>}
            {result.emotion && result.emotion !== "neutral" && <Pill color="#7c3aed">{result.emotion}</Pill>}
            {result.complaint_category && result.complaint_category !== "none" && (
              <Pill color={C.gold}>{COMPLAINT_LABEL[result.complaint_category] || result.complaint_category}</Pill>
            )}
          </div>

          {Object.keys(result.aspect_verdict || {}).length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ color: C.gold, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
                Aspect breakdown
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Object.entries(result.aspect_verdict).map(([a, v]) => (
                  <Pill key={a} color={sentColor(v)}>
                    {ASPECT_LABEL[a] || a}: {v}
                  </Pill>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <div style={{ color: C.gold, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
              Clause-by-clause
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {result.clauses.map((c, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", gap: 12,
                  background: "rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: 6,
                  borderLeft: `3px solid ${sentColor(c.sentiment)}`,
                }}>
                  <div style={{ color: C.text, fontSize: 13, fontStyle: "italic" }}>"{c.clause}"</div>
                  <Pill color={sentColor(c.sentiment)}>
                    {c.sentiment} {Math.round(c.confidence * 100)}%
                  </Pill>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ color: C.gold, fontSize: 12, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
              Recommended actions
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, color: C.text, fontSize: 13, lineHeight: 1.8 }}>
              {result.recommendations.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

const INIT_FILTER = { sentiment: "", churn_only: false, live_only: false };

export default function VoCPage() {
  const VISIBLE = 30;
  const POOL_SIZE = 200;

  const [filter, setFilter] = useState(INIT_FILTER);
  const [stats, setStats] = useState(() => getCachedSync("nlp.stats"));
  const [feed, setFeed] = useState(() => {
    const c = getCachedSync(feedKey(INIT_FILTER));
    return c?.items?.slice(0, VISIBLE) || [];
  });
  const [dissatisfied, setDissatisfied] = useState(() => {
    const c = getCachedSync("nlp.dissatisfied");
    return c?.items || [];
  });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(() => !getCachedSync("nlp.stats"));
  const poolRef = useRef(getCachedSync(feedKey(INIT_FILTER))?.items || []);
  const poolIdxRef = useRef(Math.min(VISIBLE, poolRef.current.length));

  useEffect(() => {
    let cancelled = false;
    const key = feedKey(filter);
    // Show full loader only when we have nothing to render for this filter.
    if (!getCachedSync(key)) setLoading(true);
    else setLoading(true); // brief "updating" pill — cleared in finally
    (async () => {
      try {
        const [s, f, d] = await Promise.all([
          cached("nlp.stats", () => nlp.stats()),
          cached(key, () => nlp.feed({
            limit: POOL_SIZE,
            sentiment: filter.sentiment || undefined,
            churn_only: filter.churn_only || undefined,
            live_only: filter.live_only || undefined,
          })),
          cached("nlp.dissatisfied", () => nlp.dissatisfied({ min_tweets: 3, limit: 15 })),
        ]);
        if (cancelled) return;
        const items = f.items || [];
        poolRef.current = items;
        poolIdxRef.current = Math.min(VISIBLE, items.length);
        setFeed(items.slice(0, VISIBLE));
        setStats(s);
        setDissatisfied(d.items || []);
        setErr("");
      } catch {
        if (!cancelled) setErr("Backend unreachable. Start FastAPI and run the CSV import script.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [filter]);

  // Simulated live stream: rotate a fresh card from the pool to the top every 4 s,
  // de-duped by id so the same tweet never appears twice.
  useEffect(() => {
    const t = setInterval(() => {
      const pool = poolRef.current;
      if (!pool.length) return;
      const next = pool[poolIdxRef.current % pool.length];
      poolIdxRef.current += 1;
      setFeed((prev) => {
        const filtered = prev.filter((x) => x.id !== next.id);
        return [next, ...filtered].slice(0, VISIBLE);
      });
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const sendOffer = async (row) => {
    await nlp.logAction({
      user_id: row.user_id,
      action: row.recommendations?.[0] || "Retention outreach",
      source: "voc_dashboard",
    }).catch(() => {});
    alert(`Retention offer queued for ${row.user_id}.`);
  };

  if (loading && !stats && !err) {
    return <FullPageLoader label="Loading Voice of Customer…" />;
  }

  return (
    <div style={{ minHeight: "100vh", padding: "120px 32px 80px", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 12, letterSpacing: 4, color: C.gold, textTransform: "uppercase",
      }}>Manager · NLP intelligence</div>
      <h1 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "clamp(34px,5vw,52px)", color: C.white, fontWeight: 600,
        margin: "8px 0 4px",
      }}>Voice of Customer</h1>
      <div style={{ color: C.textMuted, fontSize: 14, maxWidth: 760 }}>
        Live analysis of tweets and reviews. Identify satisfied and dissatisfied passengers,
        the drivers behind their sentiment, and the next best action to take.
      </div>

      {err && (
        <div style={{
          marginTop: 18, padding: "10px 14px", background: `${C.neg}22`,
          border: `1px solid ${C.neg}55`, borderRadius: 8, color: C.neg, fontSize: 13,
        }}>{err}</div>
      )}

      <div style={{ marginTop: 24 }}>
        <KpiStrip stats={stats} />
      </div>

      <SectionTitle tag="Analyse" title="Aspect heatmap" />
      <div style={{
        background: "rgba(255,255,255,0.03)", border: `1px solid ${C.glassBorder}`,
        borderRadius: 12, padding: 20,
      }}>
        <AspectBars aspects={stats?.aspects} />
      </div>

      <SectionTitle tag="Live feed" title="Customer feedback stream" />
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        {["", "negative", "neutral", "positive"].map((s) => (
          <button key={s || "all"}
            onClick={() => setFilter((f) => ({ ...f, sentiment: s }))}
            style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer",
              background: filter.sentiment === s ? C.gold : "transparent",
              color: filter.sentiment === s ? C.navy : C.text,
              border: `1px solid ${filter.sentiment === s ? C.gold : C.glassBorder}`,
              fontFamily: "'Barlow', sans-serif", letterSpacing: 0.5,
            }}>
            {s || "All"}
          </button>
        ))}
        <button
          onClick={() => setFilter((f) => ({ ...f, churn_only: !f.churn_only }))}
          style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer",
            background: filter.churn_only ? C.neg : "transparent",
            color: filter.churn_only ? C.white : C.text,
            border: `1px solid ${filter.churn_only ? C.neg : C.glassBorder}`,
          }}>
          Churn only
        </button>
        <button
          onClick={() => setFilter((f) => ({ ...f, live_only: !f.live_only }))}
          style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer",
            background: filter.live_only ? C.gold : "transparent",
            color: filter.live_only ? C.navy : C.text,
            border: `1px solid ${filter.live_only ? C.gold : C.glassBorder}`,
            fontWeight: filter.live_only ? 700 : 400,
          }}>
          ● Live submissions
        </button>
        {loading && <UpdatingPill />}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(360px,1fr))", gap: 12 }}>
        {feed.map((it) => <FeedCard key={it.id} item={it} />)}
      </div>

      <SectionTitle tag="Action" title="Dissatisfied frequent passengers" />
      <div style={{
        background: "rgba(255,255,255,0.03)", border: `1px solid ${C.glassBorder}`,
        borderRadius: 12, padding: 16,
      }}>
        <DissatisfiedTable rows={dissatisfied} onAction={sendOffer} />
      </div>

      <SectionTitle tag="Live analyzer" title="Analyze any text in real time" />
      <div style={{
        background: "rgba(255,255,255,0.03)", border: `1px solid ${C.glassBorder}`,
        borderRadius: 12, padding: 20,
      }}>
        <LiveAnalyzer />
      </div>
    </div>
  );
}

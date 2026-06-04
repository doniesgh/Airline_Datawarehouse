import { useEffect, useState } from "react";
import { loyalty } from "../services/api";

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
  mix: "#d97706",
  purple: "#7c3aed",
};

const fmtMoney = (v) =>
  typeof v === "number" ? `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—";

const riskColor = (r) =>
  r === "high" ? C.neg : r === "medium" ? C.mix : C.pos;

const RISK_LABEL = { low: "Low", medium: "Medium", high: "High" };
const RISK_ORDER = ["high", "medium", "low"];

function Spinner({ size = 18, color = "#c9a84c" }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size, borderRadius: "50%",
      border: `2px solid ${color}33`, borderTopColor: color,
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
      {sub && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 6 }}>{sub}</div>}
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

function CardClvBar({ rows }) {
  if (!rows?.length) return null;
  const max = Math.max(...rows.map(r => r.clv_avg));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {rows.map((r) => (
        <div key={r.card}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ color: C.white, fontSize: 13 }}>{r.card}</span>
            <span style={{ color: C.gold, fontSize: 12 }}>{fmtMoney(r.clv_avg)} · {r.count.toLocaleString()} members</span>
          </div>
          <div style={{
            height: 12, borderRadius: 6,
            background: "rgba(255,255,255,0.06)", border: `1px solid ${C.glassBorder}`,
            overflow: "hidden", position: "relative",
          }}>
            <div style={{
              width: `${(r.clv_avg / max) * 100}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${C.gold}, ${C.goldLight})`,
            }} />
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
            Avg churn risk: <b style={{ color: r.churn_avg > 50 ? C.neg : r.churn_avg > 30 ? C.mix : C.pos }}>{r.churn_avg}%</b>
          </div>
        </div>
      ))}
    </div>
  );
}

function RiskDonut({ by_risk }) {
  const total = (by_risk?.low || 0) + (by_risk?.medium || 0) + (by_risk?.high || 0);
  if (!total) return <div style={{ color: C.textMuted }}>No risk data.</div>;
  return (
    <div>
      {RISK_ORDER.map((r) => {
        const c = by_risk[r] || 0;
        const pct = total ? (c * 100 / total) : 0;
        return (
          <div key={r} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: riskColor(r), fontWeight: 700, fontSize: 13 }}>
                ● {RISK_LABEL[r]} risk
              </span>
              <span style={{ color: C.textMuted, fontSize: 12 }}>{c.toLocaleString()} · {pct.toFixed(1)}%</span>
            </div>
            <div style={{
              height: 10, borderRadius: 5,
              background: "rgba(255,255,255,0.06)", overflow: "hidden",
              border: `1px solid ${riskColor(r)}33`,
            }}>
              <div style={{ width: `${pct}%`, height: "100%", background: riskColor(r) }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CustomerRow({ row, onAction }) {
  return (
    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <td style={{ padding: "10px 8px", fontSize: 12, color: C.white }}>
        #{row.loyalty_number || row.sk_customer}
      </td>
      <td style={{ padding: "10px 8px", fontSize: 12, color: C.textMuted }}>{row.loyalty_card || "—"}</td>
      <td style={{ padding: "10px 8px", fontSize: 12, color: C.textMuted }}>{row.country || "—"}</td>
      <td style={{ padding: "10px 8px", fontSize: 13, color: C.gold, fontWeight: 600 }}>{fmtMoney(row.clv_actual)}</td>
      <td style={{ padding: "10px 8px", fontSize: 12, color: C.textMuted }}>{fmtMoney(row.clv_predicted)}</td>
      <td style={{ padding: "10px 8px" }}>
        <Pill color={riskColor(row.risk_tier)}>
          {Math.round((row.churn_proba || 0) * 100)}% · {row.risk_tier}
        </Pill>
      </td>
      <td style={{ padding: "10px 8px", fontSize: 12, color: C.text, maxWidth: 280 }}>
        {row.recommended_action}
      </td>
      <td style={{ padding: "10px 8px" }}>
        <button className="sv-btn-gold" onClick={() => onAction(row)}
          style={{ padding: "6px 14px", fontSize: 11 }}>
          Action
        </button>
      </td>
    </tr>
  );
}

function CustomerTable({ rows, onAction }) {
  if (!rows?.length) return <div style={{ color: C.textMuted, padding: 20 }}>No customers match.</div>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", color: C.text }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: `1px solid ${C.glassBorder}` }}>
            {["Member", "Card", "Country", "CLV", "Predicted", "Churn risk", "Recommended action", ""].map((h) => (
              <th key={h} style={{
                padding: "10px 8px", fontSize: 11, letterSpacing: 2,
                textTransform: "uppercase", color: C.gold,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{rows.map((r) => <CustomerRow key={r.id} row={r} onAction={onAction} />)}</tbody>
      </table>
    </div>
  );
}

function LiveScorer() {
  const [form, setForm] = useState({
    LoyaltyCard: "Nova", EnrollmentType: "Standard",
    MaritalStatus: "Married", Education: "Bachelor", Gender: "Female",
    EnrollmentYear: 2018, Salary: 75000, CLV: 8000,
    TotalFlights: 24, TotalDistance: 32000,
    PointsAcc: 12000, PointsRed: 4000, DollarCost: 300,
    ActiveMonths: 18, RedemptionRate: 0.33,
    AvgFlightsPerMonth: 1.3, RecencyMonths: 2,
  });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const num = (k, v) => update(k, v === "" ? 0 : Number(v));

  const run = async () => {
    setBusy(true); setErr("");
    try {
      setResult(await loyalty.score(form));
    } catch (e) {
      setErr(e?.response?.data?.detail || "Scoring failed");
    } finally { setBusy(false); }
  };

  const fieldStyle = {
    background: "rgba(255,255,255,0.04)",
    border: `1px solid ${C.glassBorder}`, color: C.white,
    borderRadius: 6, padding: "8px 10px", fontSize: 12,
    fontFamily: "inherit", outline: "none", width: "100%",
  };
  const labelStyle = {
    fontFamily: "'Barlow Condensed', sans-serif",
    fontSize: 10, letterSpacing: 1.5, color: C.gold,
    textTransform: "uppercase", display: "block", marginBottom: 4,
  };

  const fields = [
    ["LoyaltyCard", "select", ["Star", "Nova", "Aurora"]],
    ["EnrollmentType", "select", ["Standard", "2018 Promotion"]],
    ["MaritalStatus", "select", ["Single", "Married", "Divorced"]],
    ["Gender", "select", ["Female", "Male"]],
    ["Education", "select", ["High School or Below", "College", "Bachelor", "Master", "Doctor"]],
    ["EnrollmentYear", "number"],
    ["Salary", "number"], ["CLV", "number"],
    ["TotalFlights", "number"], ["TotalDistance", "number"],
    ["PointsAcc", "number"], ["PointsRed", "number"],
    ["DollarCost", "number"], ["ActiveMonths", "number"],
    ["RedemptionRate", "number"], ["AvgFlightsPerMonth", "number"],
    ["RecencyMonths", "number"],
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10 }}>
        {fields.map(([k, t, opts]) => (
          <label key={k}>
            <span style={labelStyle}>{k}</span>
            {t === "select" ? (
              <select style={fieldStyle} value={form[k]}
                      onChange={(e) => update(k, e.target.value)}>
                {opts.map((o) => <option key={o} value={o} style={{ background: C.navy }}>{o}</option>)}
              </select>
            ) : (
              <input style={fieldStyle} type="number" step="any" value={form[k]}
                     onChange={(e) => num(k, e.target.value)} />
            )}
          </label>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 14, alignItems: "center" }}>
        <button className="sv-btn-gold" onClick={run} disabled={busy}
                style={{ padding: "10px 22px", fontSize: 12 }}>
          {busy ? "Scoring…" : "Score customer"}
        </button>
        {err && <span style={{ color: C.neg, fontSize: 12 }}>{err}</span>}
      </div>

      {result && (
        <div style={{ marginTop: 18, display: "flex", gap: 14, flexWrap: "wrap" }}>
          <KpiCard label="Predicted CLV" value={fmtMoney(result.clv_predicted)} accent={C.gold} />
          <KpiCard label="Churn probability" value={`${Math.round(result.churn_proba * 100)}%`}
                   sub={`Risk tier: ${result.risk_tier}`} accent={riskColor(result.risk_tier)} />
          <div style={{
            flex: "2 1 320px",
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${C.gold}55`, borderRadius: 12, padding: "18px 22px",
          }}>
            <div style={{ ...labelStyle, fontSize: 11, letterSpacing: 3 }}>Recommended action</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: C.white, fontWeight: 600 }}>
              {result.recommended_action}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoyaltyPage() {
  const [stats, setStats] = useState(null);
  const [atRisk, setAtRisk] = useState([]);
  const [topClv, setTopClv] = useState([]);
  const [filter, setFilter] = useState({ risk: "high", card: "", sort: "churn" });
  const [filtered, setFiltered] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);

  const loadStatic = async () => {
    setLoading(true);
    try {
      const [s, ar, tc] = await Promise.all([
        loyalty.stats(),
        loyalty.atRisk(12),
        loyalty.topClv(12),
      ]);
      setStats(s); setAtRisk(ar.items || []); setTopClv(tc.items || []);
      setErr("");
    } catch {
      setErr("Backend unreachable, or run: python ML/export_loyalty_models.py + import script.");
    } finally {
      setLoading(false);
    }
  };

  const loadFiltered = async () => {
    setFilterLoading(true);
    try {
      const r = await loyalty.customers({
        limit: 50,
        risk: filter.risk || undefined,
        card: filter.card || undefined,
        sort: filter.sort,
      });
      setFiltered(r.items || []);
    } catch { /* keep silent — banner already shown */ }
    finally { setFilterLoading(false); }
  };

  useEffect(() => { loadStatic(); }, []);
  useEffect(() => { loadFiltered(); }, [filter.risk, filter.card, filter.sort]);

  if (loading && !stats && !err) {
    return <FullPageLoader label="Loading loyalty intelligence…" />;
  }

  const onAction = async (row) => {
    alert(`Action queued for member #${row.loyalty_number}:\n\n${row.recommended_action}`);
  };

  return (
    <div style={{ minHeight: "100vh", padding: "120px 32px 80px", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 12, letterSpacing: 4, color: C.gold, textTransform: "uppercase",
      }}>Manager · Loyalty intelligence</div>
      <h1 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "clamp(34px,5vw,52px)", color: C.white, fontWeight: 600,
        margin: "8px 0 4px",
      }}>CLV & Churn Cockpit</h1>
      <div style={{ color: C.textMuted, fontSize: 14, maxWidth: 760 }}>
        Customer lifetime value and churn risk for every loyalty member —
        powered by the XGBoost + Gradient Boosting models trained on the data warehouse.
      </div>

      {err && (
        <div style={{
          marginTop: 18, padding: "10px 14px", background: `${C.neg}22`,
          border: `1px solid ${C.neg}55`, borderRadius: 8, color: C.neg, fontSize: 13,
        }}>{err}</div>
      )}

      <div style={{ marginTop: 24, display: "flex", gap: 16, flexWrap: "wrap" }}>
        <KpiCard label="Members" value={stats?.total?.toLocaleString() || "—"}
                 sub="Active loyalty base" accent={C.gold} />
        <KpiCard label="Total CLV" value={fmtMoney(stats?.clv_total)}
                 sub={`Avg ${fmtMoney(stats?.clv_avg)} per member`} accent={C.pos} />
        <KpiCard label="Avg churn risk" value={`${stats?.churn_avg ?? "—"}%`}
                 sub={`Historical churn: ${stats?.churn_rate ?? "—"}%`} accent={C.neg} />
        <KpiCard label="Retention rate" value={`${stats?.retention_rate ?? "—"}%`}
                 sub="Target: ≥ 40%" accent={C.purple} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24, marginTop: 32 }}>
        <div>
          <SectionTitle tag="Value" title="Average CLV by loyalty card" />
          <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: 20 }}>
            <CardClvBar rows={stats?.by_card || []} />
          </div>
        </div>
        <div>
          <SectionTitle tag="Risk" title="Churn risk distribution" />
          <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: 20 }}>
            <RiskDonut by_risk={stats?.by_risk || {}} />
          </div>
        </div>
      </div>

      <SectionTitle tag="Priority" title="At-risk members to retain" />
      <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: 14 }}>
        <CustomerTable rows={atRisk} onAction={onAction} />
      </div>

      <SectionTitle tag="VIP" title="Top customers by lifetime value" />
      <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: 14 }}>
        <CustomerTable rows={topClv} onAction={onAction} />
      </div>

      <SectionTitle tag="Explore" title="All customers — filterable" />
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {["", "high", "medium", "low"].map((r) => (
          <button key={r || "all"}
            onClick={() => setFilter((f) => ({ ...f, risk: r }))}
            style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer",
              background: filter.risk === r ? (r ? riskColor(r) : C.gold) : "transparent",
              color: filter.risk === r ? C.navy : C.text,
              border: `1px solid ${filter.risk === r ? (r ? riskColor(r) : C.gold) : C.glassBorder}`,
            }}>
            {r ? `${RISK_LABEL[r]} risk` : "All risks"}
          </button>
        ))}
        <select value={filter.card}
                onChange={(e) => setFilter((f) => ({ ...f, card: e.target.value }))}
                style={{
                  background: "rgba(255,255,255,0.04)", color: C.white,
                  border: `1px solid ${C.glassBorder}`, borderRadius: 20,
                  padding: "6px 14px", fontSize: 12,
                }}>
          <option value="" style={{ background: C.navy }}>All cards</option>
          {(stats?.by_card || []).map((c) => (
            <option key={c.card} value={c.card} style={{ background: C.navy }}>{c.card}</option>
          ))}
        </select>
        <select value={filter.sort}
                onChange={(e) => setFilter((f) => ({ ...f, sort: e.target.value }))}
                style={{
                  background: "rgba(255,255,255,0.04)", color: C.white,
                  border: `1px solid ${C.glassBorder}`, borderRadius: 20,
                  padding: "6px 14px", fontSize: 12,
                }}>
          <option value="churn" style={{ background: C.navy }}>Sort: churn risk ↓</option>
          <option value="clv" style={{ background: C.navy }}>Sort: CLV ↓</option>
          <option value="clv_pred" style={{ background: C.navy }}>Sort: predicted CLV ↓</option>
        </select>
        {filterLoading && <UpdatingPill />}
      </div>
      <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: 14 }}>
        <CustomerTable rows={filtered} onAction={onAction} />
      </div>

      <SectionTitle tag="Live" title="Score a custom customer profile" />
      <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${C.glassBorder}`, borderRadius: 12, padding: 20 }}>
        <LiveScorer />
      </div>
    </div>
  );
}

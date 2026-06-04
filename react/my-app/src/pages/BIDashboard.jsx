import { useState } from "react";

const C = {
  navy: "#0f2044",
  gold: "#c9a84c",
  white: "#ffffff",
  text: "#c8d6f0",
  textMuted: "#7a96c0",
  glassBorder: "rgba(255,255,255,0.15)",
};

const REPORT_URL =
  "https://app.powerbi.com/reportEmbed?reportId=2db59eb2-00b3-4dda-b4bb-b183141d4222&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730";

export default function BIDashboardPage() {
  const [loaded, setLoaded] = useState(false);

  return (
    <div style={{ minHeight: "100vh", padding: "120px 32px 80px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 12, letterSpacing: 4, color: C.gold, textTransform: "uppercase",
      }}>Admin · Business intelligence</div>
      <h1 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: "clamp(34px,5vw,52px)", color: C.white, fontWeight: 600,
        margin: "8px 0 4px",
      }}>Airline Dashboard</h1>
      <div style={{ color: C.textMuted, fontSize: 14, maxWidth: 760 }}>
        Live Power BI report aggregating satisfaction, loyalty, revenue and
        operational KPIs across the data warehouse.
      </div>

      <div style={{
        marginTop: 28,
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${C.glassBorder}`,
        borderRadius: 14,
        padding: 16,
        position: "relative",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap",
        }}>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 11, letterSpacing: 3, color: C.gold, textTransform: "uppercase",
          }}>
            Power BI · Live report
          </div>
          <a href={REPORT_URL} target="_blank" rel="noreferrer"
             className="sv-btn-outline"
             style={{ padding: "7px 16px", fontSize: 11, textDecoration: "none" }}>
            Open in new tab
          </a>
        </div>

        <div style={{
          position: "relative",
          width: "100%",
          paddingTop: "56.25%",
          borderRadius: 10,
          overflow: "hidden",
          background: "#000",
          border: `1px solid ${C.glassBorder}`,
        }}>
          {!loaded && (
            <div style={{
              position: "absolute", inset: 0, display: "flex",
              flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 14, color: C.gold,
            }}>
              <span style={{
                display: "inline-block", width: 36, height: 36, borderRadius: "50%",
                border: `2px solid ${C.gold}33`, borderTopColor: C.gold,
                animation: "spin 0.8s linear infinite",
              }} />
              <div style={{
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 12, letterSpacing: 3, textTransform: "uppercase",
              }}>
                Loading Power BI report…
              </div>
            </div>
          )}

          <iframe
            title="Airline Dashboard"
            src={REPORT_URL}
            onLoad={() => setLoaded(true)}
            allowFullScreen
            style={{
              position: "absolute", top: 0, left: 0,
              width: "100%", height: "100%", border: 0,
            }}
          />
        </div>

        <div style={{ marginTop: 10, fontSize: 11, color: C.textMuted }}>
          Sign-in to Power BI may be required the first time. Use the
          “Open in new tab” button if the embedded view is blocked by your browser.
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import VoCPage from "./VoC";
import LoyaltyPage from "./Loyalty";
import BIDashboardPage from "./BIDashboard";
import LoginPage from "./Login";
import AdminUsersPage from "./AdminUsers";
import FeedbackWidget from "../components/FeedbackWidget";
import { useAuth } from "../contexts/AuthContext";

// ─── Color Tokens ───────────────────────────────────────────────────────────
const C = {
  navy: "#0f2044",
  navyMid: "#1a3060",
  navyLight: "#7a96c0",
  gold: "#c9a84c",
  goldLight: "#e8c97a",
  goldDark: "#9b7a2f",
  white: "#ffffff",
  offWhite: "#f4f1eb",
  glass: "rgba(255,255,255,0.08)",
  glassBorder: "rgba(255,255,255,0.15)",
  text: "#c8d6f0",
  textMuted: "#7a96c0",
};

const CHAT_API_URL = "http://localhost:8000/api/travel-concierge";

// ─── Global Styles (injected once) ──────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Barlow:wght@300;400;500;600&family=Barlow+Condensed:wght@300;400;600;700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html { scroll-behavior: smooth; }

    body {
      font-family: 'Barlow', sans-serif;
      background: ${C.navy};
      color: ${C.text};
      overflow-x: hidden;
    }

    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: ${C.navyMid}; }
    ::-webkit-scrollbar-thumb { background: ${C.gold}; border-radius: 3px; }

    .sv-btn-gold {
      background: linear-gradient(135deg, ${C.gold}, ${C.goldLight});
      color: ${C.navy};
      border: none;
      padding: 13px 32px;
      font-family: 'Barlow Condensed', sans-serif;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.3s ease;
      clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
    }
    .sv-btn-gold:hover {
      background: linear-gradient(135deg, ${C.goldLight}, ${C.gold});
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(201,168,76,0.35);
    }

    .sv-btn-outline {
      background: transparent;
      color: ${C.gold};
      border: 1px solid ${C.gold};
      padding: 11px 28px;
      font-family: 'Barlow Condensed', sans-serif;
      font-weight: 600;
      font-size: 13px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .sv-btn-outline:hover {
      background: ${C.gold};
      color: ${C.navy};
    }

    .glass-card {
      background: ${C.glass};
      border: 1px solid ${C.glassBorder};
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }

    .gold-line {
      width: 60px;
      height: 2px;
      background: linear-gradient(90deg, ${C.gold}, transparent);
      margin: 12px 0 24px;
    }

    .section-tag {
      font-family: 'Barlow Condensed', sans-serif;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: ${C.gold};
    }

    .section-title {
      font-family: 'Playfair Display', serif;
      font-size: clamp(28px, 4vw, 44px);
      font-weight: 600;
      color: ${C.white};
      line-height: 1.2;
    }

    input, select, textarea {
      outline: none;
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(-5deg); }
      50% { transform: translateY(-12px) rotate(-5deg); }
    }
    @keyframes pulse-gold {
      0%, 100% { box-shadow: 0 0 0 0 rgba(201,168,76,0.4); }
      50% { box-shadow: 0 0 0 12px rgba(201,168,76,0); }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .fade-up { animation: fadeUp 0.7s ease forwards; }
    .plane-float { animation: float 4s ease-in-out infinite; }

    .nav-link {
      color: ${C.text};
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 1px;
      text-transform: uppercase;
      transition: color 0.2s;
      cursor: pointer;
    }
    .nav-link:hover { color: ${C.gold}; }

    .dest-card:hover .dest-overlay { opacity: 1; }
    .dest-card:hover img { transform: scale(1.08); }

    .offer-card:hover {
      border-color: ${C.gold};
      transform: translateY(-4px);
    }

    .chat-bubble-user {
      background: linear-gradient(135deg, ${C.gold}, ${C.goldDark});
      color: ${C.navy};
      border-radius: 18px 18px 4px 18px;
      padding: 10px 14px;
      font-size: 14px;
      max-width: 80%;
      align-self: flex-end;
    }
    .chat-bubble-ai {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      color: ${C.text};
      border-radius: 18px 18px 18px 4px;
      padding: 12px 15px;
      font-size: 14px;
      line-height: 1.6;
      max-width: 92%;
      align-self: flex-start;
      overflow-wrap: anywhere;
    }

    .accordion-item { border-bottom: 1px solid rgba(255,255,255,0.08); }
    .accordion-header {
      width: 100%; background: none; border: none; text-align: left;
      padding: 20px 0; cursor: pointer; display: flex; justify-content: space-between;
      align-items: center; color: ${C.white}; font-size: 15px; font-family: 'Barlow', sans-serif;
    }
    .tab-btn {
      padding: 10px 24px; border: 1px solid rgba(255,255,255,0.12);
      background: transparent; color: ${C.textMuted};
      font-family: 'Barlow', sans-serif; font-size: 13px;
      cursor: pointer; transition: all 0.2s; border-radius: 4px;
    }
    .tab-btn.active {
      background: ${C.gold}; color: ${C.navy};
      border-color: ${C.gold}; font-weight: 600;
    }
    .filter-chip {
      padding: 6px 16px; border: 1px solid rgba(255,255,255,0.15);
      background: transparent; color: ${C.textMuted};
      font-size: 12px; cursor: pointer; transition: all 0.2s;
      border-radius: 20px; font-family: 'Barlow', sans-serif;
      letter-spacing: 0.5px;
    }
    .filter-chip.active, .filter-chip:hover {
      border-color: ${C.gold}; color: ${C.gold};
    }
    .flight-card:hover { border-color: rgba(201,168,76,0.4); }

    .reward-tier {
      transition: transform 0.3s;
    }
    .reward-tier:hover { transform: translateY(-6px); }

    /* Mobile nav */
    @media (max-width: 768px) {
      .desktop-nav { display: none !important; }
      .mobile-menu-btn { display: flex !important; }
    }
    @media (min-width: 769px) {
      .mobile-menu-btn { display: none !important; }
      .mobile-nav-panel { display: none !important; }
    }
  `}</style>
);

// ─── SVG Icons ───────────────────────────────────────────────────────────────
const Icon = {
  plane: (sz = 20) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="currentColor"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" /></svg>,
  calendar: (sz = 16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
  users: (sz = 16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  star: (sz = 14) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>,
  check: (sz = 16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>,
  arrow: (sz = 16, dir = "right") => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: dir === "left" ? "rotate(180deg)" : dir === "up" ? "rotate(-90deg)" : "none" }}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
  chat: (sz = 20) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" /></svg>,
  shield: (sz = 18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" /></svg>,
  globe: (sz = 18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
  award: (sz = 18) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>,
  wifi: (sz = 16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="currentColor"><path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" stroke="currentColor" fill="none" strokeWidth="2" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><circle cx="12" cy="20" r="1" /></svg>,
  seat: (sz = 16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="currentColor"><path d="M5 13V4a1 1 0 0 1 2 0v7h10l1 5H5v-3zm0 5v2h14v-2H5z" /></svg>,
  mail: (sz = 16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>,
  phone: (sz = 16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.29h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.59a16 16 0 0 0 6 6l1.27-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>,
  map: (sz = 16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>,
  filter: (sz = 16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>,
  close: (sz = 16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  moon: (sz = 16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>,
  sun: (sz = 16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>,
  menu: (sz = 20) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
  user: (sz = 16) => <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
};

// ─── Data ────────────────────────────────────────────────────────────────────
const DESTINATIONS = [
  { city: "Dubai", country: "UAE", price: 649, img: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&q=80", tag: "Luxury" },
  { city: "Tokyo", country: "Japan", price: 890, img: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=600&q=80", tag: "Culture" },
  { city: "Maldives", country: "Indian Ocean", price: 1190, img: "https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=600&q=80", tag: "Paradise" },
  { city: "Paris", country: "France", price: 520, img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=600&q=80", tag: "Romance" },
  { city: "New York", country: "USA", price: 740, img: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&q=80", tag: "Iconic" },
  { city: "Santorini", country: "Greece", price: 610, img: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600&q=80", tag: "Scenic" },
];

const FLIGHTS = [
  { from: "Tunis", to: "Dubai", dep: "07:45", arr: "15:30", dur: "5h 45m", stops: 0, price: 649, class: "Economy", airline: "SkyVoyage" },
  { from: "Tunis", to: "London", dep: "10:20", arr: "14:05", dur: "3h 45m", stops: 0, price: 520, class: "Economy", airline: "SkyVoyage" },
  { from: "Tunis", to: "Tokyo", dep: "00:15", arr: "18:40", dur: "14h 25m", stops: 1, price: 890, class: "Business", airline: "SkyVoyage" },
  { from: "Tunis", to: "Paris", dep: "09:00", arr: "11:30", dur: "2h 30m", stops: 0, price: 320, class: "Economy", airline: "SkyVoyage" },
  { from: "Tunis", to: "New York", dep: "22:10", arr: "05:15+1", dur: "10h 05m", stops: 1, price: 740, class: "Premium", airline: "SkyVoyage" },
];

const TESTIMONIALS = [
  { name: "Sarah Al-Rashid", title: "Business Traveler", rating: 5, text: "SkyVoyage's business class is truly world-class. The lie-flat beds, gourmet dining, and impeccable service made my 12-hour flight feel like a luxury retreat.", avatar: "SA" },
  { name: "James Thornton", title: "Frequent Flyer", rating: 5, text: "I've flown over 200,000 miles with SkyVoyage. Their punctuality, comfort, and the Horizon Rewards program keep me coming back every time.", avatar: "JT" },
  { name: "Mei Lin Chen", title: "Honeymooner", rating: 5, text: "Our honeymoon flight to the Maldives was absolutely magical. The crew surprised us with champagne and a special dessert. Truly unforgettable!", avatar: "MC" },
];

const FAQ_ITEMS = [
  { q: "How early should I arrive at the airport?", a: "We recommend arriving at least 3 hours before international flights and 2 hours before domestic flights. This ensures sufficient time for check-in, security screening, and boarding." },
  { q: "What is the baggage allowance?", a: "Economy class allows 1 carry-on (7kg) and 1 checked bag (23kg). Business class allows 2 carry-ons (7kg each) and 2 checked bags (32kg each). First class passengers enjoy unlimited premium baggage service." },
  { q: "Can I change or cancel my booking?", a: "Yes. Flexible fare tickets allow free changes up to 24 hours before departure. Standard tickets can be changed for a fee. Cancellations follow our refund policy based on fare type and timing." },
  { q: "Do you offer special meals?", a: "We offer 17 different meal types including vegetarian, vegan, halal, kosher, gluten-free, and more. Special meals must be requested at least 48 hours before your flight." },
  { q: "What is the Horizon Rewards program?", a: "Horizon Rewards is our loyalty program where you earn miles on every SkyVoyage flight and partner purchases. Miles can be redeemed for free flights, upgrades, hotel stays, and exclusive experiences." },
];

const TEAM = [
  { name: "Captain Ahmad Khalil", role: "Chief Executive Officer", img: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&q=80" },
  { name: "Sophia Laurent", role: "Chief Experience Officer", img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&q=80" },
  { name: "Marcus Chen", role: "VP of Operations", img: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&q=80" },
  { name: "Amira Hassan", role: "Head of Customer Excellence", img: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=300&q=80" },
];
// ─── Camera Permission Popup ──────────────────────────────────────────────────
function CameraPermissionPopup({ onClose }) {
  const [status, setStatus] = useState("idle"); // idle | loading | granted | denied

  const requestCamera = async () => {
    setStatus("loading");
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      setStatus("granted");
      setTimeout(onClose, 1500);
    } catch {
      setStatus("denied");
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.3s ease",
    }}>
      <div style={{
        background: "#1a3060",
        border: "1px solid rgba(201,168,76,0.3)",
        borderRadius: 16,
        padding: "40px 36px",
        width: "min(420px, 90vw)",
        textAlign: "center",
        animation: "fadeUp 0.4s ease",
      }}>
        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "rgba(201,168,76,0.12)",
          border: "1px solid rgba(201,168,76,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 24px",
          fontSize: 32,
        }}>
          {status === "granted" ? "✅" : status === "denied" ? "🚫" : "📷"}
        </div>

        {/* Title */}
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 22, fontWeight: 700,
          color: "#ffffff", marginBottom: 10,
        }}>
          {status === "granted" ? "Access Granted"
            : status === "denied" ? "Access Denied"
              : "Camera Access"}
        </div>

        {/* Description */}
        <div style={{
          fontSize: 14, color: "#7a96c0",
          lineHeight: 1.8, marginBottom: 28,
        }}>
          {status === "granted"
            ? "Your camera is now active. Welcome aboard!"
            : status === "denied"
              ? "Camera access was denied. You can enable it in your browser settings."
              : "SkyVoyage uses your camera for passport scanning, facial check-in, and security verification."}
        </div>

        {/* Buttons */}
        {status === "idle" && (
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button className="sv-btn-outline"
              onClick={onClose}
              style={{ padding: "11px 24px", fontSize: 13 }}>
              Not Now
            </button>
            <button className="sv-btn-gold"
              onClick={requestCamera}
              style={{ padding: "11px 24px", fontSize: 13 }}>
              Allow Camera
            </button>
          </div>
        )}

        {status === "loading" && (
          <div style={{ color: "#c9a84c", fontSize: 13 }}>
            <span style={{
              display: "inline-block",
              animation: "spin 1s linear infinite",
              marginRight: 8,
            }}>⟳</span>
            Requesting access…
          </div>
        )}

        {status === "denied" && (
          <button className="sv-btn-outline" onClick={onClose}
            style={{ fontSize: 13 }}>
            Close
          </button>
        )}

        {/* Privacy note */}
        {status === "idle" && (
          <div style={{ fontSize: 11, color: "#3a4f6a", marginTop: 20 }}>
            🔒 Your camera feed is never stored or shared.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── NavBar ──────────────────────────────────────────────────────────────────
function NavBar({ page, setPage, darkMode, setDarkMode }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, isAuthenticated, isManager, isAdmin, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navBg = scrolled
    ? `rgba(10,22,40,0.97)`
    : "transparent";

  const baseItems = ["Home", "Destinations", "Book", "About", "Contact"];
  const navItems = [
    ...baseItems,
    ...(isManager ? ["Insights", "Loyalty"]   : []),
    ...(isAdmin   ? ["Dashboard", "Users"]    : []),
  ];

  const roleColor = user?.role === "admin" ? "#dc2626"
                   : user?.role === "manager" ? C.gold : "#16a34a";

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
    setPage("home");
  };

  return (
    <>
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 1000,
        background: navBg,
        borderBottom: scrolled ? `1px solid rgba(201,168,76,0.15)` : "none",
        transition: "background 0.4s, border 0.4s",
        backdropFilter: scrolled ? "blur(20px)" : "none",
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 32px", height: 72, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div onClick={() => setPage("home")} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <div style={{ color: C.gold, display: "flex" }}>{Icon.plane(28)}</div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: C.white, lineHeight: 1 }}>SkyVoyage</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, letterSpacing: 4, color: C.gold, textTransform: "uppercase" }}>Airlines</div>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 32 }}>
            {navItems.map(item => (
              <span key={item} className="nav-link"
                onClick={() => setPage(item.toLowerCase())}
                style={{ color: page === item.toLowerCase() ? C.gold : C.text }}>
                {item}
              </span>
            ))}
          </div>

          {/* Controls */}
          <div className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}>
            <button onClick={() => setDarkMode(!darkMode)}
              style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", display: "flex" }}>
              {darkMode ? Icon.sun(16) : Icon.moon(16)}
            </button>

            {!isAuthenticated && (
              <button className="sv-btn-gold" onClick={() => setPage("login")} style={{ padding: "9px 20px", fontSize: 12 }}>
                {Icon.user(14)} &nbsp;Sign In
              </button>
            )}

            {isAuthenticated && (
              <div style={{ position: "relative" }}>
                <button onClick={() => setUserMenuOpen(o => !o)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    background: "rgba(255,255,255,0.05)",
                    border: `1px solid ${roleColor}55`, borderRadius: 999,
                    padding: "6px 14px 6px 6px", cursor: "pointer",
                  }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: roleColor, color: C.navy,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: 12,
                  }}>{user.name?.[0]?.toUpperCase() || "U"}</span>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ color: C.white, fontSize: 12, lineHeight: 1.1 }}>{user.name}</div>
                    <div style={{ color: roleColor, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase" }}>{user.role}</div>
                  </div>
                </button>
                {userMenuOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 8px)", right: 0,
                    background: C.navyMid, border: `1px solid ${C.glassBorder}`,
                    borderRadius: 10, minWidth: 200, padding: 8,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 1001,
                  }}>
                    <div style={{ padding: "8px 10px", color: C.textMuted, fontSize: 11, borderBottom: `1px solid ${C.glassBorder}`, marginBottom: 4 }}>
                      {user.email || "—"}
                    </div>
                    {isAdmin && (
                      <>
                        <div onClick={() => { setPage("dashboard"); setUserMenuOpen(false); }}
                          style={{ padding: "8px 10px", color: C.text, fontSize: 13, cursor: "pointer", borderRadius: 6 }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(201,168,76,0.1)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          BI Dashboard
                        </div>
                        <div onClick={() => { setPage("users"); setUserMenuOpen(false); }}
                          style={{ padding: "8px 10px", color: C.text, fontSize: 13, cursor: "pointer", borderRadius: 6 }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(201,168,76,0.1)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          Manage users
                        </div>
                      </>
                    )}
                    {isManager && (
                      <>
                        <div onClick={() => { setPage("insights"); setUserMenuOpen(false); }}
                          style={{ padding: "8px 10px", color: C.text, fontSize: 13, cursor: "pointer", borderRadius: 6 }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(201,168,76,0.1)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          Voice of Customer
                        </div>
                        <div onClick={() => { setPage("loyalty"); setUserMenuOpen(false); }}
                          style={{ padding: "8px 10px", color: C.text, fontSize: 13, cursor: "pointer", borderRadius: 6 }}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(201,168,76,0.1)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          CLV & Churn
                        </div>
                      </>
                    )}
                    <div onClick={handleLogout}
                      style={{ padding: "8px 10px", color: "#dc2626", fontSize: 13, cursor: "pointer", borderRadius: 6 }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(220,38,38,0.1)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      Sign out
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu */}
          <button className="mobile-menu-btn" style={{ background: "none", border: "none", color: C.white, cursor: "pointer", display: "none" }}
            onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? Icon.close(22) : Icon.menu(22)}
          </button>
        </div>

        {/* Mobile Panel */}
        {mobileOpen && (
          <div className="mobile-nav-panel" style={{
            background: "rgba(10,22,40,0.98)", borderTop: `1px solid ${C.glassBorder}`,
            padding: "20px 32px", display: "flex", flexDirection: "column", gap: 20,
          }}>
            {navItems.map(item => (
              <span key={item} onClick={() => { setPage(item.toLowerCase()); setMobileOpen(false); }}
                style={{ color: page === item.toLowerCase() ? C.gold : C.text, cursor: "pointer", fontSize: 15 }}>
                {item}
              </span>
            ))}
            {!isAuthenticated ? (
              <button className="sv-btn-gold"
                onClick={() => { setPage("login"); setMobileOpen(false); }}
                style={{ width: "fit-content" }}>Sign In</button>
            ) : (
              <>
                <div style={{ color: C.textMuted, fontSize: 12 }}>
                  Signed in as <span style={{ color: roleColor }}>{user.name} · {user.role}</span>
                </div>
                <button className="sv-btn-outline"
                  onClick={handleLogout}
                  style={{ width: "fit-content" }}>Sign out</button>
              </>
            )}
          </div>
        )}
      </nav>
    </>
  );
}

// ─── Hero Section ────────────────────────────────────────────────────────────
function Hero({ setPage }) {
  const [tripType, setTripType] = useState("roundtrip");
  const [cabinClass, setCabinClass] = useState("Economy");
  const [passengers, setPassengers] = useState(1);

  return (
    <section style={{
      position: "relative", minHeight: "100vh",
      display: "flex", flexDirection: "column", justifyContent: "center",
      overflow: "hidden",
    }}>
      {/* Background */}
      <div style={{ position: "absolute", inset: 0 }}>
        <img src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=1600&q=90"
          alt="Aviation" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(10,22,40,0.92) 0%, rgba(10,22,40,0.75) 50%, rgba(10,22,40,0.85) 100%)" }} />
        {/* Gold accent line */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)` }} />
      </div>

      {/* Decorative plane silhouette */}
      <div className="plane-float" style={{
        position: "absolute", right: "8%", top: "20%", opacity: 0.06,
        color: C.white, fontSize: 280, lineHeight: 1,
      }}>
        ✈
      </div>

      <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "120px 32px 60px", width: "100%" }}>
        {/* Tagline */}
        <div style={{ animation: "fadeUp 0.6s ease 0.1s both" }}>
          <div className="section-tag" style={{ marginBottom: 16 }}>✦ Redefining the Art of Travel</div>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(42px, 7vw, 88px)",
            fontWeight: 700, lineHeight: 1.05,
            color: C.white, marginBottom: 8,
          }}>
            Where Every<br />
            <em style={{ color: C.gold, fontStyle: "italic" }}>Journey</em> Begins
          </h1>
          <div className="gold-line" />
          <p style={{ fontSize: 17, color: C.text, maxWidth: 480, lineHeight: 1.8, marginBottom: 40 }}>
            Experience unparalleled luxury at 40,000 feet. SkyVoyage connects you to over 180 destinations with elegance, comfort, and precision.
          </p>
        </div>

        {/* Search Form */}
        <div style={{ animation: "fadeUp 0.6s ease 0.3s both" }}>
          <div className="glass-card" style={{ borderRadius: 12, padding: 28, maxWidth: 900 }}>
            {/* Trip Type */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
              {["roundtrip", "oneway", "multicity"].map(t => (
                <button key={t} onClick={() => setTripType(t)}
                  className="filter-chip" style={{
                    borderColor: tripType === t ? C.gold : undefined,
                    color: tripType === t ? C.gold : undefined,
                    background: tripType === t ? "rgba(201,168,76,0.1)" : undefined,
                  }}>
                  {t === "roundtrip" ? "Round Trip" : t === "oneway" ? "One Way" : "Multi-City"}
                </button>
              ))}
            </div>

            {/* Search Fields */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
              {[
                { label: "From", placeholder: "Departure city", icon: Icon.plane(14) },
                { label: "To", placeholder: "Destination city", icon: Icon.plane(14) },
                { label: "Departure", placeholder: "Select date", icon: Icon.calendar(14) },
                ...(tripType === "roundtrip" ? [{ label: "Return", placeholder: "Select date", icon: Icon.calendar(14) }] : []),
              ].map(field => (
                <div key={field.label}>
                  <div style={{ fontSize: 10, letterSpacing: 2, color: C.gold, textTransform: "uppercase", marginBottom: 8, fontFamily: "'Barlow Condensed', sans-serif" }}>{field.label}</div>
                  <div style={{ position: "relative" }}>
                    <input type={field.label.includes("date") || field.label === "Departure" || field.label === "Return" ? "date" : "text"}
                      placeholder={field.placeholder}
                      style={{
                        width: "100%", background: "rgba(255,255,255,0.06)", border: `1px solid ${C.glassBorder}`,
                        borderRadius: 6, padding: "12px 16px", color: C.white, fontSize: 14,
                      }} />
                  </div>
                </div>
              ))}

              {/* Passengers */}
              <div>
                <div style={{ fontSize: 10, letterSpacing: 2, color: C.gold, textTransform: "uppercase", marginBottom: 8, fontFamily: "'Barlow Condensed', sans-serif" }}>Passengers</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", border: `1px solid ${C.glassBorder}`, borderRadius: 6, padding: "10px 16px" }}>
                  <button onClick={() => setPassengers(Math.max(1, passengers - 1))} style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>−</button>
                  <span style={{ flex: 1, textAlign: "center", color: C.white, fontSize: 15 }}>{passengers}</span>
                  <button onClick={() => setPassengers(Math.min(9, passengers + 1))} style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>+</button>
                </div>
              </div>

              {/* Cabin Class */}
              <div>
                <div style={{ fontSize: 10, letterSpacing: 2, color: C.gold, textTransform: "uppercase", marginBottom: 8, fontFamily: "'Barlow Condensed', sans-serif" }}>Cabin Class</div>
                <select value={cabinClass} onChange={e => setCabinClass(e.target.value)}
                  style={{ width: "100%", background: "rgba(10,22,40,0.9)", border: `1px solid ${C.glassBorder}`, borderRadius: 6, padding: "12px 16px", color: C.white, fontSize: 14, cursor: "pointer" }}>
                  {["Economy", "Premium Economy", "Business", "First Class"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <button className="sv-btn-gold" style={{ fontSize: 14, padding: "14px 40px", display: "flex", alignItems: "center", gap: 10 }}>
              {Icon.plane(16)} Search Flights
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 40, marginTop: 48, flexWrap: "wrap", animation: "fadeUp 0.6s ease 0.5s both" }}>
          {[["180+", "Destinations"], ["98%", "On-Time Rate"], ["24M+", "Happy Travelers"], ["5★", "Service Rating"]].map(([n, l]) => (
            <div key={l}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: C.gold }}>{n}</div>
              <div style={{ fontSize: 12, color: C.textMuted, letterSpacing: 1 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: 0.5 }}>
        <div style={{ width: 1, height: 40, background: `linear-gradient(${C.gold}, transparent)` }} />
        <div style={{ fontSize: 10, letterSpacing: 3, color: C.gold, textTransform: "uppercase" }}>Scroll</div>
      </div>
    </section>
  );
}

// ─── Destinations Section ────────────────────────────────────────────────────
function DestinationsSection({ setPage }) {
  return (
    <section style={{ padding: "100px 32px", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ marginBottom: 52 }}>
        <div className="section-tag">✦ Explore the World</div>
        <div className="gold-line" />
        <h2 className="section-title">Featured Destinations</h2>
        <p style={{ color: C.textMuted, marginTop: 12, fontSize: 16, maxWidth: 480 }}>
          From vibrant cityscapes to serene island paradises, discover your perfect escape.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
        {DESTINATIONS.map((dest, i) => (
          <div key={dest.city} className="dest-card" style={{
            position: "relative", borderRadius: 10, overflow: "hidden", cursor: "pointer",
            height: i === 0 || i === 3 ? 380 : 280,
            border: `1px solid ${C.glassBorder}`,
          }}>
            <img src={dest.img} alt={dest.city}
              style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease" }} />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, rgba(10,22,40,0.9) 0%, rgba(10,22,40,0.1) 60%)",
            }} />
            {/* Tag */}
            <div style={{
              position: "absolute", top: 16, left: 16,
              background: "rgba(201,168,76,0.2)", border: `1px solid ${C.gold}`,
              borderRadius: 4, padding: "3px 10px",
              fontSize: 11, fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: 2, color: C.gold, textTransform: "uppercase",
            }}>{dest.tag}</div>
            {/* Info */}
            <div className="dest-overlay" style={{
              position: "absolute", bottom: 0, left: 0, right: 0, padding: 20,
              transition: "opacity 0.3s",
            }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: C.white, fontWeight: 600 }}>{dest.city}</div>
              <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 12 }}>{dest.country}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 11, color: C.textMuted }}>from </span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: C.gold }}>${dest.price}</span>
                </div>
                <button className="sv-btn-outline" style={{ padding: "7px 18px", fontSize: 11 }} onClick={() => setPage("book")}>Explore</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 48 }}>
        <button className="sv-btn-outline" onClick={() => setPage("destinations")}>
          View All Destinations &nbsp; {Icon.arrow()}
        </button>
      </div>
    </section>
  );
}

// ─── Offers Section ──────────────────────────────────────────────────────────
function OffersSection() {
  const offers = [
    { label: "Summer Escape", title: "Maldives Getaway", disc: "30% Off", details: "Book before July 31 · Business Class", color: "#1a3a5c" },
    { label: "Weekend Deal", title: "Paris City Break", disc: "€199", details: "From Tunis · Return included", color: "#2a2040" },
    { label: "Luxury Upgrade", title: "First Class Upgrade", disc: "50% Off", details: "On selected routes · Limited seats", color: "#2a1a10" },
  ];

  return (
    <section style={{ background: C.navyMid, padding: "80px 32px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ marginBottom: 48 }}>
          <div className="section-tag">✦ Exclusive Deals</div>
          <div className="gold-line" />
          <h2 className="section-title">Special Offers</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {offers.map(o => (
            <div key={o.title} className="offer-card" style={{
              background: o.color, border: `1px solid ${C.glassBorder}`,
              borderRadius: 12, padding: 28, cursor: "pointer", transition: "all 0.3s",
              position: "relative", overflow: "hidden",
            }}>
              {/* Shimmer decoration */}
              <div style={{ position: "absolute", top: -40, right: -40, width: 120, height: 120, borderRadius: "50%", background: "rgba(201,168,76,0.08)" }} />
              <div style={{ fontSize: 11, letterSpacing: 3, color: C.gold, textTransform: "uppercase", fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 12 }}>{o.label}</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: C.white, marginBottom: 8 }}>{o.title}</div>
              <div style={{ fontSize: 36, fontWeight: 700, color: C.gold, fontFamily: "'Playfair Display', serif", marginBottom: 12 }}>{o.disc}</div>
              <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 20 }}>{o.details}</div>
              <button className="sv-btn-gold" style={{ fontSize: 12, padding: "10px 24px" }}>Book Now</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Why Choose Us ───────────────────────────────────────────────────────────
function WhyUsSection() {
  const features = [
    { icon: Icon.shield(28), title: "Safety First", desc: "Fleet maintained to the highest international aviation safety standards with 99.9% reliability." },
    { icon: Icon.seat(28), title: "Luxury Comfort", desc: "Award-winning cabin designs with lie-flat beds, gourmet meals, and personalized service." },
    { icon: Icon.wifi(28), title: "Connected Journey", desc: "High-speed Wi-Fi, live TV, and an 8,000+ title entertainment library on every flight." },
    { icon: Icon.award(28), title: "Award-Winning", desc: "Voted #1 Airline in Africa & Middle East for 5 consecutive years by Skytrax." },
    { icon: Icon.globe(28), title: "Global Network", desc: "180+ destinations across 75 countries, with seamless connections via our hub airports." },
    { icon: Icon.star(28), title: "Loyalty Rewards", desc: "Earn miles on every flight, hotel stay, and partner purchase with Horizon Rewards." },
  ];

  return (
    <section style={{ padding: "100px 32px", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
        <div>
          <div className="section-tag">✦ Why SkyVoyage</div>
          <div className="gold-line" />
          <h2 className="section-title" style={{ marginBottom: 20 }}>The Standard of<br />Excellence in Aviation</h2>
          <p style={{ color: C.textMuted, lineHeight: 1.9, fontSize: 15, marginBottom: 32 }}>
            Founded in 1987, SkyVoyage Airlines has grown from a regional carrier to a global luxury aviation brand, setting the benchmark for in-flight experience across every cabin class.
          </p>
          <div style={{ display: "flex", gap: 16 }}>
            <button className="sv-btn-gold">Our Story</button>
            <button className="sv-btn-outline">Fleet Gallery</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {features.map(f => (
            <div key={f.title} className="glass-card" style={{ borderRadius: 10, padding: 22, transition: "border-color 0.3s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.gold}
              onMouseLeave={e => e.currentTarget.style.borderColor = C.glassBorder}>
              <div style={{ color: C.gold, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, fontWeight: 600, color: C.white, marginBottom: 8, letterSpacing: 0.5 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.7 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
function Testimonials() {
  const [active, setActive] = useState(0);

  return (
    <section style={{ background: C.navyMid, padding: "80px 32px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <div className="section-tag">✦ Passenger Stories</div>
          <div className="gold-line" style={{ margin: "12px auto 0" }} />
          <h2 className="section-title" style={{ marginTop: 12 }}>What Our Travelers Say</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {TESTIMONIALS.map((t, i) => (
            <div key={t.name} onClick={() => setActive(i)} style={{
              background: active === i ? "rgba(201,168,76,0.08)" : C.glass,
              border: `1px solid ${active === i ? C.gold : C.glassBorder}`,
              borderRadius: 12, padding: 28, cursor: "pointer", transition: "all 0.3s",
            }}>
              {/* Stars */}
              <div style={{ display: "flex", gap: 3, marginBottom: 16, color: C.gold }}>
                {Array(t.rating).fill(0).map((_, j) => <span key={j}>{Icon.star()}</span>)}
              </div>
              <p style={{ fontSize: 15, color: C.text, lineHeight: 1.8, marginBottom: 24, fontStyle: "italic" }}>
                "{t.text}"
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 13, color: C.navy,
                }}>{t.avatar}</div>
                <div>
                  <div style={{ fontWeight: 600, color: C.white, fontSize: 14 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{t.title}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Rewards Section ─────────────────────────────────────────────────────────
function RewardsSection() {
  const tiers = [
    { name: "Blue", miles: "0–25K", perks: ["1 mile per $1 spent", "Priority check-in", "Lounge access 2x/yr"], color: "#1a3a6c" },
    { name: "Silver", miles: "25K–75K", perks: ["1.5 miles per $1 spent", "Priority boarding", "Lounge access 6x/yr", "Seat upgrades"], color: "#2a2a2a", featured: true },
    { name: "Gold", miles: "75K+", perks: ["2 miles per $1 spent", "Unlimited lounge", "Free upgrades", "Dedicated concierge", "Guest passes"], color: "#3a2800" },
  ];

  return (
    <section style={{ padding: "100px 32px", maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 52 }}>
        <div className="section-tag">✦ Horizon Rewards</div>
        <div className="gold-line" style={{ margin: "12px auto 0" }} />
        <h2 className="section-title" style={{ marginTop: 12 }}>Your Loyalty, Rewarded</h2>
        <p style={{ color: C.textMuted, marginTop: 12, fontSize: 15, maxWidth: 480, margin: "12px auto 0" }}>
          Every mile brings you closer to extraordinary experiences. Join 4 million Horizon members today.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24, maxWidth: 900, margin: "0 auto" }}>
        {tiers.map(tier => (
          <div key={tier.name} className="reward-tier" style={{
            background: tier.color, border: `1px solid ${tier.featured ? C.gold : C.glassBorder}`,
            borderRadius: 12, padding: 28, position: "relative",
          }}>
            {tier.featured && (
              <div style={{
                position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                background: `linear-gradient(135deg, ${C.gold}, ${C.goldLight})`,
                color: C.navy, padding: "4px 16px", borderRadius: 20,
                fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap",
              }}>Most Popular</div>
            )}
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: tier.name === "Gold" ? C.gold : C.white, marginBottom: 4 }}>{tier.name}</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 20 }}>{tier.miles} miles/year</div>
            {tier.perks.map(p => (
              <div key={p} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <span style={{ color: C.gold, marginTop: 2 }}>{Icon.check()}</span>
                <span style={{ fontSize: 14, color: C.text }}>{p}</span>
              </div>
            ))}
            <button className={tier.featured ? "sv-btn-gold" : "sv-btn-outline"} style={{ marginTop: 20, width: "100%" }}>
              Join {tier.name}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Newsletter ───────────────────────────────────────────────────────────────
function Newsletter() {
  return (
    <section style={{
      background: `linear-gradient(135deg, ${C.navyMid}, ${C.navyLight})`,
      borderTop: `1px solid ${C.glassBorder}`, borderBottom: `1px solid ${C.glassBorder}`,
      padding: "72px 32px",
    }}>
      <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        <div className="section-tag">✦ Stay Connected</div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, color: C.white, margin: "16px 0 12px" }}>
          Exclusive Offers, Just for You
        </h2>
        <p style={{ color: C.textMuted, fontSize: 15, marginBottom: 32 }}>
          Subscribe to receive personalized deals, travel inspiration, and early access to flash sales.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <input type="email" placeholder="Your email address"
            style={{
              background: "rgba(255,255,255,0.06)", border: `1px solid ${C.glassBorder}`,
              borderRadius: 6, padding: "13px 20px", color: C.white, fontSize: 14,
              flex: 1, minWidth: 220, maxWidth: 320,
            }} />
          <button className="sv-btn-gold">Subscribe {Icon.arrow()}</button>
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 14 }}>
          No spam, ever. Unsubscribe anytime. We respect your privacy.
        </div>
      </div>
    </section>
  );
}

// ─── Lightweight markdown renderer (no deps) ────────────────────────────────────
function splitTableRow(line) {
  return line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map(s => s.trim());
}

// Parse markdown text into a flat list of block descriptors.
function parseMarkdown(text) {
  const lines = String(text).split("\n");
  const blocks = [];
  let list = null;
  const flush = () => { if (list) { blocks.push(list); list = null; } };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx].trimEnd();

    // fenced code block ```
    const fence = line.match(/^\s*```/);
    if (fence) {
      flush();
      const code = [];
      idx++;
      while (idx < lines.length && !/^\s*```/.test(lines[idx])) { code.push(lines[idx]); idx++; }
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }

    if (!line.trim()) { flush(); continue; }

    // horizontal rule
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) { flush(); blocks.push({ type: "hr" }); continue; }

    // table: a row containing | followed by a |---|---| separator line
    if (line.includes("|") && idx + 1 < lines.length &&
        /^[\s|:-]+$/.test(lines[idx + 1]) && lines[idx + 1].includes("-") && lines[idx + 1].includes("|")) {
      flush();
      const header = splitTableRow(line);
      idx += 2;
      const rows = [];
      while (idx < lines.length && lines[idx].includes("|") && lines[idx].trim()) {
        rows.push(splitTableRow(lines[idx])); idx++;
      }
      idx--;
      blocks.push({ type: "table", header, rows });
      continue;
    }

    let m;
    if ((m = line.match(/^(#{1,4})\s+(.*)/))) {
      flush();
      blocks.push({ type: "h", level: m[1].length, text: m[2] });
    } else if ((m = line.match(/^\s*[-*]\s+(.*)/))) {
      if (!list || list.type !== "ul") { flush(); list = { type: "ul", items: [] }; }
      list.items.push(m[1]);
    } else if ((m = line.match(/^\s*\d+\.\s+(.*)/))) {
      if (!list || list.type !== "ol") { flush(); list = { type: "ol", items: [] }; }
      list.items.push(m[1]);
    } else {
      flush();
      blocks.push({ type: "p", text: line });
    }
  }
  flush();
  return blocks;
}

function renderInline(text, keyPrefix) {
  const parts = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0, m, i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2] !== undefined) parts.push(<strong key={`${keyPrefix}-b${i++}`} style={{ color: C.white, fontWeight: 700 }}>{m[2]}</strong>);
    else if (m[3] !== undefined) parts.push(<em key={`${keyPrefix}-i${i++}`}>{m[3]}</em>);
    else if (m[4] !== undefined) parts.push(<code key={`${keyPrefix}-c${i++}`} style={{ background: "rgba(201,168,76,0.15)", color: C.gold, padding: "1px 5px", borderRadius: 4, fontSize: "0.9em" }}>{m[4]}</code>);
    else if (m[5] !== undefined) parts.push(<a key={`${keyPrefix}-a${i++}`} href={m[6]} target="_blank" rel="noreferrer" style={{ color: C.gold, textDecoration: "underline" }}>{m[5]}</a>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function MarkdownMessage({ text }) {
  const blocks = parseMarkdown(text);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {blocks.map((b, i) => {
        if (b.type === "h") {
          const size = b.level <= 1 ? 16 : b.level === 2 ? 14 : 13;
          return <div key={i} style={{ fontWeight: 700, fontSize: size, color: C.gold, marginTop: i ? 4 : 0 }}>{renderInline(b.text, `h${i}`)}</div>;
        }
        if (b.type === "hr") {
          return <hr key={i} style={{ border: "none", borderTop: `1px solid ${C.glassBorder}`, margin: "4px 0", width: "100%" }} />;
        }
        if (b.type === "code") {
          return <pre key={i} style={{ margin: 0, background: "rgba(0,0,0,0.35)", border: `1px solid ${C.glassBorder}`, borderRadius: 8, padding: "10px 12px", overflowX: "auto", fontSize: 12.5, lineHeight: 1.5, color: C.text }}><code>{b.text}</code></pre>;
        }
        if (b.type === "table") {
          return (
            <div key={i} style={{ overflowX: "auto", maxWidth: "100%" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12.5 }}>
                <thead>
                  <tr>{b.header.map((h, j) => <th key={j} style={{ textAlign: "left", padding: "6px 8px", borderBottom: `1px solid ${C.gold}`, color: C.gold, whiteSpace: "nowrap" }}>{renderInline(h, `th${i}-${j}`)}</th>)}</tr>
                </thead>
                <tbody>
                  {b.rows.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci} style={{ padding: "6px 8px", borderBottom: "1px solid rgba(255,255,255,0.08)", verticalAlign: "top" }}>{renderInline(c, `td${i}-${ri}-${ci}`)}</td>)}</tr>)}
                </tbody>
              </table>
            </div>
          );
        }
        if (b.type === "ul" || b.type === "ol") {
          const Tag = b.type === "ul" ? "ul" : "ol";
          return (
            <Tag key={i} style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
              {b.items.map((it, j) => <li key={j} style={{ lineHeight: 1.55 }}>{renderInline(it, `l${i}-${j}`)}</li>)}
            </Tag>
          );
        }
        return <div key={i} style={{ lineHeight: 1.6 }}>{renderInline(b.text, `p${i}`)}</div>;
      })}
    </div>
  );
}

// ─── Print an AI response as a clean itinerary document ──────────────────────────
function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineToHtml(text) {
  let s = escapeHtml(text);
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return s;
}

function blocksToHtml(blocks) {
  return blocks.map(b => {
    if (b.type === "h") { const l = Math.min(b.level, 4); return `<h${l}>${inlineToHtml(b.text)}</h${l}>`; }
    if (b.type === "hr") return "<hr>";
    if (b.type === "code") return `<pre><code>${escapeHtml(b.text)}</code></pre>`;
    if (b.type === "ul") return `<ul>${b.items.map(it => `<li>${inlineToHtml(it)}</li>`).join("")}</ul>`;
    if (b.type === "ol") return `<ol>${b.items.map(it => `<li>${inlineToHtml(it)}</li>`).join("")}</ol>`;
    if (b.type === "table") {
      return `<table><thead><tr>${b.header.map(h => `<th>${inlineToHtml(h)}</th>`).join("")}</tr></thead>` +
        `<tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${inlineToHtml(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    }
    return `<p>${inlineToHtml(b.text)}</p>`;
  }).join("\n");
}

function printResponse(text) {
  const body = blocksToHtml(parseMarkdown(text));
  const win = window.open("", "_blank", "width=760,height=900");
  if (!win) { alert("Please allow pop-ups to print your itinerary."); return; }
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>SkyVoyage Itinerary</title>
<style>
  body{font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;max-width:720px;margin:32px auto;padding:0 24px;line-height:1.65;}
  h1,h2,h3,h4{font-family:Arial,Helvetica,sans-serif;color:#0a1628;margin:18px 0 8px;}
  h1{font-size:22px;} h2{font-size:18px;} h3{font-size:15px;} h4{font-size:13px;}
  table{border-collapse:collapse;width:100%;margin:10px 0;font-size:13px;}
  th,td{border:1px solid #ccc;padding:6px 9px;text-align:left;vertical-align:top;}
  th{background:#f2ede0;}
  code{background:#f2f2f2;padding:1px 4px;border-radius:3px;font-size:0.9em;}
  pre{background:#f6f6f6;border:1px solid #ddd;border-radius:6px;padding:10px;overflow:auto;}
  hr{border:none;border-top:1px solid #ccc;margin:14px 0;}
  a{color:#b8902f;}
  .brand{font-family:Arial;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#b8902f;border-bottom:2px solid #b8902f;padding-bottom:8px;margin-bottom:20px;}
  .foot{margin-top:28px;border-top:1px solid #ddd;padding-top:10px;font-family:Arial;font-size:11px;color:#888;}
</style></head><body>
<div class="brand">SkyVoyage &middot; AI Travel Itinerary</div>
${body}
<div class="foot">Generated by SkyVoyage Sky Assistant &middot; ${new Date().toLocaleDateString()}</div>
<script>window.onload=function(){window.focus();window.print();}</script>
</body></html>`);
  win.document.close();
}

// ─── AI Chat Widget ───────────────────────────────────────────────────────────
function AiChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([
    { role: "ai", text: "Hello! I'm Sky, your AI travel assistant. How can I help plan your perfect journey today? ✈️" }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    destination: "",
    days: 5,
    budget: "medium",
    interests: "",
  });
  const bottomRef = useRef();

  const QUICK = [
    {
      label: "Dubai · 5 days · Luxury",
      payload: {
        destination: "Dubai",
        days: 5,
        budget: "luxury",
        interests: "shopping, desert safari, fine dining, skyline views",
      },
    },
    {
      label: "Paris · 4 days · Medium",
      payload: {
        destination: "Paris",
        days: 4,
        budget: "medium",
        interests: "museums, cafes, landmarks, walking tours",
      },
    },
    {
      label: "Tokyo · 7 days · High",
      payload: {
        destination: "Tokyo",
        days: 7,
        budget: "high",
        interests: "food, tech, temples, shopping districts",
      },
    },
  ];

  const updateField = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const sendStructured = async (payload) => {
    const data = payload || form;
    const destination = data.destination.trim();
    const interests = data.interests.trim();

    if (!destination || !interests || !data.days || !data.budget) {
      setError("Please fill destination, days, budget, and interests.");
      return;
    }

    setError("");
    setLoading(true);
    const summary = `Trip request: ${data.days} days in ${destination} · Budget: ${data.budget} · Interests: ${interests}`;
    setMsgs(prev => [...prev, { role: "user", text: summary }]);

    try {
      const res = await fetch(CHAT_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          days: Number(data.days),
          budget: data.budget,
          interests,
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      const dataRes = await res.json();
      const reply = dataRes.reply || "I couldn't generate an itinerary just now. Please try again.";
      setMsgs(prev => [...prev, { role: "ai", text: reply }]);
    } catch {
      setMsgs(prev => [...prev, { role: "ai", text: "I'm having trouble connecting right now. Please try again later." }]);
    }
    setLoading(false);
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);

  return (
    <>
      {/* Float Button */}
      <button onClick={() => setOpen(!open)} style={{
        position: "fixed", bottom: 28, right: 28, zIndex: 2000,
        width: 56, height: 56, borderRadius: "50%",
        background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`,
        border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        color: C.navy, boxShadow: `0 4px 24px rgba(201,168,76,0.4)`,
        animation: "pulse-gold 2s infinite",
      }}>
        {open ? Icon.close(22) : Icon.chat(22)}
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 96, right: 28, zIndex: 2000,
          width: "min(400px, calc(100vw - 32px))",
          height: "min(600px, calc(100vh - 140px))",
          background: C.navyMid, border: `1px solid ${C.glassBorder}`,
          borderRadius: 16, display: "flex", flexDirection: "column",
          boxShadow: `0 24px 60px rgba(0,0,0,0.6)`,
          animation: "fadeUp 0.3s ease", overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            padding: "16px 20px", borderBottom: `1px solid ${C.glassBorder}`,
            background: `linear-gradient(135deg, rgba(201,168,76,0.15), transparent)`,
            borderRadius: "16px 16px 0 0", display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: "50%",
              background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`,
              display: "flex", alignItems: "center", justifyContent: "center", color: C.navy, fontSize: 18,
            }}>✈</div>
            <div>
              <div style={{ fontWeight: 600, color: C.white, fontSize: 14 }}>Sky Assistant</div>
              <div style={{ fontSize: 11, color: C.gold }}>● Online · Powered by AI</div>
            </div>
          </div>

          {/* Planner Form */}
          <div style={{
            padding: "14px 20px 16px",
            borderBottom: `1px solid ${C.glassBorder}`,
            background: "rgba(201,168,76,0.06)",
          }}>
            <div style={{ fontSize: 11, color: C.gold, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>
              Trip Planner
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input
                value={form.destination}
                onChange={e => updateField("destination", e.target.value)}
                placeholder="Destination"
                style={{
                  background: "rgba(255,255,255,0.06)", border: `1px solid ${C.glassBorder}`,
                  borderRadius: 6, padding: "9px 12px", color: C.white, fontSize: 12,
                  minWidth: 0, width: "100%", boxSizing: "border-box",
                }}
              />
              <input
                type="number"
                min={1}
                max={30}
                value={form.days}
                onChange={e => updateField("days", e.target.value)}
                placeholder="Days"
                style={{
                  background: "rgba(255,255,255,0.06)", border: `1px solid ${C.glassBorder}`,
                  borderRadius: 6, padding: "9px 12px", color: C.white, fontSize: 12,
                  minWidth: 0, width: "100%", boxSizing: "border-box",
                }}
              />
              <select
                value={form.budget}
                onChange={e => updateField("budget", e.target.value)}
                style={{
                  background: "rgba(10,22,40,0.9)", border: `1px solid ${C.glassBorder}`,
                  borderRadius: 6, padding: "9px 12px", color: C.white, fontSize: 12,
                  cursor: "pointer", minWidth: 0, width: "100%", boxSizing: "border-box",
                }}
              >
                {["low", "medium", "high", "luxury"].map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <input
                value={form.interests}
                onChange={e => updateField("interests", e.target.value)}
                placeholder="Interests (food, beaches, museums)"
                style={{
                  background: "rgba(255,255,255,0.06)", border: `1px solid ${C.glassBorder}`,
                  borderRadius: 6, padding: "9px 12px", color: C.white, fontSize: 12,
                  minWidth: 0, width: "100%", boxSizing: "border-box",
                }}
              />
            </div>
            {error && (
              <div style={{ color: C.gold, fontSize: 11, marginTop: 8 }}>{error}</div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button
                className="sv-btn-gold"
                onClick={() => sendStructured()}
                style={{ padding: "8px 18px", fontSize: 11 }}
                disabled={loading}
              >
                Generate Itinerary
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}>
                {m.role === "user" ? m.text : <MarkdownMessage text={m.text} />}
                {m.role === "ai" && i > 0 && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                    <button
                      onClick={() => printResponse(m.text)}
                      title="Print this itinerary"
                      style={{
                        display: "flex", alignItems: "center", gap: 5, fontSize: 11,
                        padding: "4px 10px", borderRadius: 12, cursor: "pointer",
                        border: `1px solid ${C.glassBorder}`, background: "rgba(201,168,76,0.10)",
                        color: C.gold,
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 6 2 18 2 18 9" />
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                        <rect x="6" y="14" width="12" height="8" />
                      </svg>
                      Print
                    </button>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="chat-bubble-ai" style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {[0, 1, 2].map(i => <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold, animation: `pulse-gold 1s ${i * 0.2}s infinite` }} />)}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick Replies */}
          <div style={{ padding: "0 12px 8px", display: "flex", gap: 6, flexWrap: "wrap" }}>
            {QUICK.map(q => (
              <button key={q.label} onClick={() => { setForm(q.payload); sendStructured(q.payload); }} style={{
                fontSize: 11, padding: "4px 10px", border: `1px solid ${C.glassBorder}`,
                background: "rgba(255,255,255,0.04)", color: C.textMuted, borderRadius: 12, cursor: "pointer",
              }}>{q.label}</button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer({ setPage }) {
  const links = {
    "Destinations": ["Europe", "Middle East", "Asia Pacific", "Americas", "Africa"],
    "Travel": ["Book a Flight", "Manage Booking", "Check-in Online", "Flight Status", "Baggage Info"],
    "Company": ["About Us", "Careers", "Press Room", "Sustainability", "Investor Relations"],
    "Support": ["Help Center", "Contact Us", "Live Chat", "Complaints", "Accessibility"],
  };

  return (
    <footer style={{ background: "#060d1a", borderTop: `1px solid rgba(201,168,76,0.12)`, padding: "60px 32px 32px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr repeat(4, 1fr)", gap: 40, marginBottom: 48 }}>
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, cursor: "pointer" }} onClick={() => setPage("home")}>
              <span style={{ color: C.gold }}>{Icon.plane(28)}</span>
              <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: C.white }}>SkyVoyage</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, letterSpacing: 4, color: C.gold, textTransform: "uppercase" }}>Airlines</div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.9, marginBottom: 20, maxWidth: 240 }}>
              Elevating travel since 1987. Connecting 180+ destinations with unparalleled luxury and care.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              {["f", "t", "in", "ig"].map(s => (
                <div key={s} style={{
                  width: 36, height: 36, borderRadius: "50%",
                  border: `1px solid ${C.glassBorder}`, display: "flex",
                  alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: C.textMuted, fontSize: 12, fontWeight: 700,
                  transition: "all 0.2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.color = C.gold; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = C.glassBorder; e.currentTarget.style.color = C.textMuted; }}>
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(links).map(([title, items]) => (
            <div key={title}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, letterSpacing: 3, color: C.gold, textTransform: "uppercase", marginBottom: 16 }}>{title}</div>
              {items.map(item => (
                <div key={item} style={{ fontSize: 13, color: C.textMuted, marginBottom: 10, cursor: "pointer", transition: "color 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.color = C.white}
                  onMouseLeave={e => e.currentTarget.style.color = C.textMuted}>
                  {item}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Contact Row */}
        <div style={{ borderTop: `1px solid rgba(255,255,255,0.06)`, paddingTop: 28, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            {[
              [Icon.phone(), "+216 71 000 000"],
              [Icon.mail(), "support@skyvoyage.aero"],
              [Icon.map(), "Tunis Carthage Airport, Tunisia"],
            ].map(([icon, text]) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 8, color: C.textMuted, fontSize: 13 }}>
                <span style={{ color: C.gold }}>{icon}</span>{text}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: C.textMuted }}>
            © 2026 SkyVoyage Airlines. All rights reserved. &nbsp;
            <span style={{ color: C.gold, cursor: "pointer" }}>Privacy</span> ·{" "}
            <span style={{ color: C.gold, cursor: "pointer" }}>Terms</span> ·{" "}
            <span style={{ color: C.gold, cursor: "pointer" }}>Cookies</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
function HomePage({ setPage }) {
  return (
    <>
      <Hero setPage={setPage} />
      <DestinationsSection setPage={setPage} />
      <OffersSection />
      <WhyUsSection />
      <Testimonials />
      <RewardsSection />
      <Newsletter />
    </>
  );
}

// ─── BOOK PAGE ────────────────────────────────────────────────────────────────
function BookPage() {
  const [stopFilter, setStopFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [priceMax, setPriceMax] = useState(1500);
  const [sortBy, setSortBy] = useState("price");
  const [selected, setSelected] = useState(null);
  const [seatSelected, setSeatSelected] = useState(null);
  const [seatClass, setSeatClass] = useState("Economy");

  const filtered = FLIGHTS.filter(f => {
    if (stopFilter === "direct" && f.stops > 0) return false;
    if (stopFilter === "1stop" && f.stops !== 1) return false;
    if (classFilter !== "all" && f.class.toLowerCase() !== classFilter) return false;
    if (f.price > priceMax) return false;
    return true;
  }).sort((a, b) => sortBy === "price" ? a.price - b.price : a.dur.localeCompare(b.dur));

  // Seat grid
  const rows = 6;
  // const rows = 6, cols = 6;
  const takenSeats = new Set(["A1", "B2", "C3", "D4", "A3", "E2", "F5", "B4"]);
  const seatLabels = ["A", "B", "C", "D", "E", "F"];

  return (
    <div style={{ paddingTop: 72, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: C.navyMid, padding: "48px 32px", borderBottom: `1px solid ${C.glassBorder}` }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div className="section-tag">✦ Flight Search</div>
          <h1 className="section-title" style={{ marginTop: 8 }}>Find Your Flight</h1>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 32px", display: "grid", gridTemplateColumns: "280px 1fr", gap: 28 }}>
        {/* Sidebar Filters */}
        <div>
          <div className="glass-card" style={{ borderRadius: 10, padding: 24, marginBottom: 20 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, letterSpacing: 2, color: C.gold, textTransform: "uppercase", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              {Icon.filter()} Filters
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Stops</div>
              {[["all", "All Flights"], ["direct", "Direct Only"], ["1stop", "1 Stop"]].map(([v, l]) => (
                <button key={v} onClick={() => setStopFilter(v)} className="filter-chip"
                  style={{ marginRight: 8, marginBottom: 8, borderColor: stopFilter === v ? C.gold : undefined, color: stopFilter === v ? C.gold : undefined }}>
                  {l}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Cabin Class</div>
              {[["all", "All"], ["economy", "Economy"], ["business", "Business"], ["premium", "Premium"]].map(([v, l]) => (
                <button key={v} onClick={() => setClassFilter(v)} className="filter-chip"
                  style={{ marginRight: 8, marginBottom: 8, borderColor: classFilter === v ? C.gold : undefined, color: classFilter === v ? C.gold : undefined }}>
                  {l}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Max Price: ${priceMax}</div>
              <input type="range" min={100} max={2000} step={50} value={priceMax}
                onChange={e => setPriceMax(+e.target.value)}
                style={{ width: "100%", accentColor: C.gold }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textMuted, marginTop: 6 }}>
                <span>$100</span><span>$2000</span>
              </div>
            </div>
          </div>

          {/* Sort */}
          <div className="glass-card" style={{ borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Sort By</div>
            {[["price", "Lowest Price"], ["dur", "Shortest Duration"]].map(([v, l]) => (
              <button key={v} onClick={() => setSortBy(v)} className="tab-btn"
                style={{ display: "block", marginBottom: 8, width: "100%" }}
                data-active={sortBy === v}>
                <span style={{ color: sortBy === v ? C.navy : C.textMuted }}>{l}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Flight List + Seat Selection */}
        <div>
          <div style={{ fontSize: 14, color: C.textMuted, marginBottom: 16 }}>{filtered.length} flights found</div>

          {filtered.map((f, i) => (
            <div key={i} className="flight-card" style={{
              background: C.glass, border: `1px solid ${selected === i ? C.gold : C.glassBorder}`,
              borderRadius: 10, padding: 24, marginBottom: 16, transition: "border-color 0.3s",
              cursor: "pointer",
            }} onClick={() => setSelected(selected === i ? null : i)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                {/* Route */}
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: C.white, fontFamily: "'Barlow Condensed', sans-serif" }}>{f.dep}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>{f.from}</div>
                  </div>
                  <div style={{ textAlign: "center", flex: 1, minWidth: 80 }}>
                    <div style={{ fontSize: 11, color: C.gold, marginBottom: 4 }}>{f.dur}</div>
                    <div style={{ position: "relative", height: 1, background: C.glassBorder }}>
                      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: C.gold }}>
                        {Icon.plane(12)}
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>
                      {f.stops === 0 ? "Direct" : `${f.stops} Stop`}
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 26, fontWeight: 700, color: C.white, fontFamily: "'Barlow Condensed', sans-serif" }}>{f.arr}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>{f.to}</div>
                  </div>
                </div>

                {/* Class + Price */}
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, background: "rgba(201,168,76,0.1)", color: C.gold, padding: "3px 10px", borderRadius: 20, marginBottom: 8, display: "inline-block" }}>{f.class}</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: C.gold, fontFamily: "'Playfair Display', serif" }}>${f.price}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>per person</div>
                  <button className="sv-btn-gold" style={{ marginTop: 12, fontSize: 12 }}>Select</button>
                </div>
              </div>

              {/* Expanded Seat Selection */}
              {selected === i && (
                <div style={{ marginTop: 24, borderTop: `1px solid ${C.glassBorder}`, paddingTop: 24 }}>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, letterSpacing: 2, color: C.gold, textTransform: "uppercase", marginBottom: 16 }}>
                    {Icon.seat()} &nbsp; Select Your Seat
                  </div>
                  {/* Class Toggle */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    {["Economy", "Business", "First"].map(c => (
                      <button key={c} className="tab-btn" data-active={seatClass === c}
                        onClick={e => { e.stopPropagation(); setSeatClass(c); }}
                        style={{ color: seatClass === c ? C.navy : C.textMuted }}>
                        {c}
                      </button>
                    ))}
                  </div>
                  {/* Seat Grid */}
                  <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 8, padding: 20, maxWidth: 340 }}>
                    <div style={{ fontSize: 12, color: C.textMuted, textAlign: "center", marginBottom: 16 }}>— Front of Cabin —</div>
                    {Array(rows).fill(0).map((_, r) => (
                      <div key={r} style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 8 }}>
                        {seatLabels.map((col, c) => {
                          const id = `${col}${r + 1}`;
                          const taken = takenSeats.has(id);
                          const isSelected = seatSelected === id;
                          return (
                            <React.Fragment key={col}>
                              {c === 3 && <div style={{ width: 16 }} />}
                              <button onClick={e => { e.stopPropagation(); if (!taken) setSeatSelected(isSelected ? null : id); }}
                                style={{
                                  width: 32, height: 32, borderRadius: "4px 4px 6px 6px",
                                  background: taken ? "rgba(255,255,255,0.05)" : isSelected ? C.gold : "rgba(255,255,255,0.12)",
                                  border: `1px solid ${taken ? "transparent" : isSelected ? C.gold : C.glassBorder}`,
                                  cursor: taken ? "not-allowed" : "pointer",
                                  fontSize: 10, color: taken ? "rgba(255,255,255,0.2)" : isSelected ? C.navy : C.textMuted,
                                  transition: "all 0.15s",
                                }}>
                                {id}
                              </button>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 16, fontSize: 11, color: C.textMuted }}>
                      {[["rgba(255,255,255,0.12)", "Available"], ["#c9a84c", "Selected"], ["rgba(255,255,255,0.05)", "Taken"]].map(([bg, label]) => (
                        <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <div style={{ width: 12, height: 12, background: bg, borderRadius: 2 }} />
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>
                  {seatSelected && (
                    <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ fontSize: 14, color: C.text }}>Seat <strong style={{ color: C.gold }}>{seatSelected}</strong> selected · {seatClass}</div>
                      <button className="sv-btn-gold" style={{ fontSize: 12 }}>Confirm & Pay ${f.price}</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── DESTINATIONS PAGE ────────────────────────────────────────────────────────
function DestinationsPage({ setPage }) {
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("All");
  const tags = ["All", "Luxury", "Culture", "Paradise", "Romance", "Iconic", "Scenic"];

  const allDests = [
    ...DESTINATIONS,
    { city: "Singapore", country: "Singapore", price: 980, img: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=600&q=80", tag: "Iconic" },
    { city: "Marrakech", country: "Morocco", price: 310, img: "https://images.unsplash.com/photo-1539650116574-75c0c6d73f6f?w=600&q=80", tag: "Culture" },
    { city: "Bali", country: "Indonesia", price: 850, img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600&q=80", tag: "Paradise" },
    { city: "Rome", country: "Italy", price: 490, img: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=600&q=80", tag: "Culture" },
  ];

  const filtered = allDests.filter(d => {
    const matchSearch = d.city.toLowerCase().includes(search.toLowerCase()) || d.country.toLowerCase().includes(search.toLowerCase());
    const matchTag = tag === "All" || d.tag === tag;
    return matchSearch && matchTag;
  });

  return (
    <div style={{ paddingTop: 72, minHeight: "100vh" }}>
      {/* Hero */}
      <div style={{ position: "relative", height: 320, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <img src="https://images.unsplash.com/photo-1488085061387-422e29b40080?w=1400&q=80" alt="Destinations"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(10,22,40,0.75)" }} />
        <div style={{ position: "relative", textAlign: "center" }}>
          <div className="section-tag">✦ 180+ Destinations</div>
          <h1 className="section-title" style={{ marginTop: 12 }}>Explore the World</h1>
          <p style={{ color: C.text, marginTop: 10, fontSize: 16 }}>Every destination, a new story waiting to be written.</p>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 32px" }}>
        {/* Search + Filter */}
        <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap", alignItems: "center" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search destinations…"
            style={{
              flex: 1, minWidth: 200, background: C.glass, border: `1px solid ${C.glassBorder}`,
              borderRadius: 6, padding: "12px 18px", color: C.white, fontSize: 14,
            }} />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {tags.map(t => (
              <button key={t} className="filter-chip" onClick={() => setTag(t)}
                style={{ borderColor: tag === t ? C.gold : undefined, color: tag === t ? C.gold : undefined, background: tag === t ? "rgba(201,168,76,0.08)" : undefined }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
          {filtered.map(dest => (
            <div key={dest.city} className="dest-card" style={{
              position: "relative", borderRadius: 10, overflow: "hidden", cursor: "pointer",
              height: 300, border: `1px solid ${C.glassBorder}`,
            }}>
              <img src={dest.img} alt={dest.city} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(10,22,40,0.9) 0%, rgba(10,22,40,0.1) 60%)" }} />
              <div style={{ position: "absolute", top: 16, left: 16, background: "rgba(201,168,76,0.2)", border: `1px solid ${C.gold}`, borderRadius: 4, padding: "3px 10px", fontSize: 10, letterSpacing: 2, color: C.gold, textTransform: "uppercase", fontFamily: "'Barlow Condensed', sans-serif" }}>{dest.tag}</div>
              <div className="dest-overlay" style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 20 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: C.white, fontWeight: 600 }}>{dest.city}</div>
                <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 12 }}>{dest.country}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div><span style={{ fontSize: 11, color: C.textMuted }}>from </span><span style={{ fontSize: 20, fontWeight: 700, color: C.gold }}>${dest.price}</span></div>
                  <button className="sv-btn-gold" style={{ fontSize: 11, padding: "7px 16px" }} onClick={() => setPage("book")}>Book Now</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: C.textMuted }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✈</div>
            No destinations found. Try a different search.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ABOUT PAGE ───────────────────────────────────────────────────────────────
function AboutPage() {
  const fleet = [
    { model: "Airbus A380", count: 24, range: "15,200 km", seats: 489, img: "https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=600&q=80" },
    { model: "Boeing 777X", count: 18, range: "13,500 km", seats: 364, img: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80" },
    { model: "Airbus A350", count: 32, range: "15,000 km", seats: 325, img: "https://images.unsplash.com/photo-1583396058841-3abe6b5ac18c?w=600&q=80" },
  ];

  const awards = [
    { title: "World's Best Airline", org: "Skytrax 2025", icon: "🏆" },
    { title: "Best Business Class", org: "Business Traveler 2024", icon: "🥇" },
    { title: "Top On-Time Performance", org: "OAG 2025", icon: "⏱" },
    { title: "Greenest Airline", org: "Aviation Sustainability Awards", icon: "🌿" },
  ];

  return (
    <div style={{ paddingTop: 72, minHeight: "100vh" }}>
      {/* Hero */}
      <div style={{ position: "relative", height: 400, display: "flex", alignItems: "center", overflow: "hidden" }}>
        <img src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1400&q=80" alt="About"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(10,22,40,0.78)" }} />
        <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 32px" }}>
          <div className="section-tag">✦ Our Story</div>
          <h1 className="section-title" style={{ marginTop: 12, maxWidth: 560 }}>
            37 Years of <em style={{ color: C.gold, fontStyle: "italic" }}>Elevating</em> the Skies
          </h1>
          <p style={{ color: C.text, fontSize: 16, maxWidth: 500, marginTop: 16, lineHeight: 1.8 }}>
            From a single route between Tunis and Paris to a global network spanning six continents, SkyVoyage has redefined what it means to fly with elegance.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 32px" }}>
        {/* Mission & Values */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, marginBottom: 80, alignItems: "center" }}>
          <div>
            <div className="section-tag">✦ Mission & Values</div>
            <div className="gold-line" />
            <h2 className="section-title" style={{ fontSize: 34, marginBottom: 20 }}>We Believe Travel<br />Should Be Beautiful</h2>
            <p style={{ color: C.textMuted, lineHeight: 1.9, fontSize: 15, marginBottom: 20 }}>
              Our mission is to connect the world with grace. Every policy, every design decision, every crew member selection is guided by one question: does this make our passenger's journey more beautiful?
            </p>
            {["Safety above all else", "Elegance in every detail", "Warmth in every interaction", "Sustainability for the future"].map(v => (
              <div key={v} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ color: C.gold }}>{Icon.check()}</span>
                <span style={{ color: C.text, fontSize: 15 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ position: "relative" }}>
            <img src="https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=600&q=80" alt="Cabin"
              style={{ width: "100%", borderRadius: 12, border: `1px solid ${C.glassBorder}` }} />
            <div style={{
              position: "absolute", bottom: -20, right: -20,
              background: `linear-gradient(135deg, ${C.gold}, ${C.goldDark})`,
              borderRadius: 10, padding: "16px 20px", textAlign: "center",
            }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, color: C.navy }}>37</div>
              <div style={{ fontSize: 12, color: C.navy, fontWeight: 600 }}>Years of Excellence</div>
            </div>
          </div>
        </div>

        {/* Team */}
        <div style={{ marginBottom: 80 }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div className="section-tag">✦ Leadership</div>
            <div className="gold-line" style={{ margin: "12px auto" }} />
            <h2 className="section-title">The People Behind SkyVoyage</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 24 }}>
            {TEAM.map(m => (
              <div key={m.name} className="glass-card" style={{ borderRadius: 12, overflow: "hidden", textAlign: "center" }}>
                <img src={m.img} alt={m.name} style={{ width: "100%", height: 220, objectFit: "cover", objectPosition: "top" }} />
                <div style={{ padding: "16px 16px 20px" }}>
                  <div style={{ fontWeight: 600, color: C.white, fontSize: 15, marginBottom: 4 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: C.gold }}>{m.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fleet */}
        <div style={{ marginBottom: 80 }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div className="section-tag">✦ Fleet</div>
            <div className="gold-line" style={{ margin: "12px auto" }} />
            <h2 className="section-title">Our Modern Fleet</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {fleet.map(f => (
              <div key={f.model} className="glass-card" style={{ borderRadius: 12, overflow: "hidden" }}>
                <img src={f.img} alt={f.model} style={{ width: "100%", height: 180, objectFit: "cover" }} />
                <div style={{ padding: 20 }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: C.white, marginBottom: 14 }}>{f.model}</div>
                  {[["Fleet size", f.count + " aircraft"], ["Range", f.range], ["Seats", f.seats]].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, paddingBottom: 8, borderBottom: `1px solid ${C.glassBorder}`, marginBottom: 8 }}>
                      <span style={{ color: C.textMuted }}>{k}</span>
                      <span style={{ color: C.white }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Awards */}
        <div>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div className="section-tag">✦ Recognition</div>
            <div className="gold-line" style={{ margin: "12px auto" }} />
            <h2 className="section-title">Awards & Certifications</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
            {awards.map(a => (
              <div key={a.title} className="glass-card" style={{ borderRadius: 10, padding: 24, textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{a.icon}</div>
                <div style={{ fontWeight: 600, color: C.white, fontSize: 15, marginBottom: 6 }}>{a.title}</div>
                <div style={{ fontSize: 12, color: C.gold }}>{a.org}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
// ─── Hidden Emotion Detector Hook ────────────────────────────────────────────
function useEmotionDetector({ onHappy }) {
  const videoRef = useRef(null);
  const popupShownRef = useRef(false);

  useEffect(() => {
    // Create hidden video element
    const video = document.createElement("video");
    video.autoplay = true;
    video.playsInline = true;
    video.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;top:-9999px;left:-9999px;";
    document.body.appendChild(video);
    videoRef.current = video;

    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => { video.srcObject = stream; })
      .catch(err => console.error("Camera error:", err));

    const interval = setInterval(async () => {
      if (!videoRef.current || popupShownRef.current) return;

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0);
      const image = canvas.toDataURL("image/jpeg");

      try {
        const res = await fetch("http://localhost:8000/tss/auth/analyze-face", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image }),
        });
        const data = await res.json();
        if (data.emotion === "happy") {
          popupShownRef.current = true;
          onHappy();
          setTimeout(() => { popupShownRef.current = false; }, 5000);
        }
      } catch (err) {
        console.error("Emotion detection error:", err);
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      const stream = video.srcObject;
      stream?.getTracks().forEach(t => t.stop());
      video.remove();
    };
  }, []);
}
// ─── CONTACT PAGE ─────────────────────────────────────────────────────────────
function ContactPage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);

  return (
    <div style={{ paddingTop: 72, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: C.navyMid, padding: "60px 32px 48px", borderBottom: `1px solid ${C.glassBorder}`, textAlign: "center" }}>
        <div className="section-tag">✦ We're Here for You</div>
        <div className="gold-line" style={{ margin: "12px auto" }} />
        <h1 className="section-title">Get in Touch</h1>
        <p style={{ color: C.textMuted, marginTop: 12, fontSize: 15 }}>24/7 support, worldwide. We're always ready to assist.</p>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "60px 32px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, marginBottom: 72 }}>
          {/* Contact Form */}
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: C.white, marginBottom: 24 }}>Send a Message</h2>
            {sent ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: C.white, marginBottom: 8 }}>Message Sent!</div>
                <div style={{ color: C.textMuted }}>Our team will respond within 2 hours.</div>
                <button className="sv-btn-gold" style={{ marginTop: 24 }} onClick={() => setSent(false)}>Send Another</button>
              </div>
            ) : (
              <>
                {[
                  { key: "name", label: "Full Name", type: "text" },
                  { key: "email", label: "Email Address", type: "email" },
                  { key: "subject", label: "Subject", type: "text" },
                ].map(field => (
                  <div key={field.key} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, letterSpacing: 2, color: C.gold, textTransform: "uppercase", fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 8 }}>{field.label}</div>
                    <input type={field.type} value={formData[field.key]}
                      onChange={e => setFormData({ ...formData, [field.key]: e.target.value })}
                      style={{ width: "100%", background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 6, padding: "12px 16px", color: C.white, fontSize: 14 }} />
                  </div>
                ))}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, letterSpacing: 2, color: C.gold, textTransform: "uppercase", fontFamily: "'Barlow Condensed', sans-serif", marginBottom: 8 }}>Message</div>
                  <textarea value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} rows={5}
                    style={{ width: "100%", background: C.glass, border: `1px solid ${C.glassBorder}`, borderRadius: 6, padding: "12px 16px", color: C.white, fontSize: 14, resize: "vertical" }} />
                </div>
                <button className="sv-btn-gold" onClick={() => setSent(true)}>Send Message {Icon.arrow()}</button>
              </>
            )}
          </div>

          {/* Contact Info */}
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: C.white, marginBottom: 24 }}>Contact Information</h2>
            {[
              { icon: Icon.phone(20), label: "Phone", value: "+216 71 000 000", sub: "Available 24/7" },
              { icon: Icon.mail(20), label: "Email", value: "support@skyvoyage.aero", sub: "Response within 2 hours" },
              { icon: Icon.map(20), label: "Address", value: "Terminal 2, Tunis Carthage Airport", sub: "Tunisia, 2035" },
            ].map(item => (
              <div key={item.label} className="glass-card" style={{ borderRadius: 10, padding: 20, marginBottom: 16, display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ color: C.gold, marginTop: 2 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: 11, color: C.textMuted, letterSpacing: 1, marginBottom: 4 }}>{item.label}</div>
                  <div style={{ color: C.white, fontWeight: 500, fontSize: 15 }}>{item.value}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{item.sub}</div>
                </div>
              </div>
            ))}

            {/* Live chat button */}
            <button className="sv-btn-gold" style={{ width: "100%", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 14 }}>
              {Icon.chat(18)} Start Live Chat
            </button>

            {/* Flight Status */}
            <div className="glass-card" style={{ borderRadius: 10, padding: 20, marginTop: 20 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, letterSpacing: 2, color: C.gold, textTransform: "uppercase", marginBottom: 12 }}>Flight Status Tracker</div>
              <input placeholder="Enter flight number e.g. SV 204"
                style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: `1px solid ${C.glassBorder}`, borderRadius: 6, padding: "11px 14px", color: C.white, fontSize: 13, marginBottom: 12 }} />
              <button className="sv-btn-gold" style={{ fontSize: 12 }}>Track Flight</button>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div className="section-tag">✦ FAQ</div>
            <div className="gold-line" style={{ margin: "12px auto" }} />
            <h2 className="section-title">Frequently Asked Questions</h2>
          </div>
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="accordion-item">
              <button className="accordion-header" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span style={{ paddingRight: 16 }}>{item.q}</span>
                <span style={{ color: C.gold, fontSize: 20, transition: "transform 0.3s", transform: openFaq === i ? "rotate(45deg)" : "none", flexShrink: 0 }}>+</span>
              </button>
              {openFaq === i && (
                <div style={{ fontSize: 14, color: C.textMuted, lineHeight: 1.9, paddingBottom: 20, animation: "fadeIn 0.3s ease" }}>{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Access Denied ───────────────────────────────────────────────────────────
function AccessDenied({ setPage, needed }) {
  return (
    <div style={{
      minHeight: "70vh", paddingTop: 160, textAlign: "center",
      display: "flex", flexDirection: "column", alignItems: "center",
    }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 48, color: C.gold }}>403</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: C.white, marginTop: 8 }}>
        Access restricted
      </div>
      <div style={{ color: C.textMuted, marginTop: 8, maxWidth: 420, fontSize: 14 }}>
        This area requires the <b style={{ color: C.gold }}>{needed}</b> role.
        Sign in with the right account to continue.
      </div>
      <button className="sv-btn-gold" onClick={() => setPage("login")}
        style={{ marginTop: 24, padding: "11px 28px" }}>
        Sign in
      </button>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function SkyVoyageApp() {
  const [page, setPage] = useState("home");
  const [showHappyPopup, setShowHappyPopup] = useState(false);

  const [darkMode, setDarkMode] = useState(true);
  const [showCamera, setShowCamera] = useState(true);
  const { isManager, isAdmin } = useAuth();
  useEmotionDetector({
    onHappy: () => {
      setShowHappyPopup(true);
      setTimeout(() => setShowHappyPopup(false), 5000);
    },
  });
  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, [page]);

  const renderPage = () => {
    switch (page) {
      case "home": return <HomePage setPage={setPage} />;
      case "book": return <BookPage />;
      case "destinations": return <DestinationsPage setPage={setPage} />;
      case "about": return <AboutPage />;
      case "contact": return <ContactPage />;
      case "login": return <LoginPage setPage={setPage} />;
      case "insights":
        return isManager ? <VoCPage /> : <AccessDenied setPage={setPage} needed="manager or admin" />;
      case "loyalty":
        return isManager ? <LoyaltyPage /> : <AccessDenied setPage={setPage} needed="manager or admin" />;
      case "dashboard":
        return isAdmin ? <BIDashboardPage /> : <AccessDenied setPage={setPage} needed="admin" />;
      case "users":
        return isAdmin ? <AdminUsersPage /> : <AccessDenied setPage={setPage} needed="admin" />;
      default: return <HomePage setPage={setPage} />;
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: darkMode ? C.navy : "#f0ede8", transition: "background 0.4s" }}>
      <GlobalStyles />
      {showCamera && <CameraPermissionPopup onClose={() => setShowCamera(false)} />} {/* 👈 ajoute ça */}

      <NavBar page={page} setPage={setPage} darkMode={darkMode} setDarkMode={setDarkMode} />
      <main>{renderPage()}</main>
      <Footer setPage={setPage} />
      <AiChat />
      <FeedbackWidget />
      {/* Happy detection popup */}
      {showHappyPopup && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(4,44,83,0.72)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "fadeIn 0.3s ease",
        }}>
          <div style={{
            background: "#0C447C",
            border: "1px solid #378ADD",
            borderRadius: 16,
            padding: "40px 36px",
            maxWidth: 360, width: "90%",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
            animation: "fadeUp 0.35s ease",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 48 }}>👋</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: "#E6F1FB" }}>
              Welcome aboard!
            </div>
            <div style={{ width: 32, height: 1, background: "#378ADD", opacity: 0.5 }} />
            <div style={{ fontSize: 14, color: "#85B7EB", lineHeight: 1.8, fontWeight: 300 }}>
              We detected your smile — great to have you with us today. Enjoy your journey! 😊
            </div>
            <button className="sv-btn-outline"
              onClick={() => setShowHappyPopup(false)}
              style={{ marginTop: 8, fontSize: 12 }}>
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

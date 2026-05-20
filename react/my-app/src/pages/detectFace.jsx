import { useEffect, useRef, useState } from "react";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=Playfair+Display:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #root {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
  .af-root {
    min-height: 100vh;
    background: #042C53;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: 'Outfit', sans-serif;
    padding: 2rem 1rem;
    position: relative;
    overflow: hidden;
  }

  .af-root::before {
    content: '';
    position: absolute;
    width: 600px; height: 600px;
    border-radius: 50%;
    background: #0C447C;
    opacity: 0.25;
    top: -180px; right: -180px;
    pointer-events: none;
  }
  .af-root::after {
    content: '';
    position: absolute;
    width: 400px; height: 400px;
    border-radius: 50%;
    background: #185FA5;
    opacity: 0.18;
    bottom: -120px; left: -120px;
    pointer-events: none;
  }

  .af-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    margin-bottom: 2rem;
    position: relative;
  }

  .af-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 4px;
  }

  .af-logo-icon {
    width: 36px; height: 36px;
    background: #378ADD;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
  }

  .af-logo-icon svg {
    width: 20px; height: 20px;
    fill: #E6F1FB;
  }

  .af-logo-name {
    font-size: 17px;
    font-weight: 600;
    color: #E6F1FB;
    letter-spacing: 0.06em;
  }

  .af-logo-name span {
    color: #85B7EB;
    font-weight: 300;
  }

  .af-tagline {
    font-size: 11px;
    font-weight: 300;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #85B7EB;
  }

  .af-card {
    background: #0C447C;
    border: 1px solid #185FA5;
    border-radius: 16px;
    padding: 2rem;
    width: 100%;
    max-width: 460px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    position: relative;
  }

  .af-card-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .af-card-title {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    font-weight: 400;
    color: #E6F1FB;
    letter-spacing: 0.02em;
  }

  .af-badge {
    display: flex;
    align-items: center;
    gap: 5px;
    background: #185FA5;
    border: 1px solid #378ADD;
    border-radius: 20px;
    padding: 4px 10px;
    font-size: 11px;
    font-weight: 400;
    color: #B5D4F4;
    letter-spacing: 0.06em;
  }

  .af-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #85B7EB;
    animation: af-blink 2s ease-in-out infinite;
  }

  @keyframes af-blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.2; }
  }

  .af-video-wrap {
    width: 100%;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #185FA5;
    position: relative;
    background: #042C53;
    aspect-ratio: 4/3;
  }

  .af-video-wrap video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .af-corner {
    position: absolute;
    width: 18px; height: 18px;
    border-color: #85B7EB;
    border-style: solid;
    opacity: 0.7;
  }
  .af-corner.tl { top: 8px;    left: 8px;    border-width: 2px 0 0 2px; border-radius: 4px 0 0 0; }
  .af-corner.tr { top: 8px;    right: 8px;   border-width: 2px 2px 0 0; border-radius: 0 4px 0 0; }
  .af-corner.bl { bottom: 8px; left: 8px;    border-width: 0 0 2px 2px; border-radius: 0 0 0 4px; }
  .af-corner.br { bottom: 8px; right: 8px;   border-width: 0 2px 2px 0; border-radius: 0 0 4px 0; }

  .af-scan {
    position: absolute;
    left: 0; right: 0;
    height: 1px;
    background: #85B7EB;
    opacity: 0.5;
    animation: af-scan 3s ease-in-out infinite;
    pointer-events: none;
  }

  @keyframes af-scan {
    0%   { top: 0%;   opacity: 0; }
    5%   { opacity: 0.5; }
    95%  { opacity: 0.5; }
    100% { top: 100%; opacity: 0; }
  }

  .af-footer-row {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 0.25rem;
    border-top: 1px solid #185FA5;
  }

  .af-footer-item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 11px;
    color: #85B7EB;
    font-weight: 300;
    letter-spacing: 0.05em;
  }

  .af-footer-item svg {
    width: 13px; height: 13px;
    stroke: #85B7EB;
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    flex-shrink: 0;
  }

  .af-bottom {
    margin-top: 1.5rem;
    font-size: 11px;
    font-weight: 300;
    color: #0C447C;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    opacity: 0.5;
  }

  /* ── Popup ── */
  .af-popup-overlay {
    position: fixed;
    inset: 0;
    background: rgba(4, 44, 83, 0.72);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999;
    animation: af-fade 0.3s ease;
  }

  @keyframes af-fade { from { opacity: 0; } to { opacity: 1; } }

  .af-popup {
    background: #0C447C;
    border: 1px solid #378ADD;
    border-radius: 16px;
    padding: 2.5rem 2.5rem 2rem;
    max-width: 360px;
    width: 90%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    animation: af-up 0.35s cubic-bezier(0.16,1,0.3,1);
  }

  @keyframes af-up {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .af-popup-icon {
    width: 56px; height: 56px;
    border-radius: 50%;
    background: #185FA5;
    border: 1px solid #378ADD;
    display: flex; align-items: center; justify-content: center;
    font-size: 26px;
  }

  .af-popup-title {
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    font-weight: 400;
    color: #E6F1FB;
    text-align: center;
  }

  .af-popup-body {
    font-size: 13px;
    font-weight: 300;
    color: #85B7EB;
    text-align: center;
    line-height: 1.7;
  }

  .af-divider {
    width: 32px; height: 1px;
    background: #378ADD;
    opacity: 0.5;
    margin: 4px 0;
  }
`;

function DetectFace() {
    const videoRef = useRef(null);
    const [popupVisible, setPopupVisible] = useState(false);

    useEffect(() => {
        startCamera();
    }, []);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera error:", err);
        }
    };

    const captureFrame = () => {
        const video = videoRef.current;
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0);
        return canvas.toDataURL("image/jpeg");
    };

    const detectEmotion = async () => {
        try {
            const image = captureFrame();
            const response = await fetch("http://localhost:8000/tss/auth/analyze-face", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image }),
            });
            const data = await response.json();
            console.log(data);
            if (data.emotion === "happy" && !popupVisible) {
                setPopupVisible(true);
                setTimeout(() => {
                    setPopupVisible(false);
                }, 5000);
            }
        } catch (err) {
            console.error("Emotion detection error:", err);
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            if (videoRef.current) {
                detectEmotion();
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [popupVisible]);

    return (
        <>
            <style>{css}</style>

            <div className="af-root">
                {/* Header */}
                <div className="af-header">
                    <div className="af-logo">
                        <div className="af-logo-icon">
                            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                            </svg>
                        </div>
                        <span className="af-logo-name">Horizon <span>Airways</span></span>
                    </div>
                    <span className="af-tagline">Passenger Biometric System</span>
                </div>

                {/* Main card */}
                <div className="af-card">
                    <div className="af-card-header">
                        <span className="af-card-title">Emotion Detection</span>
                        <span className="af-badge">
                            <span className="af-dot" />
                            Live
                        </span>
                    </div>

                    <div className="af-video-wrap">
                        <video ref={videoRef} autoPlay playsInline className="video" />
                        <div className="af-scan" />
                        <div className="af-corner tl" />
                        <div className="af-corner tr" />
                        <div className="af-corner bl" />
                        <div className="af-corner br" />
                    </div>

                    <div className="af-footer-row">
                        <span className="af-footer-item">
                            <svg viewBox="0 0 24 24"><path d="M12 2a5 5 0 1 1 0 10A5 5 0 0 1 12 2zm0 12c5.33 0 8 2.67 8 4v2H4v-2c0-1.33 2.67-4 8-4z" /></svg>
                            Face scan active
                        </span>
                        <span className="af-footer-item">
                            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            Every 3 seconds
                        </span>
                        <span className="af-footer-item">
                            <svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                            HD camera
                        </span>
                    </div>
                </div>

                <span className="af-bottom">© 2026 Horizon Airways · Secure Terminal</span>

                {/* Popup — unchanged logic, new skin */}
                {popupVisible && (
                    <div className="af-popup-overlay">
                        <div className="af-popup">
                            <div className="af-popup-icon">👋</div>
                            <p className="af-popup-title">Welcome aboard!</p>
                            <div className="af-divider" />
                            <p className="af-popup-body">
                                We detected your smile — great to have you with us today. Enjoy your flight! 😊
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

export default DetectFace;
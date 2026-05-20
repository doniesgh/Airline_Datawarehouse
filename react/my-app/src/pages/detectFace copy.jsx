import { useEffect, useRef, useState } from "react";

function DetectFace() {

  const videoRef = useRef(null);

  const [popupVisible, setPopupVisible] = useState(false);

  // ─────────────────────────────
  // Start Camera
  // ─────────────────────────────
  useEffect(() => {

    startCamera();

  }, []);

  const startCamera = async () => {

    try {

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  // ─────────────────────────────
  // Capture Image
  // ─────────────────────────────
  const captureFrame = () => {

    const video = videoRef.current;

    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    ctx.drawImage(video, 0, 0);

    return canvas.toDataURL("image/jpeg");
  };

  // ─────────────────────────────
  // Detect Emotion
  // ─────────────────────────────
  const detectEmotion = async () => {

    try {

      const image = captureFrame();

      const response = await fetch(
        "http://localhost:8000/tss/auth/analyze-face",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ image })
        }
      );

      const data = await response.json();

      console.log(data);

      // ✅ Happy detected
      if (
        data.emotion === "happy" &&
        !popupVisible
      ) {

        setPopupVisible(true);

        setTimeout(() => {
          setPopupVisible(false);
        }, 2000);
      }

    } catch (err) {

      console.error("Emotion detection error:", err);
    }
  };

  // ─────────────────────────────
  // Auto detect every 3 sec
  // ─────────────────────────────
  useEffect(() => {

    const interval = setInterval(() => {

      if (videoRef.current) {
        detectEmotion();
      }

    }, 3000);

    return () => clearInterval(interval);

  }, [popupVisible]);

  return (
    <div className="container">

      <h1>Emotion Detection</h1>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="video"
      />

      {popupVisible && (
        <div className="popup">
          👋 Hello 😊
        </div>
      )}

    </div>
  );
}

export default DetectFace;
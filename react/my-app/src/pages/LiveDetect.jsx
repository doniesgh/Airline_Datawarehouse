import React, { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import API from "../services/api";

export default function LiveDetect() {
  const webcamRef = useRef(null);
  const [status, setStatus] = useState("Waiting...");

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!webcamRef.current) return;

      const image = webcamRef.current.getScreenshot();
      if (!image) return;

      try {
        const res1 = await API.post("/auth/extract-descriptor", { image });

        const res2 = await API.post("/tss/auth/verify-face", {
          descriptor: res1.data.descriptor,
        });

        if (res2.data.authenticated) {
          setStatus("✅ " + res2.data.user.name);
        } else {
          setStatus("❌ Unknown");
        }
      } catch (err) {
        console.error(err);
      }
    }, 2000); // every 2 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2>Live Face Detection</h2>
      <Webcam ref={webcamRef} screenshotFormat="image/jpeg" />
      <h3>{status}</h3>
    </div>
  );
}